import { Router } from 'express';
import { z } from 'zod';

import { me, myArtistId, requireArtist, requireAuth } from '../auth';
import { config } from '../config';
import { exec, one, query, tx } from '../db';
import { badRequest, conflict, newId, notFound, parse, toKina, toToea } from '../http';
import { fingerprint, loadArtwork, loadArtworks, newSerial } from '../services/artworks';
import { mapArtist, type ArtistRow } from '../services/mappers';
import { notify } from '../services/notify';
import { loadOrders } from './orders';

export const studioRouter = Router();
studioRouter.use(requireAuth, requireArtist);

/** Available = confirmed earnings minus payouts; pending = paid orders awaiting delivery confirmation. */
async function balances(artistId: string) {
  const r = await one<{ Released: number | null; Pending: number | null; PaidOut: number | null }>(`
    SELECT
      (SELECT SUM(SubtotalToea) FROM Orders WHERE ArtistId = @a AND Status <> 'cancelled' AND ConfirmedAt IS NOT NULL) AS Released,
      (SELECT SUM(SubtotalToea) FROM Orders WHERE ArtistId = @a AND Status <> 'cancelled' AND ConfirmedAt IS NULL) AS Pending,
      (SELECT SUM(AmountToea) FROM Payouts WHERE ArtistId = @a AND Status <> 'failed') AS PaidOut`, { a: artistId });
  const net = (toea: number | null) => Math.floor((toea ?? 0) * (1 - config.rules.commission));
  const released = net(r?.Released ?? 0);
  const pending = net(r?.Pending ?? 0);
  const paidOut = r?.PaidOut ?? 0;
  return { availableToea: Math.max(0, released - paidOut), pendingToea: pending, lifetimeToea: released + pending, paidOutToea: paidOut };
}
const kinaBalances = (b: Awaited<ReturnType<typeof balances>>) => ({ available: toKina(b.availableToea), pending: toKina(b.pendingToea), lifetime: toKina(b.lifetimeToea), paidOut: toKina(b.paidOutToea) });

studioRouter.get('/summary', async (req, res) => {
  const a = myArtistId(req);
  const [orders, works, rating, bal] = [
    await query<{ SubtotalToea: number; Status: string; CreatedAt: Date }>(`SELECT SubtotalToea, Status, CreatedAt FROM Orders WHERE ArtistId = @a AND Status <> 'cancelled'`, { a }),
    await one<{ Views: number | null; Live: number | null; Total: number }>(`SELECT SUM(Views) AS Views, SUM(CASE WHEN Status = 'live' THEN 1 ELSE 0 END) AS Live, COUNT(*) AS Total FROM Artworks WHERE ArtistId = @a`, { a }),
    await one<{ Avg: number | null; N: number }>('SELECT ROUND(AVG(Rating), 2) AS Avg, COUNT(*) AS N FROM Reviews WHERE ArtistId = @a', { a }),
    await balances(a),
  ];
  const net = (t: number) => t * (1 - config.rules.commission);
  const day = 86_400_000;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const start = today.getTime() - (6 - i) * day;
    return { date: new Date(start).toISOString().slice(0, 10), earnings: toKina(net(orders.filter((o) => +o.CreatedAt >= start && +o.CreatedAt < start + day).reduce((t, o) => t + o.SubtotalToea, 0))) };
  });
  const monthStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1);
  res.json({
    month: toKina(net(orders.filter((o) => +o.CreatedAt >= monthStart).reduce((t, o) => t + o.SubtotalToea, 0))),
    week,
    orders: orders.length,
    toShip: orders.filter((o) => o.Status === 'placed' || o.Status === 'packed').length,
    views: works?.Views ?? 0,
    liveWorks: works?.Live ?? 0,
    totalWorks: works?.Total ?? 0,
    rating: { avg: rating?.Avg ? Number(rating.Avg) : 0, count: rating?.N ?? 0 },
    balances: kinaBalances(bal),
  });
});

// ——— artworks ———

const ArtworkBody = z.object({
  title: z.string().trim().min(3, 'Give your work a title.').max(200),
  category: z.string().min(1, 'Choose a category.'),
  province: z.string().optional(),
  price: z.number().min(10, 'Set a price of at least K 10.').max(1_000_000),
  images: z.array(z.url()).max(8).default([]),
  story: z.string().trim().min(20, 'Tell buyers a little more (at least a sentence or two).').max(10_000),
  significance: z.string().trim().max(10_000).default(''),
  materials: z.array(z.string()).max(12).default([]),
  techniques: z.array(z.string()).max(8).default([]),
  dimensions: z.string().trim().max(100).default(''),
  weightKg: z.number().positive('Enter the packed weight in kg.').max(500),
  exportPermit: z.boolean().default(false),
  oneOfAKind: z.boolean().default(true),
  publish: z.boolean().default(false),
});
// Drafts may be incomplete.
const DraftBody = ArtworkBody.partial().extend({ title: z.string().trim().max(200).default(''), publish: z.literal(false).optional() });

async function writeRelations(id: string, b: { images?: string[]; materials?: string[]; techniques?: string[] }, t: Parameters<typeof exec>[2]) {
  if (b.images) {
    await exec('DELETE FROM ArtworkMedia WHERE ArtworkId = @id', { id }, t);
    for (const [i, url] of b.images.entries()) await exec('INSERT INTO ArtworkMedia (ArtworkId, Url, SortOrder) VALUES (@id, @url, @i)', { id, url, i }, t);
  }
  if (b.materials) {
    await exec('DELETE FROM ArtworkMaterials WHERE ArtworkId = @id', { id }, t);
    for (const m of new Set(b.materials)) await exec('INSERT INTO ArtworkMaterials (ArtworkId, MaterialSlug) VALUES (@id, @m)', { id, m }, t);
  }
  if (b.techniques) {
    await exec('DELETE FROM ArtworkTechniques WHERE ArtworkId = @id', { id }, t);
    for (const s of new Set(b.techniques)) await exec('INSERT INTO ArtworkTechniques (ArtworkId, TechniqueSlug) VALUES (@id, @s)', { id, s }, t);
  }
}

const parseArtwork = (body: unknown) => {
  const publish = (body as { publish?: boolean })?.publish === true;
  return publish ? parse(ArtworkBody, body) : parse(DraftBody, body);
};

studioRouter.get('/artworks', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['live', 'draft', 'sold', 'hidden']).optional() }), req.query);
  const params: Record<string, unknown> = { a: myArtistId(req), status: status ?? null };
  res.json({ items: await loadArtworks('a.ArtistId = @a AND (@status IS NULL OR a.Status = @status)', params, 'ORDER BY a.CreatedAt DESC') });
});

studioRouter.post('/artworks', async (req, res) => {
  const b = parseArtwork(req.body);
  const a = myArtistId(req);
  const artist = (await one<{ ProvinceSlug: string }>('SELECT ProvinceSlug FROM Artists WHERE Id = @a', { a }))!;
  const province = b.province ?? artist.ProvinceSlug;
  const cat = b.category ? await one<{ Pattern: string; Variant: number | null }>('SELECT Pattern, Variant FROM Categories WHERE Slug = @s', { s: b.category }) : undefined;
  if (b.category && !cat) throw badRequest('Choose a category from the list.', { category: 'Unknown category.' });
  const prov = await one<{ Code: string }>('SELECT Code FROM Provinces WHERE Slug = @s', { s: province });
  if (!prov) throw badRequest('Choose a province from the list.', { province: 'Unknown province.' });
  const id = newId('w');
  await tx(async (t) => {
    await exec(`INSERT INTO Artworks (Id, ArtistId, Title, CategorySlug, ProvinceSlug, PriceToea, Pattern, Variant, Story, Significance, Dimensions, WeightKg, ExportPermit, OneOfAKind, Status)
                VALUES (@id, @a, @title, @category, @province, @price, @pattern, @variant, @story, @sig, @dims, @weight, @permit, @unique, @status)`,
    { id, a, title: b.title ?? '', category: b.category ?? 'carvings', province, price: toToea(b.price ?? 0), pattern: cat?.Pattern ?? 'carve', variant: cat?.Variant ?? null,
      story: b.story ?? '', sig: b.significance ?? '', dims: b.dimensions ?? '', weight: b.weightKg ?? 1, permit: b.exportPermit ?? false, unique: b.oneOfAKind ?? true, status: b.publish ? 'live' : 'draft' }, t);
    await writeRelations(id, b, t);
    const serial = newSerial(prov.Code);
    await exec('INSERT INTO Certificates (Serial, ArtworkId, Fingerprint) VALUES (@serial, @id, @fp)', { serial, id, fp: fingerprint(serial, id, a) }, t);
  });
  res.status(201).json(await loadArtwork(id));
});

async function ownArtwork(id: string, artistId: string) {
  const art = await loadArtwork(id);
  if (!art || art.artistId !== artistId) throw notFound('Artwork');
  return art;
}

studioRouter.patch('/artworks/:id', async (req, res) => {
  const a = myArtistId(req);
  const art = await ownArtwork(req.params.id as string, a);
  const statusOnly = parse(z.object({ status: z.enum(['live', 'hidden', 'sold']).optional() }).loose(), req.body);
  const keys = Object.keys(req.body ?? {});
  if (keys.length === 1 && statusOnly.status) {
    if (art.status === 'sold' && statusOnly.status !== 'sold') throw conflict('Sold works can\'t be put back on sale.');
    if (statusOnly.status === 'live' && art.status === 'draft') throw badRequest('Finish and publish the draft from the editor.');
    await exec('UPDATE Artworks SET Status = @s, UpdatedAt = now() WHERE Id = @id', { s: statusOnly.status, id: art.id });
    res.json(await loadArtwork(art.id));
    return;
  }
  if (art.status === 'sold') throw conflict('Sold works can\'t be edited.');
  // Publishing or editing a live listing needs a complete artwork; drafts may stay partial.
  const publish = req.body?.publish === true || art.status === 'live';
  // Missing fields keep their current values, so a live listing can be updated partially.
  const current = { title: art.title, category: art.category, province: art.province, price: art.price, images: art.images, story: art.story, significance: art.significance,
    materials: art.materials, techniques: art.techniques, dimensions: art.dimensions, weightKg: art.weightKg, exportPermit: art.exportPermit, oneOfAKind: art.oneOfAKind };
  const b = publish ? parse(ArtworkBody, { ...current, ...req.body, publish: true }) : parse(DraftBody, req.body);
  const cat = b.category ? await one<{ Pattern: string; Variant: number | null }>('SELECT Pattern, Variant FROM Categories WHERE Slug = @s', { s: b.category }) : undefined;
  if (b.category && !cat) throw badRequest('Choose a category from the list.', { category: 'Unknown category.' });
  await tx(async (t) => {
    await exec(`UPDATE Artworks SET
        Title = COALESCE(@title, Title), CategorySlug = COALESCE(@category, CategorySlug), ProvinceSlug = COALESCE(@province, ProvinceSlug),
        PriceToea = COALESCE(@price, PriceToea), Pattern = COALESCE(@pattern, Pattern), Variant = CASE WHEN @category IS NULL THEN Variant ELSE @variant END,
        Story = COALESCE(@story, Story), Significance = COALESCE(@sig, Significance), Dimensions = COALESCE(@dims, Dimensions), WeightKg = COALESCE(@weight, WeightKg),
        ExportPermit = COALESCE(@permit, ExportPermit), OneOfAKind = COALESCE(@unique, OneOfAKind), Status = @status, UpdatedAt = now()
      WHERE Id = @id`,
    { id: art.id, title: b.title || null, category: b.category ?? null, province: b.province ?? null, price: b.price != null ? toToea(b.price) : null,
      pattern: cat?.Pattern ?? null, variant: cat?.Variant ?? null, story: b.story ?? null, sig: b.significance ?? null, dims: b.dimensions ?? null,
      weight: b.weightKg ?? null, permit: b.exportPermit ?? null, unique: b.oneOfAKind ?? null, status: publish ? (art.status === 'hidden' ? 'hidden' : 'live') : art.status }, t);
    await writeRelations(art.id, { images: req.body?.images ? b.images : undefined, materials: req.body?.materials ? b.materials : undefined, techniques: req.body?.techniques ? b.techniques : undefined }, t);
  });
  res.json(await loadArtwork(art.id));
});

studioRouter.delete('/artworks/:id', async (req, res) => {
  const art = await ownArtwork(req.params.id as string, myArtistId(req));
  const ordered = await one('SELECT 1 AS x FROM OrderItems WHERE ArtworkId = @id', { id: art.id });
  if (ordered) throw conflict('This work is part of an order, so it can\'t be deleted. Hide it instead.');
  await exec('DELETE FROM Wishlist WHERE ArtworkId = @id', { id: art.id });
  await exec('DELETE FROM Artworks WHERE Id = @id', { id: art.id });
  res.status(204).end();
});

// ——— orders ———

studioRouter.get('/orders', async (req, res) => {
  res.json({ items: await loadOrders('ArtistId = @a', { a: myArtistId(req) }) });
});

const NEXT: Record<string, string> = { placed: 'packed', packed: 'shipped', shipped: 'delivered' };

studioRouter.post('/orders/:id/status', async (req, res) => {
  const b = parse(z.object({ status: z.enum(['packed', 'shipped', 'delivered']), trackingNo: z.string().trim().min(5, 'Enter the tracking number.').max(60).optional() }), req.body);
  const [o] = await loadOrders('Id = @id AND ArtistId = @a', { id: req.params.id, a: myArtistId(req) });
  if (!o) throw notFound('Order');
  if (NEXT[o.status] !== b.status) throw conflict(`An order that is ${o.status} can't move to ${b.status}.`);
  if (b.status === 'shipped' && !b.trackingNo) throw badRequest('Enter the tracking number.', { trackingNo: 'Enter the tracking number.' });
  const note = b.status === 'packed' ? 'Artist is packing your artwork' : b.status === 'shipped' ? `Shipped with ${o.shipping.carrier}` : 'Delivered';
  await tx(async (t) => {
    const n = await exec('UPDATE Orders SET Status = @s, TrackingNo = COALESCE(@tn, TrackingNo) WHERE Id = @id AND Status = @from', { s: b.status, tn: b.trackingNo ?? null, id: o.id, from: o.status }, t);
    if (!n) throw conflict('This order changed. Refresh and try again.');
    await exec('INSERT INTO OrderEvents (OrderId, Status, Note) VALUES (@id, @s, @note)', { id: o.id, s: b.status, note }, t);
    // Sample orders have no buyer account to confirm delivery, so delivery releases payment directly.
    if (b.status === 'delivered' && o.sample) await exec('UPDATE Orders SET ConfirmedAt = now() WHERE Id = @id', { id: o.id }, t);
    if (o.buyerId !== 'sample') {
      await notify(o.buyerId, {
        kind: 'order',
        title: b.status === 'shipped' ? 'Your order has shipped' : b.status === 'delivered' ? 'Delivered: please confirm' : 'Order update',
        body: `${o.number} · ${note}`, link: `/orders/${o.id}`,
      }, t);
    }
  });
  const [updated] = await loadOrders('Id = @id', { id: o.id });
  res.json(updated);
});

// ——— earnings & payouts ———

studioRouter.get('/earnings', async (req, res) => {
  const a = myArtistId(req);
  const year = new Date().getUTCFullYear();
  const months = await query<{ M: number; Toea: number }>(
    `SELECT EXTRACT(MONTH FROM CreatedAt)::int AS M, SUM(SubtotalToea) AS Toea FROM Orders WHERE ArtistId = @a AND Status <> 'cancelled' AND EXTRACT(YEAR FROM CreatedAt) = @y GROUP BY EXTRACT(MONTH FROM CreatedAt)::int`, { a, y: year });
  const gross = (await one<{ T: number | null }>(`SELECT SUM(SubtotalToea) AS T FROM Orders WHERE ArtistId = @a AND Status <> 'cancelled'`, { a }))?.T ?? 0;
  const payouts = await query<{ Id: string; AmountToea: number; Method: string; Status: string; CreatedAt: Date }>('SELECT * FROM Payouts WHERE ArtistId = @a ORDER BY CreatedAt DESC', { a });
  res.json({
    balances: kinaBalances(await balances(a)),
    commission: config.rules.commission,
    gross: toKina(gross),
    fees: toKina(Math.round(gross * config.rules.commission)),
    byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, earnings: toKina((months.find((m) => m.M === i + 1)?.Toea ?? 0) * (1 - config.rules.commission)) })),
    payouts: payouts.map((p) => ({ id: p.Id, amount: toKina(p.AmountToea), method: p.Method, status: p.Status, at: +p.CreatedAt })),
  });
});

studioRouter.post('/payouts', async (req, res) => {
  const b = parse(z.object({ amount: z.number().positive('Enter an amount above K 0.'), method: z.string().trim().min(3).max(60) }), req.body);
  const a = myArtistId(req);
  const amountToea = toToea(b.amount);
  const id = newId('p');
  await tx(async (t) => {
    // Serialise payouts per artist so two requests can't both spend the same balance.
    await exec('SELECT Id FROM Artists WHERE Id = @a FOR UPDATE', { a }, t);
    const bal = await balances(a);
    if (amountToea > bal.availableToea) throw badRequest(`You can withdraw up to K ${toKina(bal.availableToea).toFixed(2)}.`, { amount: 'More than your available balance.' });
    await exec('INSERT INTO Payouts (Id, ArtistId, AmountToea, Method) VALUES (@id, @a, @amt, @method)', { id, a, amt: amountToea, method: b.method }, t);
    await notify(me(req).id, { kind: 'payout', title: 'Withdrawal on its way', body: `K ${b.amount.toFixed(2)} to ${b.method}. Usually 1–2 business days.`, link: '/studio/earnings' }, t);
  });
  res.status(201).json({ id, balances: kinaBalances(await balances(a)) });
});

// ——— profile & verification ———

studioRouter.patch('/profile', async (req, res) => {
  const b = parse(z.object({
    village: z.string().trim().max(200).optional(), bio: z.string().trim().max(5000).optional(), lineage: z.string().trim().max(5000).optional(),
    yearsPractising: z.number().int().min(0).max(100).optional(), province: z.string().max(60).optional(), avatarUri: z.url().nullable().optional(),
    crafts: z.array(z.string().max(60)).min(1).max(12).optional(),
  }), req.body);
  const a = myArtistId(req);
  await exec(`UPDATE Artists SET Village = COALESCE(@village, Village), Bio = COALESCE(@bio, Bio), Lineage = COALESCE(@lineage, Lineage),
      YearsPractising = COALESCE(@years, YearsPractising), ProvinceSlug = COALESCE(@province, ProvinceSlug),
      AvatarUrl = CASE WHEN @setAvatar THEN @avatar ELSE AvatarUrl END, Crafts = COALESCE(@crafts, Crafts) WHERE Id = @a`,
  { a, village: b.village ?? null, bio: b.bio ?? null, lineage: b.lineage ?? null, years: b.yearsPractising ?? null, province: b.province ?? null,
    setAvatar: b.avatarUri !== undefined, avatar: b.avatarUri ?? null, crafts: b.crafts ? JSON.stringify(b.crafts) : null });
  res.json(mapArtist((await one<ArtistRow>('SELECT * FROM Artists WHERE Id = @a', { a }))!));
});

studioRouter.get('/verification', async (req, res) => {
  const a = myArtistId(req);
  const artist = (await one<{ Verification: string; VerificationSubmittedAt: Date | null }>('SELECT Verification, VerificationSubmittedAt FROM Artists WHERE Id = @a', { a }))!;
  const last = await one<{ Status: string; ReviewNote: string | null; CreatedAt: Date }>('SELECT Status, ReviewNote, CreatedAt FROM VerificationRequests WHERE ArtistId = @a ORDER BY CreatedAt DESC LIMIT 1', { a });
  res.json({ status: artist.Verification, submittedAt: artist.VerificationSubmittedAt ? +artist.VerificationSubmittedAt : undefined, lastRequest: last ? { status: last.Status, note: last.ReviewNote ?? undefined, at: +last.CreatedAt } : null });
});

studioRouter.post('/verification', async (req, res) => {
  const b = parse(z.object({
    idPhotoUrl: z.url('Add a photo of your ID.'), selfieUrl: z.url('Add a selfie.'),
    referee: z.object({ name: z.string().trim().min(2, 'Add your referee\'s name.').max(120), role: z.string().trim().max(120).default(''), phone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 7, 'Add your referee\'s phone number.') }),
    portfolio: z.array(z.url()).min(3, 'Add at least 3 photos of your work, including one in progress.').max(6),
  }), req.body);
  const a = myArtistId(req);
  const cur = (await one<{ Verification: string }>('SELECT Verification FROM Artists WHERE Id = @a', { a }))!;
  if (cur.Verification !== 'none') throw conflict(cur.Verification === 'verified' ? 'You are already verified.' : 'Your application is already under review.');
  await tx(async (t) => {
    await exec(`INSERT INTO VerificationRequests (Id, ArtistId, IdPhotoUrl, SelfieUrl, RefereeName, RefereeRole, RefereePhone, Portfolio)
                VALUES (@id, @a, @idp, @selfie, @rn, @rr, @rp, @pf)`,
    { id: newId('v'), a, idp: b.idPhotoUrl, selfie: b.selfieUrl, rn: b.referee.name, rr: b.referee.role, rp: b.referee.phone, pf: JSON.stringify(b.portfolio) }, t);
    await exec(`UPDATE Artists SET Verification = 'pending', VerificationSubmittedAt = now() WHERE Id = @a`, { a }, t);
    await notify(me(req).id, { kind: 'verify', title: 'Verification submitted', body: 'Our team reviews applications within 48 hours. We\'ll let you know.', link: '/verify' }, t);
  });
  res.status(201).json({ status: 'pending' });
});
