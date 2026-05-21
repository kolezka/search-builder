import { randomBytes } from 'node:crypto';
import { and, eq, gt, ne } from 'drizzle-orm';
import { getDb } from '../db/client';
import { sessions } from '../db/schema';
import { env } from '../env';

const TTL_MS = () => env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export async function createSession(): Promise<{ id: string; expires_at: number }> {
  const id = randomBytes(32).toString('hex');
  const now = Date.now();
  const expires_at = now + TTL_MS();
  await getDb().insert(sessions).values({ id, created_at: now, expires_at });
  return { id, expires_at };
}

export async function getValidSession(id: string): Promise<{ id: string; expires_at: number } | null> {
  const [row] = await getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expires_at, Date.now())))
    .limit(1);
  return row ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.id, id));
}

export async function deleteOtherSessions(keepId: string): Promise<void> {
  await getDb().delete(sessions).where(ne(sessions.id, keepId));
}
