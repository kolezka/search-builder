import { isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';
import { getDb } from '../db/client';
import { folders, queries, tags, templates } from '../db/schema';

export const statsRoute = new Hono();
statsRoute.use('*', requireSession);

statsRoute.get('/', async (c) => {
	const db = getDb();
	const [{ q }] = await db
		.select({ q: sql<string>`COUNT(*)` })
		.from(queries)
		.where(isNull(queries.deleted_at));
	const [{ f }] = await db
		.select({ f: sql<string>`COUNT(*)` })
		.from(folders)
		.where(isNull(folders.deleted_at));
	const [{ t }] = await db.select({ t: sql<string>`COUNT(*)` }).from(tags);
	const [{ tp }] = await db.select({ tp: sql<string>`COUNT(*)` }).from(templates);
	return c.json({
		queries_count: Number(q),
		folders_count: Number(f),
		tags_count: Number(t),
		templates_count: Number(tp),
		db_size_bytes: 0,
	});
});
