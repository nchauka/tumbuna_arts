import { Router } from 'express';
import { z } from 'zod';

import { me, optionalAuth, requireAuth } from '../auth';
import { exec, one, query } from '../db';
import { json, newId, notFound, parse, toToea } from '../http';
import { loadArtwork, loadArtworks } from '../services/artworks';
import { mapArtist, mapReview, type ArtistRow, type ReviewRow } from '../services/mappers';
import { notify } from '../services/notify';

export const catalogRouter = Router();

const ARTIST_SELECT = `
  SELECT ar.*, r.RatingAvg, r.RatingCount
  FROM Artists ar
  LEFT JOIN LATERAL (SELECT ROUND(AVG(Rating), 2) AS RatingAvg, COUNT(*) AS RatingCount FROM Reviews WHERE ArtistId = ar.Id) r ON true`;

// ——— reference & heritage content ———

catalogRouter.get('/meta', async (_req, res) => {
  const [provinces, categories, materials, techniques] = [
    await query<Record<string, unknown>>('SELECT * FROM Provinces ORDER BY Name'),
    await query<Record<string, unknown>>('SELECT * FROM Categories'),
    await query<Record<string, unknown>>('SELECT * FROM Materials ORDER BY Name'),
    await query<Record<string, unknown>>('SELECT * FROM Techniques ORDER BY Name'),
  ];
  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    provinces: provinces.map((p) => ({ slug: p.Slug, name: p.Name, code: p.Code, region: p.Region, capital: p.Capital, crafts: json(p.Crafts as string, []), blurb: p.Blurb, pattern: p.Pattern })),
    categories: categories.map((c) => ({ slug: c.Slug, name: c.Name, pattern: c.Pattern, variant: c.Variant ?? undefined })),
    materials: materials.map((m) => ({ slug: m.Slug, name: m.Name, source: m.Source, care: m.Care, exportNote: m.ExportNote ?? undefined, sustainable: m.Sustainable, pattern: m.Pattern })),
    techniques: techniques.map((t) => ({ slug: t.Slug, name: t.Name, where: t.Where, summary: t.Summary, steps: json(t.Steps as string, []), tools: json(t.Tools as string, []), pattern: t.Pattern })),
  });
});

const mapStory = (s: Record<string, unknown>) => ({
  slug: s.Slug, title: s.Title, province: s.ProvinceSlug, category: s.CategorySlug, teller: s.Teller, readMins: s.ReadMins,
  pattern: s.Pattern, variant: s.Variant ?? undefined, intro: s.Intro, chapters: json(s.Chapters as string, []),
});

catalogRouter.get('/stories', async (_req, res) => {
  res.json({ items: (await query<Record<string, unknown>>('SELECT * FROM Stories ORDER BY CreatedAt')).map(mapStory) });
});

catalogRouter.get('/stories/:slug', async (req, res) => {
  const s = await one<Record<string, unknown>>('SELECT * FROM Stories WHERE Slug = @slug', { slug: req.params.slug });
  if (!s) throw notFound('Story');
  res.json(mapStory(s));
});

// ——— artworks ———

const SORTS = {
  recommended: 'a.Featured DESC, CASE WHEN ar.Verification = \'verified\' THEN 1 ELSE 0 END DESC, a.Views DESC, a.CreatedAt DESC',
  newest: 'a.CreatedAt DESC',
  priceAsc: 'a.PriceToea ASC, a.CreatedAt DESC',
  priceDesc: 'a.PriceToea DESC, a.CreatedAt DESC',
  popular: 'a.Views DESC, a.CreatedAt DESC',
} as const;

const bool = z.union([z.boolean(), z.enum(['1', '0', 'true', 'false']).transform((v) => v === '1' || v === 'true')]).optional();
const ListQuery = z.object({
  category: z.string().optional(), province: z.string().optional(), material: z.string().optional(), technique: z.string().optional(),
  artist: z.string().optional(), min: z.coerce.number().min(0).optional(), max: z.coerce.number().min(0).optional(),
  verified: bool, noPermit: bool, featured: bool, q: z.string().max(100).optional(),
  status: z.enum(['live', 'sold']).default('live'),
  sort: z.enum(Object.keys(SORTS) as [keyof typeof SORTS, ...(keyof typeof SORTS)[]]).default('recommended'),
  limit: z.coerce.number().int().min(1).max(60).default(24), offset: z.coerce.number().int().min(0).default(0),
});

/** Wraps a search word for ILIKE, escaping its wildcard characters with backslashes (the Postgres default). */
const likeParam = (w: string) => `%${w.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

/** Matches every word of `q` against title, artist, province, category, material and technique names. */
function textFilter(q: string, params: Record<string, unknown>) {
  const words = q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return words.map((w, i) => {
    params[`w${i}`] = likeParam(w);
    return `(a.Title ILIKE @w${i} OR ar.Name ILIKE @w${i} OR ar.Village ILIKE @w${i} OR pv.Name ILIKE @w${i} OR ct.Name ILIKE @w${i}
      OR EXISTS (SELECT 1 FROM ArtworkMaterials am JOIN Materials m ON m.Slug = am.MaterialSlug WHERE am.ArtworkId = a.Id AND m.Name ILIKE @w${i})
      OR EXISTS (SELECT 1 FROM ArtworkTechniques atq JOIN Techniques t ON t.Slug = atq.TechniqueSlug WHERE atq.ArtworkId = a.Id AND t.Name ILIKE @w${i}))`;
  });
}

catalogRouter.get('/artworks', async (req, res) => {
  const f = parse(ListQuery, req.query);
  const params: Record<string, unknown> = { status: f.status };
  const where = ['a.Status = @status'];
  if (f.category) { where.push('a.CategorySlug = @category'); params.category = f.category; }
  if (f.province) { where.push('a.ProvinceSlug = @province'); params.province = f.province; }
  if (f.artist) { where.push('a.ArtistId = @artist'); params.artist = f.artist; }
  if (f.material) { where.push('EXISTS (SELECT 1 FROM ArtworkMaterials x WHERE x.ArtworkId = a.Id AND x.MaterialSlug = @material)'); params.material = f.material; }
  if (f.technique) { where.push('EXISTS (SELECT 1 FROM ArtworkTechniques x WHERE x.ArtworkId = a.Id AND x.TechniqueSlug = @technique)'); params.technique = f.technique; }
  if (f.min != null) { where.push('a.PriceToea >= @min'); params.min = toToea(f.min); }
  if (f.max != null) { where.push('a.PriceToea <= @max'); params.max = toToea(f.max); }
  if (f.verified) where.push(`ar.Verification = 'verified'`);
  if (f.noPermit) where.push('NOT a.ExportPermit');
  if (f.featured) where.push('a.Featured');
  if (f.q) where.push(...textFilter(f.q, params));

  const from = `FROM Artworks a JOIN Artists ar ON ar.Id = a.ArtistId JOIN Provinces pv ON pv.Slug = a.ProvinceSlug JOIN Categories ct ON ct.Slug = a.CategorySlug WHERE ${where.join(' AND ')}`;
  const total = (await one<{ n: number }>(`SELECT COUNT(*) AS n ${from}`, params))!.n;
  const ids = await query<{ Id: string }>(`SELECT a.Id ${from} ORDER BY ${SORTS[f.sort]} LIMIT @limit OFFSET @offset`, { ...params, offset: f.offset, limit: f.limit });
  const items = ids.length ? await loadArtworks(`a.Id IN (${ids.map((_, i) => `@r${i}`).join(',')})`, Object.fromEntries(ids.map((r, i) => [`r${i}`, r.Id]))) : [];
  const order = new Map(ids.map((r, i) => [r.Id, i]));
  items.sort((x, y) => order.get(x.id)! - order.get(y.id)!);
  res.json({ items, total, limit: f.limit, offset: f.offset });
});

catalogRouter.get('/artworks/:id', optionalAuth, async (req, res) => {
  const art = await loadArtwork(req.params.id as string);
  const isOwner = !!art && req.user?.artistId === art.artistId;
  if (!art || ((art.status === 'draft' || art.status === 'hidden') && !isOwner)) throw notFound('Artwork');
  res.json(art);
});

catalogRouter.post('/artworks/:id/view', async (req, res) => {
  await exec(`UPDATE Artworks SET Views = Views + 1 WHERE Id = @id AND Status = 'live'`, { id: req.params.id });
  res.status(204).end();
});

// ——— artists ———

catalogRouter.get('/artists', async (req, res) => {
  const { craft, verified } = parse(z.object({ craft: z.string().optional(), verified: bool }), req.query);
  const params: Record<string, unknown> = {};
  const where = [`EXISTS (SELECT 1 FROM Artworks w WHERE w.ArtistId = ar.Id AND w.Status IN ('live', 'sold'))`];
  if (craft) { where.push('ar.Crafts ILIKE @craft'); params.craft = `%"${craft}"%`; }
  if (verified) where.push(`ar.Verification = 'verified'`);
  const rows = await query<ArtistRow>(`${ARTIST_SELECT} WHERE ${where.join(' AND ')} ORDER BY CASE WHEN ar.Verification = 'verified' THEN 0 ELSE 1 END, ar.JoinedAt`, params);
  res.json({ items: rows.map(mapArtist) });
});

catalogRouter.get('/artists/:id', async (req, res) => {
  const a = await one<ArtistRow>(`${ARTIST_SELECT} WHERE ar.Id = @id`, { id: req.params.id });
  if (!a) throw notFound('Artist');
  const stats = await one<{ Sold: number; Live: number }>(
    `SELECT SUM(CASE WHEN Status = 'sold' THEN 1 ELSE 0 END) AS Sold, SUM(CASE WHEN Status = 'live' THEN 1 ELSE 0 END) AS Live FROM Artworks WHERE ArtistId = @id`, { id: a.Id });
  res.json({ ...mapArtist(a), stats: { sold: stats?.Sold ?? 0, live: stats?.Live ?? 0 } });
});

catalogRouter.get('/artists/:id/reviews', async (req, res) => {
  const rows = await query<ReviewRow>('SELECT * FROM Reviews WHERE ArtistId = @id ORDER BY CreatedAt DESC LIMIT 50', { id: req.params.id });
  res.json({ items: rows.map(mapReview) });
});

catalogRouter.get('/reviews', async (req, res) => {
  const { artistId, limit } = parse(z.object({ artistId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(200) }), req.query);
  const rows = await query<ReviewRow>(`SELECT * FROM Reviews WHERE (@artistId IS NULL OR ArtistId = @artistId) ORDER BY CreatedAt DESC LIMIT @limit`, { limit, artistId: artistId ?? null });
  res.json({ items: rows.map(mapReview) });
});

catalogRouter.post('/artists/:id/commissions', requireAuth, async (req, res) => {
  const b = parse(z.object({ brief: z.string().trim().min(10, 'Describe what you would like made.').max(2000), budget: z.number().min(0).max(1_000_000).optional() }), req.body);
  const artistId = req.params.id as string;
  if (!(await one('SELECT 1 AS x FROM Artists WHERE Id = @id', { id: artistId }))) throw notFound('Artist');
  const u = me(req);
  await exec('INSERT INTO CommissionRequests (Id, ArtistId, UserId, Brief, BudgetToea) VALUES (@id, @artistId, @uid, @brief, @budget)',
    { id: newId('cm'), artistId, uid: u.id, brief: b.brief, budget: b.budget != null ? toToea(b.budget) : null });
  const artistUser = await one<{ Id: string }>('SELECT Id FROM Users WHERE ArtistId = @id', { id: artistId });
  await notify(artistUser?.Id, { kind: 'activity', title: 'New commission request', body: `${u.name}: "${b.brief.slice(0, 80)}"`, link: '/studio/dashboard' });
  res.status(201).json({ ok: true });
});

// ——— search across artworks, artists and stories ———

catalogRouter.get('/search', async (req, res) => {
  const { q } = parse(z.object({ q: z.string().trim().min(1, 'Type something to search for.').max(100) }), req.query);
  const params: Record<string, unknown> = {};
  const works = await query<{ Id: string }>(
    `SELECT a.Id FROM Artworks a JOIN Artists ar ON ar.Id = a.ArtistId JOIN Provinces pv ON pv.Slug = a.ProvinceSlug JOIN Categories ct ON ct.Slug = a.CategorySlug
     WHERE a.Status = 'live' AND ${textFilter(q, params).join(' AND ')} ORDER BY a.Featured DESC, a.Views DESC LIMIT 40`, params);
  const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
  const wp: Record<string, unknown> = Object.fromEntries(words.map((w, i) => [`w${i}`, likeParam(w)]));
  const artists = await query<ArtistRow>(`${ARTIST_SELECT} JOIN Provinces pv ON pv.Slug = ar.ProvinceSlug WHERE ${words.map((_, i) => `(ar.Name ILIKE @w${i} OR ar.Village ILIKE @w${i} OR pv.Name ILIKE @w${i} OR ar.Crafts ILIKE @w${i})`).join(' AND ')}`, wp);
  const stories = await query<Record<string, unknown>>(`SELECT s.* FROM Stories s JOIN Provinces pv ON pv.Slug = s.ProvinceSlug WHERE ${words.map((_, i) => `(s.Title ILIKE @w${i} OR s.Intro ILIKE @w${i} OR pv.Name ILIKE @w${i})`).join(' AND ')}`, wp);
  const items = works.length ? await loadArtworks(`a.Id IN (${works.map((_, i) => `@r${i}`).join(',')})`, Object.fromEntries(works.map((r, i) => [`r${i}`, r.Id]))) : [];
  res.json({ works: items, artists: artists.map(mapArtist), stories: stories.map(mapStory) });
});
