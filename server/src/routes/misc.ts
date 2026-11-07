import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { me, optionalAuth, requireAdmin, requireAuth } from '../auth';
import { exec, one, query, tx } from '../db';
import { badRequest, conflict, json, ms, notFound, parse } from '../http';
import { notify } from '../services/notify';
import { ALLOWED_TYPES, storeImage } from '../services/storage';

// ——— uploads ———

export const uploadsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
const FOLDERS = ['artworks', 'avatars', 'reviews', 'verification'] as const;

/** Accepts one image as multipart field "file" and returns its public URL. */
uploadsRouter.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const { folder } = parse(z.object({ folder: z.enum(FOLDERS).default('artworks') }), req.body ?? {});
  if (!req.file) throw badRequest('Attach an image as the "file" field.');
  if (!ALLOWED_TYPES.includes(req.file.mimetype)) throw badRequest('Upload a JPEG, PNG, WebP or HEIC image.');
  const url = await storeImage(req.file.buffer, req.file.mimetype, `${folder}/${me(req).id}`);
  res.status(201).json({ url });
});

// ——— support ———

export const supportRouter = Router();
supportRouter.post('/', optionalAuth, async (req, res) => {
  const b = parse(z.object({ message: z.string().trim().min(5, 'Tell us a little more.').max(2000), context: z.string().max(200).optional() }), req.body);
  await exec('INSERT INTO SupportMessages (UserId, Message, Context) VALUES (@uid, @msg, @ctx)', { uid: req.user?.id ?? null, msg: b.message, ctx: b.context ?? null });
  res.status(201).json({ ok: true });
});

// ——— admin: verification review ———

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/verifications', async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('pending') }), req.query);
  const rows = await query<Record<string, unknown>>(
    `SELECT v.*, a.Name AS ArtistName, a.ProvinceSlug FROM VerificationRequests v JOIN Artists a ON a.Id = v.ArtistId WHERE v.Status = @status ORDER BY v.CreatedAt`, { status });
  res.json({
    items: rows.map((v) => ({
      id: v.Id, artistId: v.ArtistId, artistName: v.ArtistName, province: v.ProvinceSlug, idPhotoUrl: v.IdPhotoUrl, selfieUrl: v.SelfieUrl,
      referee: { name: v.RefereeName, role: v.RefereeRole, phone: v.RefereePhone }, portfolio: json(v.Portfolio as string, []),
      status: v.Status, note: v.ReviewNote ?? undefined, createdAt: ms(v.CreatedAt as Date),
    })),
  });
});

adminRouter.post('/verifications/:id/decision', async (req, res) => {
  const b = parse(z.object({ approve: z.boolean(), note: z.string().trim().max(500).optional() }), req.body);
  const v = await one<{ ArtistId: string; Status: string }>('SELECT ArtistId, Status FROM VerificationRequests WHERE Id = @id', { id: req.params.id });
  if (!v) throw notFound('Verification request');
  if (v.Status !== 'pending') throw conflict('This request has already been decided.');
  if (!b.approve && !b.note) throw badRequest('Add a note telling the artist what to fix.', { note: 'Required when rejecting.' });
  await tx(async (t) => {
    await exec('UPDATE VerificationRequests SET Status = @s, ReviewNote = @note, ReviewedBy = @by, ReviewedAt = now() WHERE Id = @id',
      { s: b.approve ? 'approved' : 'rejected', note: b.note ?? null, by: me(req).id, id: req.params.id }, t);
    await exec('UPDATE Artists SET Verification = @v WHERE Id = @a', { v: b.approve ? 'verified' : 'none', a: v.ArtistId }, t);
    const artistUser = await one<{ Id: string }>('SELECT Id FROM Users WHERE ArtistId = @a', { a: v.ArtistId }, t);
    await notify(artistUser?.Id, b.approve
      ? { kind: 'verify', title: 'You are verified', body: 'The gold Verified Artist badge now appears on all your works.', link: `/artist/${v.ArtistId}` }
      : { kind: 'verify', title: 'Verification needs more information', body: b.note!, link: '/verify' }, t);
  });
  res.json({ ok: true });
});
