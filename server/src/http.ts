import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error', public details?: unknown) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, 'bad_request', details);
export const unauthorized = (msg = 'Log in to continue.') => new HttpError(401, msg, 'unauthorized');
export const forbidden = (msg = 'You do not have access to this.') => new HttpError(403, msg, 'forbidden');
export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found.`, 'not_found');
export const conflict = (msg: string) => new HttpError(409, msg, 'conflict');

/** Parses `data` with a zod schema, turning validation failures into a 400 with field messages. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
    throw badRequest(Object.values(fields)[0] ?? 'Invalid request.', fields);
  }
  return r.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'bad_request', message: err.issues[0]?.message ?? 'Invalid request.' } });
    return;
  }
  const e = err as { type?: string; status?: number; message?: string; code?: string };
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_request', message: 'The request body is not valid JSON.' } });
    return;
  }
  // Postgres SQLSTATE: 23503 foreign key, 23514 check constraint, 23505 unique.
  if (e?.code === '23503' || e?.code === '23514') {
    res.status(400).json({ error: { code: 'bad_reference', message: 'One of the items you referenced does not exist (check category, province, materials or techniques).' } });
    return;
  }
  if (e?.code === '23505') {
    res.status(409).json({ error: { code: 'conflict', message: 'That already exists.' } });
    return;
  }
  if (e?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: { code: 'too_large', message: 'That file is too large. The limit is 8 MB.' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } });
}

// ——— money & ids ———
export const toKina = (toea: number) => Math.round(toea) / 100;
export const toToea = (kina: number) => Math.round(kina * 100);
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const json = <T>(s: string | null | undefined, fallback: T): T => { try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; } };
export const ms = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : undefined);
