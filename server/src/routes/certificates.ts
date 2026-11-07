import { Router } from 'express';
import { z } from 'zod';

import { me, requireAuth } from '../auth';
import { exec, one, query, tx } from '../db';
import { badRequest, forbidden, ms, notFound, parse } from '../http';
import { loadArtwork } from '../services/artworks';
import { mapArtist, type ArtistRow } from '../services/mappers';
import { notify } from '../services/notify';

export const certificatesRouter = Router();

const SERIAL = /^TA-COA-[A-Z]{3}-\d{4}-\d{6}$/;
const displayName = (full: string) => { const [f, l] = full.split(' '); return l ? `${f} ${l[0]}.` : f; };

/** Public lookup used by the QR scanner and certificate viewer. Shows owner initials only. */
certificatesRouter.get('/:serial', async (req, res) => {
  const serial = (req.params.serial as string).toUpperCase();
  if (!SERIAL.test(serial)) throw notFound('Certificate');
  const c = await one<{ Serial: string; ArtworkId: string; Fingerprint: string; IssuedAt: Date; OwnerUserId: string | null; OwnerName: string | null; OwnerFull: string | null }>(
    `SELECT c.*, u.Name AS OwnerFull FROM Certificates c LEFT JOIN Users u ON u.Id = c.OwnerUserId WHERE c.Serial = @serial`, { serial });
  if (!c) throw notFound('Certificate');
  const artwork = (await loadArtwork(c.ArtworkId))!;
  const artist = (await one<ArtistRow>('SELECT * FROM Artists WHERE Id = @id', { id: artwork.artistId }))!;
  const history = await query<{ Reason: string; CreatedAt: Date }>('SELECT Reason, CreatedAt FROM CertificateTransfers WHERE Serial = @serial ORDER BY CreatedAt', { serial });
  res.json({
    serial: c.Serial,
    fingerprint: c.Fingerprint,
    issuedAt: ms(c.IssuedAt),
    status: 'authentic',
    owner: c.OwnerFull ? displayName(c.OwnerFull) : c.OwnerName ? displayName(c.OwnerName) : null,
    transferred: history.some((h) => h.Reason === 'transfer'),
    history: [{ event: 'listed', at: artwork.createdAt }, ...history.map((h) => ({ event: h.Reason, at: ms(h.CreatedAt) }))],
    artwork,
    artist: mapArtist(artist),
  });
});

certificatesRouter.post('/:serial/transfer', requireAuth, async (req, res) => {
  const { toEmail } = parse(z.object({ toEmail: z.email('Enter the new owner\'s account email.') }), req.body);
  const serial = (req.params.serial as string).toUpperCase();
  const u = me(req);
  const c = await one<{ OwnerUserId: string | null; ArtworkId: string }>('SELECT OwnerUserId, ArtworkId FROM Certificates WHERE Serial = @serial', { serial });
  if (!c) throw notFound('Certificate');
  if (c.OwnerUserId !== u.id) throw forbidden('Only the current owner can transfer this certificate.');
  const to = await one<{ Id: string }>('SELECT Id FROM Users WHERE Email = @e', { e: toEmail.toLowerCase() });
  if (!to) throw badRequest('No Tumbuna Arts account uses that email. Ask the new owner to sign up first.', { toEmail: 'No account with that email.' });
  if (to.Id === u.id) throw badRequest('You already own this certificate.');
  const title = (await one<{ Title: string }>('SELECT Title FROM Artworks WHERE Id = @id', { id: c.ArtworkId }))!.Title;
  await tx(async (t) => {
    const n = await exec('UPDATE Certificates SET OwnerUserId = @to WHERE Serial = @serial AND OwnerUserId = @from', { to: to.Id, serial, from: u.id }, t);
    if (!n) throw forbidden('Only the current owner can transfer this certificate.');
    await exec(`INSERT INTO CertificateTransfers (Serial, FromUserId, ToUserId, Reason) VALUES (@serial, @from, @to, 'transfer')`, { serial, from: u.id, to: to.Id }, t);
    await notify(to.Id, { kind: 'activity', title: 'Certificate transferred to you', body: `${title} · ${serial}`, link: `/certificate/${serial}` }, t);
  });
  res.json({ ok: true });
});
