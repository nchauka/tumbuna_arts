import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { config } from '../config';

export const UPLOAD_DIR = path.resolve('uploads');
const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' };
export const ALLOWED_TYPES = Object.keys(EXT);

let bucketReady: Promise<void> | null = null;

/** Creates the public bucket on first use; an existing bucket is fine. */
function ensureBucket() {
  const { url, serviceRoleKey, bucket } = config.supabase;
  bucketReady ??= fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, allowed_mime_types: ALLOWED_TYPES }),
  }).then(async (r) => {
    const text = await r.text();
    if (!r.ok && !/already exists|Duplicate/i.test(text)) throw new Error(`Could not create storage bucket ${bucket}: ${r.status} ${text}`);
  }).catch((e) => { bucketReady = null; throw e; });
  return bucketReady;
}

/**
 * Stores an uploaded image and returns its public URL. Uses Supabase Storage when SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are set, otherwise the local ./uploads folder served at /uploads.
 */
export async function storeImage(buffer: Buffer, mime: string, folder: string) {
  const name = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}${EXT[mime] ?? '.bin'}`;
  const { url, serviceRoleKey, bucket } = config.supabase;
  if (url && serviceRoleKey) {
    await ensureBucket();
    const r = await fetch(`${url}/storage/v1/object/${bucket}/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, 'Content-Type': mime, 'Cache-Control': 'max-age=31536000' },
      body: new Uint8Array(buffer),
    });
    if (!r.ok) throw new Error(`Supabase Storage upload failed: ${r.status} ${await r.text()}`);
    return `${url}/storage/v1/object/public/${bucket}/${name}`;
  }
  const file = path.join(UPLOAD_DIR, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  return `${config.publicUrl}/uploads/${name}`;
}
