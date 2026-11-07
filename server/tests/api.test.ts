import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { closePool } from '../src/db';
import { migrate } from '../src/scripts/migrate';
import { seed } from '../src/scripts/seed';

const app = createApp();
const api = () => request(app);
const PW = 'tumbuna123';
const CARD = { method: 'card', card: { number: '4242 4242 4242 4242', exp: '12/30', cvc: '123', name: 'Test Buyer' } } as const;
const ADDRESS = { name: 'Kila Morea', phone: '+675 7000 0001', line1: 'Section 12, Lot 4', city: 'Port Moresby', province: 'ncd', country: 'Papua New Guinea', postcode: '111' };
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const login = async (identifier: string, password = PW) => (await api().post('/api/v1/auth/login').send({ identifier, password }).expect(200)).body.token as string;
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
let buyer: string; let artist: string; let admin: string;

beforeAll(async () => {
  await migrate({ reset: true, schema: 'tumbuna_test', quiet: true });
  await seed({ schema: 'tumbuna_test', quiet: true });
  [buyer, artist, admin] = await Promise.all([login('kila@example.com'), login('joseph@example.com'), login('admin@example.com')]);
});
afterAll(closePool);

describe('health & reference data', () => {
  it('reports the database is up', async () => {
    expect((await api().get('/health').expect(200)).body).toEqual({ status: 'ok', db: 'up' });
  });
  it('serves provinces, categories, materials and techniques', async () => {
    const { body } = await api().get('/api/v1/meta').expect(200);
    expect(body.provinces).toHaveLength(22);
    expect(body.categories.length).toBeGreaterThan(5);
    expect(body.techniques[0].steps.length).toBeGreaterThan(0);
  });
  it('serves stories', async () => {
    const { body } = await api().get('/api/v1/stories/bilum-a-mothers-carry').expect(200);
    expect(body.chapters[0].title).toBe('One string');
  });
  it('returns 404 JSON for unknown endpoints', async () => {
    expect((await api().get('/api/v1/nope').expect(404)).body.error.code).toBe('not_found');
  });
});

describe('auth', () => {
  it('rejects short passwords with a field message', async () => {
    const { body } = await api().post('/api/v1/auth/register').send({ name: 'New Buyer', identifier: 'new@example.com', password: 'short', role: 'buyer' }).expect(400);
    expect(body.error.fields.password).toMatch(/8 characters/);
  });
  it('registers by phone and logs in with the same number formatted differently', async () => {
    const reg = await api().post('/api/v1/auth/register').send({ name: 'Phone User', identifier: '+675 7123 4567', password: 'longenough1', role: 'buyer', country: 'Papua New Guinea' }).expect(201);
    expect(reg.body.user.phone).toBe('+67571234567');
    await api().post('/api/v1/auth/login').send({ identifier: '+67571234567', password: 'longenough1' }).expect(200);
  });
  it('blocks duplicate accounts', async () => {
    await api().post('/api/v1/auth/register').send({ name: 'Dup', identifier: 'kila@example.com', password: 'longenough1', role: 'buyer' }).expect(409);
  });
  it('rejects a wrong password without saying which part was wrong', async () => {
    const { body } = await api().post('/api/v1/auth/login').send({ identifier: 'kila@example.com', password: 'nope-nope' }).expect(401);
    expect(body.error.message).toMatch(/do not match/);
  });
  it('returns the session with the artist profile for artists', async () => {
    const { body } = await api().get('/api/v1/me').set(auth(artist)).expect(200);
    expect(body.user.email).toBe('joseph@example.com');
    expect(body.artist.id).toBe('a1');
  });
  it('requires a token and rejects a bad one', async () => {
    await api().get('/api/v1/me').expect(401);
    await api().get('/api/v1/me').set(auth('garbage')).expect(401);
  });
  it('resets a password with an emailed code', async () => {
    await api().post('/api/v1/auth/register').send({ name: 'Forgetful', identifier: 'forget@example.com', password: 'original-pw', role: 'buyer' }).expect(201);
    const { body } = await api().post('/api/v1/auth/reset/request').send({ identifier: 'forget@example.com' }).expect(200);
    expect(body.devCode).toMatch(/^\d{6}$/);
    await api().post('/api/v1/auth/reset/confirm').send({ identifier: 'forget@example.com', code: '000000', password: 'brand-new-pw' }).expect(400);
    await api().post('/api/v1/auth/reset/confirm').send({ identifier: 'forget@example.com', code: body.devCode, password: 'brand-new-pw' }).expect(200);
    await api().post('/api/v1/auth/login').send({ identifier: 'forget@example.com', password: 'brand-new-pw' }).expect(200);
    await api().post('/api/v1/auth/reset/confirm').send({ identifier: 'forget@example.com', code: body.devCode, password: 'again-new-pw' }).expect(400);
  });
  it('does not reveal whether an account exists on reset', async () => {
    const { body } = await api().post('/api/v1/auth/reset/request').send({ identifier: 'nobody@example.com' }).expect(200);
    expect(body).toEqual({ ok: true, expiresInMinutes: 15 });
  });
});

describe('catalogue', () => {
  it('lists live artworks in the app\'s shape', async () => {
    const { body } = await api().get('/api/v1/artworks?limit=5').expect(200);
    expect(body.items).toHaveLength(5);
    const w = body.items[0];
    expect(w).toMatchObject({ status: 'live', certificateSerial: expect.stringMatching(/^TA-COA-/) });
    expect(Array.isArray(w.materials)).toBe(true);
    expect(body.total).toBeGreaterThan(5);
  });
  it('filters by category and price, and sorts by price', async () => {
    const { body } = await api().get('/api/v1/artworks?category=bilums&max=200&sort=priceAsc').expect(200);
    expect(body.items.map((w: { id: string }) => w.id)).toEqual(['w21', 'w2']);
  });
  it('filters by material and verified artists', async () => {
    const { body } = await api().get('/api/v1/artworks?material=shell&verified=1').expect(200);
    expect(body.items.every((w: { materials: string[] }) => w.materials.includes('shell'))).toBe(true);
  });
  it('searches across province names and artists', async () => {
    const { body } = await api().get('/api/v1/search?q=Bougainville').expect(200);
    expect(body.works.map((w: { id: string }) => w.id)).toContain('w5');
    expect(body.artists.map((a: { id: string }) => a.id)).toContain('a5');
    expect(body.stories.map((s: { slug: string }) => s.slug)).toContain('baskets-that-hold-water');
  });
  it('shows artist details with rating and stats', async () => {
    const { body } = await api().get('/api/v1/artists/a1').expect(200);
    expect(body.rating.count).toBe(2);
    expect(body.stats.sold).toBe(2);
  });
  it('counts views', async () => {
    const before = (await api().get('/api/v1/artworks/w3').expect(200)).body.views;
    await api().post('/api/v1/artworks/w3/view').expect(204);
    expect((await api().get('/api/v1/artworks/w3').expect(200)).body.views).toBe(before + 1);
  });
});

describe('wishlist & following', () => {
  it('adds, lists and removes', async () => {
    await api().put('/api/v1/me/wishlist/w7').set(auth(buyer)).expect(204);
    await api().put('/api/v1/me/wishlist/w7').set(auth(buyer)).expect(204);
    expect((await api().get('/api/v1/me/wishlist').set(auth(buyer)).expect(200)).body.items.map((w: { id: string }) => w.id)).toEqual(['w7']);
    await api().delete('/api/v1/me/wishlist/w7').set(auth(buyer)).expect(204);
    await api().put('/api/v1/me/following/a2').set(auth(buyer)).expect(204);
    expect((await api().get('/api/v1/me/following').set(auth(buyer)).expect(200)).body.artistIds).toEqual(['a2']);
  });
  it('404s on unknown artworks', async () => {
    await api().put('/api/v1/me/wishlist/does-not-exist').set(auth(buyer)).expect(404);
  });
});

describe('checkout', () => {
  it('quotes international orders with export permit fees, one parcel per artist', async () => {
    const { body } = await api().post('/api/v1/checkout/quote').set(auth(buyer)).send({ artworkIds: ['w1', 'w10', 'w2'], country: 'Australia', shippingId: 'dhl' }).expect(200);
    expect(body).toMatchObject({ parcels: 2, subtotal: 2410, shipping: 330, permitFee: 60, total: 2800 });
  });
  it('declines a bad card with 402 and keeps the artwork available', async () => {
    const { body } = await api().post('/api/v1/orders').set(auth(buyer))
      .send({ artworkIds: ['w9'], address: ADDRESS, shippingId: 'post', payment: { ...CARD, card: { ...CARD.card, number: '4000 0000 0000 0002' } } }).expect(402);
    expect(body.error.message).toMatch(/declined/);
    expect((await api().get('/api/v1/artworks/w9')).body.status).toBe('live');
  });
  it('rejects a shipping option that does not serve the country', async () => {
    await api().post('/api/v1/orders').set(auth(buyer)).send({ artworkIds: ['w9'], address: ADDRESS, shippingId: 'dhl', payment: CARD }).expect(400);
  });
  it('stops artists buying their own work', async () => {
    await api().post('/api/v1/orders').set(auth(artist)).send({ artworkIds: ['w1'], address: ADDRESS, shippingId: 'post', payment: CARD }).expect(400);
  });
  it('sells a one-of-a-kind work to exactly one of two simultaneous buyers', async () => {
    const other = (await api().post('/api/v1/auth/register').send({ name: 'Rival Buyer', identifier: 'rival@example.com', password: 'longenough1', role: 'buyer' }).expect(201)).body.token;
    const [a, b] = await Promise.all([
      api().post('/api/v1/orders').set(auth(buyer)).send({ artworkIds: ['w13'], address: ADDRESS, shippingId: 'post', payment: CARD }),
      api().post('/api/v1/orders').set(auth(other)).send({ artworkIds: ['w13'], address: ADDRESS, shippingId: 'post', payment: CARD }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});

describe('order lifecycle: buyer ↔ artist', () => {
  let orderId: string;
  it('places an order, marks the work sold and gives the buyer the certificate', async () => {
    const { body } = await api().post('/api/v1/orders').set(auth(buyer)).send({ artworkIds: ['w10'], address: ADDRESS, shippingId: 'ems', payment: CARD }).expect(201);
    const o = body.orders[0];
    orderId = o.id;
    expect(o).toMatchObject({ status: 'placed', total: 1040, payment: 'Card •••• 4242', artistId: 'a1' });
    expect((await api().get('/api/v1/artworks/w10')).body.status).toBe('sold');
    const certs = (await api().get('/api/v1/me/certificates').set(auth(buyer)).expect(200)).body.items;
    expect(certs.map((c: { id: string }) => c.id)).toContain('w10');
  });
  it('notifies both sides', async () => {
    const b = (await api().get('/api/v1/me/notifications').set(auth(buyer)).expect(200)).body.items;
    const a = (await api().get('/api/v1/me/notifications').set(auth(artist)).expect(200)).body.items;
    expect(b.some((n: { title: string }) => n.title === 'Order confirmed')).toBe(true);
    expect(a.some((n: { title: string }) => n.title === 'New order')).toBe(true);
  });
  it('hides the order from other users', async () => {
    const other = await login('rival@example.com', 'longenough1');
    await api().get(`/api/v1/orders/${orderId}`).set(auth(other)).expect(404);
  });
  it('enforces the fulfilment sequence', async () => {
    await api().post(`/api/v1/studio/orders/${orderId}/status`).set(auth(artist)).send({ status: 'shipped', trackingNo: 'PNG12345678' }).expect(409);
    await api().post(`/api/v1/studio/orders/${orderId}/status`).set(auth(artist)).send({ status: 'packed' }).expect(200);
    await api().post(`/api/v1/studio/orders/${orderId}/status`).set(auth(artist)).send({ status: 'shipped' }).expect(400);
    const { body } = await api().post(`/api/v1/studio/orders/${orderId}/status`).set(auth(artist)).send({ status: 'shipped', trackingNo: 'PNG12345678' }).expect(200);
    expect(body).toMatchObject({ status: 'shipped', trackingNo: 'PNG12345678' });
    expect(body.events.map((e: { status: string }) => e.status)).toEqual(['placed', 'packed', 'shipped']);
  });
  it('blocks cancelling once packed', async () => {
    await api().post(`/api/v1/orders/${orderId}/cancel`).set(auth(buyer)).expect(409);
  });
  it('moves earnings from pending to available when the buyer confirms', async () => {
    const before = (await api().get('/api/v1/studio/summary').set(auth(artist)).expect(200)).body.balances;
    await api().post(`/api/v1/orders/${orderId}/confirm`).set(auth(buyer)).expect(200);
    const after = (await api().get('/api/v1/studio/summary').set(auth(artist)).expect(200)).body.balances;
    expect(after.available - before.available).toBeCloseTo(882, 2); // 980 less 10% fee
    expect(before.pending - after.pending).toBeCloseTo(882, 2);
    await api().post(`/api/v1/orders/${orderId}/confirm`).set(auth(buyer)).expect(409);
  });
  it('accepts one review per order', async () => {
    await api().post(`/api/v1/orders/${orderId}/review`).set(auth(buyer)).send({ artworkId: 'w10', rating: 5, tags: ['Well packed'], text: 'Beautiful drum.' }).expect(201);
    await api().post(`/api/v1/orders/${orderId}/review`).set(auth(buyer)).send({ artworkId: 'w10', rating: 4 }).expect(409);
    const reviews = (await api().get('/api/v1/artists/a1/reviews').expect(200)).body.items;
    expect(reviews[0]).toMatchObject({ rating: 5, userName: 'Kila, Port Moresby' });
  });
  it('lets the buyer cancel a placed order and returns the work to the shop', async () => {
    const o = (await api().post('/api/v1/orders').set(auth(buyer)).send({ artworkIds: ['w18'], address: ADDRESS, shippingId: 'post', payment: CARD }).expect(201)).body.orders[0];
    expect((await api().post(`/api/v1/orders/${o.id}/cancel`).set(auth(buyer)).expect(200)).body.status).toBe('cancelled');
    expect((await api().get('/api/v1/artworks/w18')).body).toMatchObject({ status: 'live' });
    expect((await api().get('/api/v1/artworks/w18')).body.ownerId).toBeUndefined();
  });
});

describe('studio', () => {
  let draftId: string;
  it('is closed to buyers', async () => {
    await api().get('/api/v1/studio/summary').set(auth(buyer)).expect(403);
  });
  it('saves an incomplete draft that the public cannot see', async () => {
    const { body } = await api().post('/api/v1/studio/artworks').set(auth(artist)).send({ title: 'Unfinished mask' }).expect(201);
    draftId = body.id;
    expect(body).toMatchObject({ status: 'draft', certificateSerial: expect.stringMatching(/^TA-COA-ESW-\d{4}-\d{6}$/) });
    await api().get(`/api/v1/artworks/${draftId}`).expect(404);
    await api().get(`/api/v1/artworks/${draftId}`).set(auth(artist)).expect(200);
  });
  it('validates before publishing', async () => {
    const { body } = await api().patch(`/api/v1/studio/artworks/${draftId}`).set(auth(artist)).send({ publish: true, title: 'Unfinished mask' }).expect(400);
    // Drafts are created with a default category, so price and story are what's missing.
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(['price', 'story']));
  });
  it('publishes with photos, materials and techniques', async () => {
    const { body } = await api().patch(`/api/v1/studio/artworks/${draftId}`).set(auth(artist)).send({
      publish: true, title: 'Spirit mask, small', category: 'masks', price: 450, story: 'Carved from softwood with cowrie eyes, in the style my uncles taught me.',
      images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'], materials: ['softwood', 'shell'], techniques: ['relief-carving'], weightKg: 1.2, exportPermit: true,
    }).expect(200);
    expect(body).toMatchObject({ status: 'live', price: 450, images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'], materials: ['shell', 'softwood'], pattern: 'mask' });
    await api().get(`/api/v1/artworks/${draftId}`).expect(200);
  });
  it('rejects unknown materials', async () => {
    await api().patch(`/api/v1/studio/artworks/${draftId}`).set(auth(artist)).send({ materials: ['unobtainium'] }).expect(400);
  });
  it('hides and deletes, but never deletes ordered works', async () => {
    expect((await api().patch(`/api/v1/studio/artworks/${draftId}`).set(auth(artist)).send({ status: 'hidden' }).expect(200)).body.status).toBe('hidden');
    await api().delete(`/api/v1/studio/artworks/${draftId}`).set(auth(artist)).expect(204);
    await api().delete('/api/v1/studio/artworks/w10').set(auth(artist)).expect(409);
  });
  it('cannot touch another artist\'s work', async () => {
    await api().patch('/api/v1/studio/artworks/w2').set(auth(artist)).send({ status: 'hidden' }).expect(404);
  });
  it('withdraws up to the available balance only', async () => {
    const { balances } = (await api().get('/api/v1/studio/earnings').set(auth(artist)).expect(200)).body;
    await api().post('/api/v1/studio/payouts').set(auth(artist)).send({ amount: balances.available + 1, method: 'BSP bank account' }).expect(400);
    const { body } = await api().post('/api/v1/studio/payouts').set(auth(artist)).send({ amount: 100, method: 'BSP bank account' }).expect(201);
    expect(body.balances.available).toBeCloseTo(balances.available - 100, 2);
  });
  it('updates the artist profile', async () => {
    const { body } = await api().patch('/api/v1/studio/profile').set(auth(artist)).send({ yearsPractising: 29, village: 'Kambot' }).expect(200);
    expect(body).toMatchObject({ yearsPractising: 29, village: 'Kambot' });
  });
});

describe('verification', () => {
  it('runs from application to admin approval', async () => {
    const reg = await api().post('/api/v1/auth/register').send({ name: 'Anna Wari', identifier: 'anna@example.com', password: 'longenough1', role: 'artist', province: 'manus', crafts: ['Jewellery'] }).expect(201);
    const t = reg.body.token;
    const url = 'https://example.com/x.jpg';
    await api().post('/api/v1/studio/verification').set(auth(t)).send({ idPhotoUrl: url, selfieUrl: url, referee: { name: 'Pastor John', phone: '+675 7000 1111' }, portfolio: [url, url] }).expect(400);
    await api().post('/api/v1/studio/verification').set(auth(t)).send({ idPhotoUrl: url, selfieUrl: url, referee: { name: 'Pastor John', phone: '+675 7000 1111' }, portfolio: [url, url, url] }).expect(201);
    await api().post('/api/v1/studio/verification').set(auth(t)).send({ idPhotoUrl: url, selfieUrl: url, referee: { name: 'Pastor John', phone: '+675 7000 1111' }, portfolio: [url, url, url] }).expect(409);
    await api().get('/api/v1/admin/verifications').set(auth(buyer)).expect(403);
    const pending = (await api().get('/api/v1/admin/verifications').set(auth(admin)).expect(200)).body.items;
    const req = pending.find((v: { artistName: string }) => v.artistName === 'Anna Wari');
    await api().post(`/api/v1/admin/verifications/${req.id}/decision`).set(auth(admin)).send({ approve: false }).expect(400);
    await api().post(`/api/v1/admin/verifications/${req.id}/decision`).set(auth(admin)).send({ approve: true }).expect(200);
    expect((await api().get('/api/v1/me').set(auth(t))).body.artist.verification).toBe('verified');
  });
});

describe('certificates', () => {
  it('looks up a certificate publicly, showing owner initials only', async () => {
    const serial = (await api().get('/api/v1/artworks/w10')).body.certificateSerial;
    const { body } = await api().get(`/api/v1/certificates/${serial}`).expect(200);
    expect(body).toMatchObject({ status: 'authentic', owner: 'Kila M.', artist: { id: 'a1' } });
    expect(body.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });
  it('404s on unknown or malformed serials', async () => {
    await api().get('/api/v1/certificates/TA-COA-ESW-2026-999999').expect(404);
    await api().get('/api/v1/certificates/not-a-serial').expect(404);
  });
  it('transfers ownership to another account', async () => {
    const serial = (await api().get('/api/v1/artworks/w10')).body.certificateSerial;
    await api().post(`/api/v1/certificates/${serial}/transfer`).set(auth(artist)).send({ toEmail: 'rival@example.com' }).expect(403);
    await api().post(`/api/v1/certificates/${serial}/transfer`).set(auth(buyer)).send({ toEmail: 'rival@example.com' }).expect(200);
    const { body } = await api().get(`/api/v1/certificates/${serial}`).expect(200);
    expect(body).toMatchObject({ owner: 'Rival B.', transferred: true });
  });
});

describe('uploads', () => {
  it('stores an image and serves it back', async () => {
    const { body } = await api().post('/api/v1/uploads').set(auth(buyer)).field('folder', 'reviews').attach('file', PNG_1x1, { filename: 'p.png', contentType: 'image/png' }).expect(201);
    expect(body.url).toMatch(/\/uploads\/reviews\/.+\.png$/);
    await api().get(new URL(body.url).pathname).expect(200).expect('Content-Type', /png/);
  });
  it('rejects non-images', async () => {
    await api().post('/api/v1/uploads').set(auth(buyer)).attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' }).expect(400);
  });
});

describe('account deletion', () => {
  it('deletes the user but keeps their orders for the artist', async () => {
    const t = await login('rival@example.com', 'longenough1');
    const before = (await api().get('/api/v1/studio/orders').set(auth(artist))).body.items.length;
    await api().delete('/api/v1/me').set(auth(t)).expect(204);
    await api().get('/api/v1/me').set(auth(t)).expect(401);
    expect((await api().get('/api/v1/studio/orders').set(auth(artist))).body.items.length).toBe(before);
  });
});
