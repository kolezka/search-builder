import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { appConfig } from '../db/schema';

export async function getPasswordHash(): Promise<string> {
	const [row] = await getDb().select().from(appConfig).where(eq(appConfig.key, 'password_hash')).limit(1);
	if (!row) throw new Error('password_hash missing');
	return row.value;
}

export async function setPasswordHash(plain: string): Promise<void> {
	const hash = await bcrypt.hash(plain, 12);
	await getDb().update(appConfig).set({ value: hash }).where(eq(appConfig.key, 'password_hash'));
}

export async function verifyPassword(plain: string): Promise<boolean> {
	return bcrypt.compare(plain, await getPasswordHash());
}
