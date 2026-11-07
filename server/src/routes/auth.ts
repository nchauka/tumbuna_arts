import { randomInt } from 'node:crypto';

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { checkPassword, hashPassword, me, requireAuth, signToken } from '../auth';
import { config } from '../config';
import { exec, one, tx } from '../db';
import { badRequest, conflict, newId, parse, unauthorized } from '../http';
import { mapArtist, mapUser, type ArtistRow, type UserRow } from '../services/mappers';
import { notify, sendCode } from '../services/notify';

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60_000, limit: config.isTest ? 10_000 : 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'rate_limited', message: 'Too many attempts. Wait a few minutes and try again.' } } });

const isPhone = (s: string) => /^\+?[\d\s]{7,}$/.test(s.trim());
const normPhone = (s: string) => s.replace(/\s/g, '');
const identifier = z.string().trim().min(3, 'Enter your email or phone number.').max(254);
const password = z.string().min(8, 'Use at least 8 characters for your password.').max(200);

async function findByIdentifier(id: string) {
  const v = id.trim();
  return isPhone(v)
    ? one<UserRow & { PasswordHash: string }>('SELECT * FROM Users WHERE REPLACE(Phone, \' \', \'\') = @v', { v: normPhone(v) })
    : one<UserRow & { PasswordHash: string }>('SELECT * FROM Users WHERE Email = @v', { v: v.toLowerCase() });
}

export async function sessionPayload(userId: string) {
  const u = await one<UserRow>('SELECT * FROM Users WHERE Id = @id', { id: userId });
  if (!u) throw unauthorized('This account no longer exists.');
  const artist = u.ArtistId ? await one<ArtistRow>('SELECT * FROM Artists WHERE Id = @id', { id: u.ArtistId }) : undefined;
  return { user: mapUser(u), artist: artist ? mapArtist(artist) : null };
}

const RegisterBody = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  identifier,
  password,
  role: z.enum(['buyer', 'artist']),
  country: z.string().trim().min(2).max(80).default('Papua New Guinea'),
  province: z.string().max(60).optional(),
  crafts: z.array(z.string().max(60)).max(12).optional(),
});

authRouter.post('/register', limiter, async (req, res) => {
  const b = parse(RegisterBody, req.body);
  const phone = isPhone(b.identifier);
  if (!phone && !z.email().safeParse(b.identifier).success) throw badRequest('Enter a valid email address or phone number.', { identifier: 'Enter a valid email address or phone number.' });
  if (b.role === 'artist' && !b.province) throw badRequest('Choose the province you work in.', { province: 'Choose the province you work in.' });
  if (await findByIdentifier(b.identifier)) throw conflict('An account already uses that email or phone. Log in instead.');

  const userId = newId('u');
  const hash = await hashPassword(b.password);
  await tx(async (t) => {
    let artistId: string | null = null;
    if (b.role === 'artist') {
      artistId = newId('a');
      await exec(`INSERT INTO Artists (Id, Name, ProvinceSlug, Crafts) VALUES (@id, @name, @province, @crafts)`,
        { id: artistId, name: b.name, province: b.province, crafts: JSON.stringify(b.crafts?.length ? b.crafts : ['Carvings']) }, t);
    }
    await exec(`INSERT INTO Users (Id, Name, Email, Phone, PasswordHash, Role, ArtistId, Country) VALUES (@id, @name, @email, @phone, @hash, @role, @artistId, @country)`,
      { id: userId, name: b.name, email: phone ? null : b.identifier.toLowerCase(), phone: phone ? normPhone(b.identifier) : null, hash, role: b.role, artistId, country: b.role === 'artist' ? 'Papua New Guinea' : b.country }, t);
    await notify(userId, b.role === 'artist'
      ? { kind: 'activity', title: 'Welcome to Tumbuna Arts', body: 'Get verified to earn the gold badge on your works.', link: '/verify' }
      : { kind: 'activity', title: 'Welcome to Tumbuna Arts', body: 'Explore art from all 22 provinces.', link: '/explore' }, t);
  });
  res.status(201).json({ token: signToken(userId), ...(await sessionPayload(userId)) });
});

authRouter.post('/login', limiter, async (req, res) => {
  const b = parse(z.object({ identifier, password: z.string().min(1, 'Enter your password.') }), req.body);
  const u = await findByIdentifier(b.identifier);
  if (!u || !(await checkPassword(b.password, u.PasswordHash))) throw unauthorized('That email/phone and password do not match. Try again or reset your password.');
  res.json({ token: signToken(u.Id), ...(await sessionPayload(u.Id)) });
});

authRouter.post('/reset/request', limiter, async (req, res) => {
  const b = parse(z.object({ identifier }), req.body);
  const u = await findByIdentifier(b.identifier);
  let devCode: string | undefined;
  // Respond the same way whether or not the account exists, so the endpoint can't be used to find accounts.
  if (u) {
    const code = String(randomInt(100_000, 1_000_000));
    await exec('UPDATE PasswordResets SET UsedAt = now() WHERE UserId = @uid AND UsedAt IS NULL', { uid: u.Id });
    await exec(`INSERT INTO PasswordResets (UserId, CodeHash, ExpiresAt) VALUES (@uid, @hash, now() + make_interval(mins => @mins))`,
      { uid: u.Id, hash: await hashPassword(code), mins: config.rules.resetCodeMinutes });
    await sendCode(u.Email || u.Phone || '', code);
    if (!config.isProd) devCode = code;
  }
  res.json({ ok: true, expiresInMinutes: config.rules.resetCodeMinutes, ...(devCode ? { devCode } : {}) });
});

authRouter.post('/reset/confirm', limiter, async (req, res) => {
  const b = parse(z.object({ identifier, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'), password }), req.body);
  const invalid = badRequest('That code is not right or has expired. Request a new one.', { code: 'That code is not right or has expired.' });
  const u = await findByIdentifier(b.identifier);
  if (!u) throw invalid;
  const r = await one<{ Id: number; CodeHash: string; Attempts: number }>(
    'SELECT Id, CodeHash, Attempts FROM PasswordResets WHERE UserId = @uid AND UsedAt IS NULL AND ExpiresAt > now() ORDER BY CreatedAt DESC LIMIT 1', { uid: u.Id });
  if (!r || r.Attempts >= 5) throw invalid;
  if (!(await checkPassword(b.code, r.CodeHash))) {
    await exec('UPDATE PasswordResets SET Attempts = Attempts + 1 WHERE Id = @id', { id: r.Id });
    throw invalid;
  }
  await tx(async (t) => {
    await exec('UPDATE PasswordResets SET UsedAt = now() WHERE Id = @id', { id: r.Id }, t);
    await exec('UPDATE Users SET PasswordHash = @hash WHERE Id = @uid', { hash: await hashPassword(b.password), uid: u.Id }, t);
  });
  res.json({ ok: true });
});

authRouter.get('/session', requireAuth, async (req, res) => {
  res.json(await sessionPayload(me(req).id));
});
