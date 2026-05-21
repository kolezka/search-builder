import { randomUUID } from 'node:crypto';
import type { FolderDto } from '@search-builder/types';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { folders, queries } from '../db/schema';

export async function listFolders(): Promise<FolderDto[]> {
  const rows = await getDb()
    .select({
      id: folders.id,
      name: folders.name,
      color: folders.color,
      query_count: sql<string>`(SELECT COUNT(*) FROM ${queries} WHERE ${queries.folder_id} = ${folders.id} AND ${queries.deleted_at} IS NULL)`,
    })
    .from(folders)
    .where(isNull(folders.deleted_at))
    .orderBy(folders.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color ?? null,
    query_count: Number(r.query_count),
  }));
}

export async function createFolder(input: { name: string; color?: string }): Promise<{ id: string }> {
  const id = randomUUID();
  const now = Date.now();
  await getDb()
    .insert(folders)
    .values({ id, name: input.name, color: input.color ?? null, created_at: now, updated_at: now });
  return { id };
}

export async function updateFolder(
  id: string,
  patch: Partial<{ name: string; color: string }>,
): Promise<boolean> {
  const res = await getDb()
    .update(folders)
    .set({ ...patch, updated_at: Date.now() })
    .where(and(eq(folders.id, id), isNull(folders.deleted_at)))
    .returning({ id: folders.id });
  return res.length > 0;
}

export async function softDeleteFolder(id: string): Promise<boolean> {
  const res = await getDb()
    .update(folders)
    .set({ deleted_at: Date.now() })
    .where(and(eq(folders.id, id), isNull(folders.deleted_at)))
    .returning({ id: folders.id });
  return res.length > 0;
}

export async function restoreFolder(id: string): Promise<boolean> {
  const res = await getDb()
    .update(folders)
    .set({ deleted_at: null })
    .where(eq(folders.id, id))
    .returning({ id: folders.id });
  return res.length > 0;
}
