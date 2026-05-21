import { statSync } from 'node:fs';
import { isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';
import { getDb } from '../db/client';
import { folders, queries, tags, templates } from '../db/schema';
import { env } from '../env';

export const statsRoute = new Hono();
statsRoute.use('*', requireSession);

statsRoute.get('/', async (c) => {
	const db = getDb();
	const [{ q }] = await db
		.select({ q: sql<number>`COUNT(*)` })
		.from(queries)
		.where(isNull(queries.deleted_at));
	const [{ f }] = await db
		.select({ f: sql<number>`COUNT(*)` })
		.from(folders)
		.where(isNull(folders.deleted_at));
	const [{ t }] = await db.select({ t: sql<number>`COUNT(*)` }).from(tags);
	const [{ tp }] = await db.select({ tp: sql<number>`COUNT(*)` }).from(templates);
	let db_size_bytes = 0;
	try {
		db_size_bytes = statSync(env.DB_PATH).size;
	} catch {
		db_size_bytes = 0;
	}
	return c.json({ queries_count: q, folders_count: f, tags_count: t, templates_count: tp, db_size_bytes });
});
