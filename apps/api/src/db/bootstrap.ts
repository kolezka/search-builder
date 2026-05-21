import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { env } from '../env';
import { getDb } from './client';
import { appConfig } from './schema';
import { seedTemplates } from './seed-templates';

export async function bootstrap(): Promise<void> {
	const db = getDb();
	const existing = await db.select().from(appConfig).where(eq(appConfig.key, 'password_hash')).get();
	if (existing) return;
	if (!env.INITIAL_PASSWORD) {
		throw new Error('password_hash missing and INITIAL_PASSWORD not set — cannot boot');
	}
	const hash = await bcrypt.hash(env.INITIAL_PASSWORD, 12);
	const now = Date.now();
	await db.insert(appConfig).values([
		{ key: 'password_hash', value: hash },
		{ key: 'first_boot_at', value: String(now) },
		{ key: 'schema_version', value: '1' },
	]);
	console.log('[boot] initial password hash seeded');
	await seedTemplates();
}
