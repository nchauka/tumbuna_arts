import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { config } from './config';
import { one } from './db';
import { forbidden, unauthorized } from './http';

export type AuthUser = { id: string; role: 'buyer' | 'artist' | 'admin'; artistId: string | null; name: string };

declare module 'express-serve-static-core' {
  interface Request { user?: AuthUser }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'] });
}

async function loadUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  let sub: string;
  try {
    sub = (jwt.verify(token, config.jwt.secret) as { sub: string }).sub;
  } catch {
    throw unauthorized('Your session has expired. Log in again.');
  }
  const u = await one<{ Id: string; Role: AuthUser['role']; ArtistId: string | null; Name: string }>(
    'SELECT Id, Role, ArtistId, Name FROM Users WHERE Id = @id', { id: sub });
  if (!u) throw unauthorized('This account no longer exists.');
  return { id: u.Id, role: u.Role, artistId: u.ArtistId, name: u.Name };
}

/** Attaches req.user when a valid token is present; anonymous requests pass through. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try { req.user = (await loadUser(req)) ?? undefined; next(); } catch (e) { next(e); }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const u = await loadUser(req);
    if (!u) throw unauthorized();
    req.user = u;
    next();
  } catch (e) { next(e); }
}

export function requireArtist(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.artistId) return next(forbidden('This needs an artist account.'));
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return next(forbidden());
  next();
}

/** Narrows req.user after requireAuth. */
export const me = (req: Request) => req.user as AuthUser;
export const myArtistId = (req: Request) => req.user?.artistId as string;
