import { randomUUID } from 'node:crypto';
import type { TagDto } from '@search-builder/types';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { queryTags, tags } from '../db/schema';

export async function listTags(): Promise<TagDto[]> {
  const rows = await getDb()
    .select({
      id: tags.id,
      name: tags.name,
      usage_count: sql<string>`(SELECT COUNT(*) FROM ${queryTags} WHERE ${queryTags.tag_id} = ${tags.id})`,
    })
    .from(tags)
    .orderBy(desc(sql`usage_count`), tags.name);
  return rows.map((r) => ({ ...r, usage_count: Number(r.usage_count) }));
}

export async function deleteTag(id: string): Promise<boolean> {
  const db = getDb();
  await db.delete(queryTags).where(eq(queryTags.tag_id, id));
  const res = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
  return res.length > 0;
}

export async function ensureTagsByName(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const db = getDb();
  const existing = await db.select().from(tags).where(inArray(tags.name, names));
  const map = new Map(existing.map((r) => [r.name, r.id]));
  const toInsert = names.filter((n) => !map.has(n));
  if (toInsert.length > 0) {
    const rows = toInsert.map((name) => ({ id: randomUUID(), name }));
    await db.insert(tags).values(rows);
    for (const r of rows) map.set(r.name, r.id);
  }
  return names.map((n) => map.get(n)!);
}

export async function setQueryTags(query_id: string, names: string[]): Promise<void> {
  const db = getDb();
  await db.delete(queryTags).where(eq(queryTags.query_id, query_id));
  if (names.length === 0) return;
  const ids = await ensureTagsByName(names);
  await db.insert(queryTags).values(ids.map((tag_id) => ({ query_id, tag_id })));
}

export async function getTagsForQuery(query_id: string): Promise<string[]> {
  const rows = await getDb()
    .select({ name: tags.name })
    .from(queryTags)
    .innerJoin(tags, eq(tags.id, queryTags.tag_id))
    .where(eq(queryTags.query_id, query_id));
  return rows.map((r) => r.name);
}
