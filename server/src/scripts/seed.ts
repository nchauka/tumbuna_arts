/**
 * Loads the app's seed catalogue (src/data/seed.ts) plus demo accounts into an empty database.
 *   npm run db:seed
 * Demo logins (password tumbuna123): kila@example.com (buyer), joseph@example.com (artist), admin@example.com (admin).
 */
import { randomUUID } from 'node:crypto';

import type pg from 'pg';

import {
  artists, categories, materials, provinces, seedArtworks, seedOrders, seedReviews, seedUsers, stories, techniques,
} from '../../../src/data/seed';
import { hashPassword } from '../auth';
import { config } from '../config';
import { createPool } from '../db';
import { fingerprint } from '../services/artworks';

const ADMIN = { id: 'u-admin', name: 'Tumbuna Admin', email: 'admin@example.com', password: 'tumbuna123' };

type Row = Record<string, unknown>;

/** Inserts rows in multi-row batches; a hosted database is a network round trip per statement. */
async function insert(client: pg.PoolClient, table: string, rows: Row[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const perBatch = Math.max(1, Math.floor(60_000 / cols.length));
  for (let i = 0; i < rows.length; i += perBatch) {
    const values: unknown[] = [];
    const tuples = rows.slice(i, i + perBatch).map((r) => `(${cols.map((c) => `$${values.push(r[c] ?? null)}`).join(', ')})`);
    await client.query(`INSERT INTO ${table} (${cols.map((c) => (c === 'Where' ? '"where"' : c)).join(', ')}) VALUES ${tuples.join(', ')}`, values);
  }
}

export async function seed({ schema = config.db.schema, quiet = false } = {}) {
  const log = (m: string) => { if (!quiet) console.log(m); };
  const pool = createPool(schema);
  const client = await pool.connect();
  try {
    const existing = Number((await client.query<{ n: string }>('SELECT COUNT(*) AS n FROM Provinces')).rows[0].n);
    if (existing) { log('[seed] database already has data; run `npm run db:reset` to start fresh.'); return; }
    await client.query('BEGIN');

    await insert(client, 'Provinces', provinces.map((p) => ({ Slug: p.slug, Name: p.name, Code: p.code, Region: p.region, Capital: p.capital, Crafts: JSON.stringify(p.crafts), Blurb: p.blurb, Pattern: p.pattern })));
    await insert(client, 'Categories', categories.map((c) => ({ Slug: c.slug, Name: c.name, Pattern: c.pattern, Variant: c.variant ?? null })));
    await insert(client, 'Materials', materials.map((m) => ({ Slug: m.slug, Name: m.name, Source: m.source, Care: m.care, ExportNote: m.exportNote ?? null, Sustainable: m.sustainable, Pattern: m.pattern })));
    await insert(client, 'Techniques', techniques.map((x) => ({ Slug: x.slug, Name: x.name, Where: x.where, Summary: x.summary, Steps: JSON.stringify(x.steps), Tools: JSON.stringify(x.tools), Pattern: x.pattern })));
    await insert(client, 'Stories', stories.map((s, i) => ({
      Slug: s.slug, Title: s.title, ProvinceSlug: s.province, CategorySlug: s.category, Teller: s.teller, ReadMins: s.readMins, Pattern: s.pattern,
      Variant: s.variant ?? null, Intro: s.intro, Chapters: JSON.stringify(s.chapters), CreatedAt: new Date(Date.UTC(2026, 0, 1 + i)),
    })));
    await insert(client, 'Artists', artists.map((a) => ({
      Id: a.id, Name: a.name, ProvinceSlug: a.province, Village: a.village, Crafts: JSON.stringify(a.crafts), Bio: a.bio, Lineage: a.lineage,
      YearsPractising: a.yearsPractising, Verification: a.verification, Pattern: a.pattern, Variant: a.variant ?? null, JoinedAt: new Date(a.joinedAt),
    })));
    const hash = await hashPassword('tumbuna123');
    await insert(client, 'Users', [
      ...seedUsers.map((u) => ({
        Id: u.id, Name: u.name, Email: u.email, Phone: u.phone?.replace(/\s/g, '') ?? null, PasswordHash: hash, Role: u.role,
        ArtistId: u.artistId ?? null, Country: u.country, City: u.city ?? null, CreatedAt: new Date(u.createdAt),
      })),
      { Id: ADMIN.id, Name: ADMIN.name, Email: ADMIN.email, Phone: null, PasswordHash: await hashPassword(ADMIN.password), Role: 'admin', ArtistId: null, Country: 'Papua New Guinea', City: null, CreatedAt: new Date() },
    ]);

    const soldTo = new Map(seedOrders.flatMap((o) => o.items.map((i) => [i.artworkId, o.buyerName] as const)));
    await insert(client, 'Artworks', seedArtworks.map((w) => ({
      Id: w.id, ArtistId: w.artistId, Title: w.title, CategorySlug: w.category, ProvinceSlug: w.province, PriceToea: w.price * 100, Pattern: w.pattern,
      Variant: w.variant ?? null, Story: w.story, Significance: w.significance, Dimensions: w.dimensions, WeightKg: w.weightKg, ExportPermit: w.exportPermit,
      OneOfAKind: w.oneOfAKind, Status: soldTo.has(w.id) ? 'sold' : w.status, Featured: !!w.featured, Views: w.views, CreatedAt: new Date(w.createdAt),
    })));
    await insert(client, 'ArtworkMaterials', seedArtworks.flatMap((w) => w.materials.map((m) => ({ ArtworkId: w.id, MaterialSlug: m }))));
    await insert(client, 'ArtworkTechniques', seedArtworks.flatMap((w) => w.techniques.map((x) => ({ ArtworkId: w.id, TechniqueSlug: x }))));
    await insert(client, 'Certificates', seedArtworks.map((w) => ({
      Serial: w.certificateSerial, ArtworkId: w.id, Fingerprint: fingerprint(w.certificateSerial, w.id, w.artistId), IssuedAt: new Date(w.createdAt), OwnerName: soldTo.get(w.id) ?? null,
    })));
    await insert(client, 'Reviews', seedReviews.map((r) => ({
      Id: r.id, ArtworkId: r.artworkId, ArtistId: r.artistId, UserName: r.userName, Rating: r.rating, Tags: JSON.stringify(r.tags), Text: r.text,
      Photos: JSON.stringify(r.photos), CreatedAt: new Date(r.at),
    })));
    await insert(client, 'Orders', seedOrders.map((o) => ({
      Id: o.id, Number: o.number, CheckoutId: randomUUID(), BuyerId: null, BuyerName: o.buyerName,
      ArtistId: seedArtworks.find((w) => w.id === o.items[0].artworkId)!.artistId,
      ShipName: o.address.name, ShipPhone: o.address.phone, ShipLine1: o.address.line1, ShipCity: o.address.city, ShipProvince: o.address.province,
      ShipCountry: o.address.country, ShipPostcode: o.address.postcode, ShippingId: o.shipping.id, ShippingLabel: o.shipping.label, Carrier: o.shipping.carrier,
      ShippingToea: o.shipping.price * 100, Eta: o.shipping.eta, PermitFeeToea: o.permitFee * 100, SubtotalToea: o.subtotal * 100, TotalToea: o.total * 100,
      Payment: o.payment, Status: o.status, TrackingNo: o.trackingNo ?? null, Reviewed: !!o.reviewed, Sample: true, CreatedAt: new Date(o.createdAt),
      ConfirmedAt: o.confirmedAt ? new Date(o.confirmedAt) : null,
    })));
    await insert(client, 'OrderItems', seedOrders.flatMap((o) => o.items.map((i) => ({ OrderId: o.id, ArtworkId: i.artworkId, PriceToea: i.price * 100 }))));
    await insert(client, 'OrderEvents', seedOrders.flatMap((o) => o.events.map((e) => ({ OrderId: o.id, Status: e.status, Note: e.note ?? null, CreatedAt: new Date(e.at) }))));
    await client.query('COMMIT');
    log(`[seed] loaded ${provinces.length} provinces, ${artists.length} artists, ${seedArtworks.length} artworks, ${stories.length} stories and ${seedUsers.length + 1} demo users`);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* not started */ }
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed().catch((e) => { console.error(`[seed] ${e.message}`); process.exit(1); });
}
