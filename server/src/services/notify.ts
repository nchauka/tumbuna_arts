import { exec, type Runner } from '../db';
import { newId } from '../http';

export type NotificationInput = { kind: 'order' | 'activity' | 'verify' | 'payout'; title: string; body: string; link?: string };

/** Stores an in-app notification. Push delivery (Expo push tokens) hooks in here. */
export async function notify(userId: string | null | undefined, n: NotificationInput, runner?: Runner) {
  if (!userId) return;
  await exec(
    'INSERT INTO Notifications (Id, UserId, Kind, Title, Body, Link) VALUES (@id, @userId, @kind, @title, @body, @link)',
    { id: newId('n'), userId, kind: n.kind, title: n.title.slice(0, 200), body: n.body.slice(0, 500), link: n.link ?? null },
    runner,
  );
}

/** Sends a one-time code by SMS or email. No provider is configured yet, so codes are logged in development. */
export async function sendCode(destination: string, code: string) {
  if (process.env.NODE_ENV !== 'test') console.log(`[auth] reset code for ${destination}: ${code}`);
}
