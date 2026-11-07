import { createHash } from 'node:crypto';

import { inList, query, type Runner } from '../db';
import { ms, toKina } from '../http';

type ArtworkRow = {
  Id: string; ArtistId: string; Title: string; CategorySlug: string; ProvinceSlug: string; PriceToea: number; Pattern: string; Variant: number | null;
  Story: string; Significance: string; Dimensions: string; WeightKg: number; ExportPermit: boolean; OneOfAKind: boolean; Status: string; Featured: boolean;
  Views: number; CreatedAt: Date; Serial: string | null; OwnerUserId: string | null;
};

export const ARTWORK_SELECT = `
  SELECT a.Id, a.ArtistId, a.Title, a.CategorySlug, a.ProvinceSlug, a.PriceToea, a.Pattern, a.Variant, a.Story, a.Significance, a.Dimensions,
         a.WeightKg, a.ExportPermit, a.OneOfAKind, a.Status, a.Featured, a.Views, a.CreatedAt, c.Serial, c.OwnerUserId
  FROM Artworks a LEFT JOIN Certificates c ON c.ArtworkId = a.Id`;

/** Loads artworks with their photos, materials and techniques, in the shape of the app's Artwork type. */
export async function hydrateArtworks(rows: ArtworkRow[], runner?: Runner) {
  if (!rows.length) return [];
  const params: Record<string, unknown> = {};
  const ids = inList(rows.map((r) => r.Id), params, 'id');
  // A transaction runs one request at a time, so these stay sequential.
  const media = await query<{ ArtworkId: string; Url: string }>(`SELECT ArtworkId, Url FROM ArtworkMedia WHERE ArtworkId IN (${ids}) ORDER BY SortOrder`, params, runner);
  const mats = await query<{ ArtworkId: string; MaterialSlug: string }>(`SELECT ArtworkId, MaterialSlug FROM ArtworkMaterials WHERE ArtworkId IN (${ids}) ORDER BY MaterialSlug`, params, runner);
  const techs = await query<{ ArtworkId: string; TechniqueSlug: string }>(`SELECT ArtworkId, TechniqueSlug FROM ArtworkTechniques WHERE ArtworkId IN (${ids}) ORDER BY TechniqueSlug`, params, runner);
  return rows.map((a) => ({
    id: a.Id, title: a.Title, artistId: a.ArtistId, category: a.CategorySlug, province: a.ProvinceSlug, price: toKina(a.PriceToea),
    pattern: a.Pattern, variant: a.Variant ?? undefined,
    images: media.filter((m) => m.ArtworkId === a.Id).map((m) => m.Url),
    story: a.Story, significance: a.Significance,
    materials: mats.filter((m) => m.ArtworkId === a.Id).map((m) => m.MaterialSlug),
    techniques: techs.filter((t) => t.ArtworkId === a.Id).map((t) => t.TechniqueSlug),
    dimensions: a.Dimensions, weightKg: Number(a.WeightKg), exportPermit: a.ExportPermit, oneOfAKind: a.OneOfAKind,
    status: a.Status, featured: a.Featured, views: a.Views, createdAt: ms(a.CreatedAt),
    certificateSerial: a.Serial ?? '', ownerId: a.OwnerUserId ?? undefined,
  }));
}

export async function loadArtworks(where: string, params: Record<string, unknown>, tail = '', runner?: Runner) {
  const rows = await query<ArtworkRow>(`${ARTWORK_SELECT} ${where ? `WHERE ${where}` : ''} ${tail}`, params, runner);
  return hydrateArtworks(rows, runner);
}

export async function loadArtwork(id: string, runner?: Runner) {
  return (await loadArtworks('a.Id = @id', { id }, '', runner))[0];
}

export type ArtworkOut = Awaited<ReturnType<typeof hydrateArtworks>>[number];

// ——— certificates ———

/** Serial format TA-COA-{province code}-{year}-{6 digits}, matching the app's scanner. */
export function newSerial(provinceCode: string) {
  return `TA-COA-${provinceCode}-${new Date().getUTCFullYear()}-${String(Math.floor(Math.random() * 900_000) + 100_000)}`;
}

export const fingerprint = (serial: string, artworkId: string, artistId: string) =>
  createHash('sha256').update(`${serial}|${artworkId}|${artistId}`).digest('hex');
