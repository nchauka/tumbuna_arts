import { Router } from 'express';
import { z } from 'zod';

import { me, requireAuth } from '../auth';
import { exec, one, query, tx } from '../db';
import { notFound, parse } from '../http';
import { loadArtworks } from '../services/artworks';
import { mapNotification, type NotificationRow } from '../services/mappers';
import { sessionPayload } from './auth';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get('/', async (req, res) => {
  res.json(await sessionPayload(me(req).id));
});

meRouter.patch('/', async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(2, 'Enter your full name.').max(120).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    country: z.string().trim().min(2).max(80).optional(),
  }), req.body);
  const u = me(req);
  await exec(`UPDATE Users SET Name = COALESCE(@name, Name), Phone = CASE WHEN @setPhone THEN @phone ELSE Phone END,
              City = CASE WHEN @setCity THEN @city ELSE City END, Country = COALESCE(@country, Country) WHERE Id = @id`,
  { id: u.id, name: b.name ?? null, setPhone: b.phone !== undefined, phone: b.phone?.replace(/\s/g, '') || null, setCity: b.city !== undefined, city: b.city || null, country: b.country ?? null });
  if (b.name && u.artistId) await exec('UPDATE Artists SET Name = @name WHERE Id = @id', { name: b.name, id: u.artistId });
  res.json(await sessionPayload(u.id));
});

/**
 * Deletes the account. Orders, reviews and certificates are kept for the other party's records
 * but no longer link to the user; an artist's live works are hidden.
 */
meRouter.delete('/', async (req, res) => {
  const u = me(req);
  await tx(async (t) => {
    await exec('UPDATE Orders SET BuyerId = NULL WHERE BuyerId = @id', { id: u.id }, t);
    await exec('UPDATE Reviews SET UserId = NULL WHERE UserId = @id', { id: u.id }, t);
    await exec('UPDATE Certificates SET OwnerName = @name, OwnerUserId = NULL WHERE OwnerUserId = @id', { id: u.id, name: u.name }, t);
    await exec('DELETE FROM CommissionRequests WHERE UserId = @id', { id: u.id }, t);
    await exec('UPDATE SupportMessages SET UserId = NULL WHERE UserId = @id', { id: u.id }, t);
    await exec('UPDATE VerificationRequests SET ReviewedBy = NULL WHERE ReviewedBy = @id', { id: u.id }, t);
    if (u.artistId) await exec(`UPDATE Artworks SET Status = 'hidden' WHERE ArtistId = @a AND Status = 'live'`, { a: u.artistId }, t);
    await exec('DELETE FROM Users WHERE Id = @id', { id: u.id }, t);
  });
  res.status(204).end();
});

// ——— wishlist & following ———

meRouter.get('/wishlist', async (req, res) => {
  const items = await loadArtworks('a.Id IN (SELECT ArtworkId FROM Wishlist WHERE UserId = @uid)', { uid: me(req).id }, 'ORDER BY a.CreatedAt DESC');
  res.json({ items });
});

meRouter.put('/wishlist/:artworkId', async (req, res) => {
  const p = { uid: me(req).id, aid: req.params.artworkId };
  if (!(await one('SELECT 1 AS x FROM Artworks WHERE Id = @aid', p))) throw notFound('Artwork');
  await exec('INSERT INTO Wishlist (UserId, ArtworkId) VALUES (@uid, @aid) ON CONFLICT DO NOTHING', p);
  res.status(204).end();
});

meRouter.delete('/wishlist/:artworkId', async (req, res) => {
  await exec('DELETE FROM Wishlist WHERE UserId = @uid AND ArtworkId = @aid', { uid: me(req).id, aid: req.params.artworkId });
  res.status(204).end();
});

meRouter.get('/following', async (req, res) => {
  const rows = await query<{ ArtistId: string }>('SELECT ArtistId FROM Follows WHERE UserId = @uid ORDER BY CreatedAt DESC', { uid: me(req).id });
  res.json({ artistIds: rows.map((r) => r.ArtistId) });
});

meRouter.put('/following/:artistId', async (req, res) => {
  const p = { uid: me(req).id, aid: req.params.artistId };
  if (!(await one('SELECT 1 AS x FROM Artists WHERE Id = @aid', p))) throw notFound('Artist');
  await exec('INSERT INTO Follows (UserId, ArtistId) VALUES (@uid, @aid) ON CONFLICT DO NOTHING', p);
  res.status(204).end();
});

meRouter.delete('/following/:artistId', async (req, res) => {
  await exec('DELETE FROM Follows WHERE UserId = @uid AND ArtistId = @aid', { uid: me(req).id, aid: req.params.artistId });
  res.status(204).end();
});

// ——— addresses ———

meRouter.get('/addresses', async (req, res) => {
  const rows = await query<Record<string, string>>('SELECT Name, Phone, Line1, City, Province, Country, Postcode FROM Addresses WHERE UserId = @uid ORDER BY UpdatedAt DESC LIMIT 5', { uid: me(req).id });
  res.json({ items: rows.map((r) => ({ name: r.Name, phone: r.Phone, line1: r.Line1, city: r.City, province: r.Province, country: r.Country, postcode: r.Postcode })) });
});

// ——— certificates I own ———

meRouter.get('/certificates', async (req, res) => {
  const items = await loadArtworks('c.OwnerUserId = @uid', { uid: me(req).id }, 'ORDER BY a.CreatedAt DESC');
  res.json({ items });
});

// ——— notifications ———

meRouter.get('/notifications', async (req, res) => {
  const rows = await query<NotificationRow>('SELECT * FROM Notifications WHERE UserId = @uid ORDER BY CreatedAt DESC LIMIT 200', { uid: me(req).id });
  res.json({ items: rows.map(mapNotification), unread: rows.filter((r) => !r.IsRead).length });
});

meRouter.post('/notifications/read', async (req, res) => {
  const b = parse(z.object({ ids: z.array(z.string()).max(200).optional() }), req.body ?? {});
  const uid = me(req).id;
  if (b.ids?.length) {
    for (const id of b.ids) await exec('UPDATE Notifications SET IsRead = true WHERE Id = @id AND UserId = @uid', { id, uid });
  } else {
    await exec('UPDATE Notifications SET IsRead = true WHERE UserId = @uid AND NOT IsRead', { uid });
  }
  res.status(204).end();
});
