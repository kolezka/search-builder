import { randomUUID } from 'node:crypto';
import { validateTree } from '@search-builder/engines';
import type { EngineKey, QueryCreate, QueryFullDto, QueryListDto, QueryUpdate } from '@search-builder/types';
import { engineKeySchema } from '@search-builder/types';
import { and, asc, desc, eq, inArray, isNull, like, or } from 'drizzle-orm';
import { getDb } from '../db/client';
import { queries, queryTags, tags } from '../db/schema';
import { getTagsForQuery, setQueryTags } from './tags-repo';

type ListFilter = {
  folder?: string | null;
  tag?: string;
  engine?: EngineKey;
  search?: string;
  sort?: 'last_opened' | 'name' | 'updated';
  include_deleted?: boolean;
};

export async function listQueries(filter: ListFilter): Promise<QueryListDto[]> {
  const db = getDb();
  const conds: unknown[] = [];
  if (!filter.include_deleted) conds.push(isNull(queries.deleted_at));
  if (filter.folder !== undefined) {
    conds.push(filter.folder === null ? isNull(queries.folder_id) : eq(queries.folder_id, filter.folder));
  }
  if (filter.engine) conds.push(eq(queries.engine, filter.engine));
  if (filter.search) {
    const like_ = `%${filter.search}%`;
    conds.push(or(like(queries.name, like_), like(queries.description, like_)));
  }

  let tagId: string | null = null;
  if (filter.tag) {
    const [tagRow] = await db.select().from(tags).where(eq(tags.name, filter.tag)).limit(1);
    if (!tagRow) return [];
    tagId = tagRow.id;
  }

  const sortClause =
    filter.sort === 'name'
      ? asc(queries.name)
      : filter.sort === 'updated'
        ? desc(queries.updated_at)
        : desc(queries.last_opened_at);

  const baseRows = await db
    .select()
    .from(queries)
    .where(and(...(conds as Parameters<typeof and>)))
    .orderBy(sortClause);

  let filtered = baseRows;
  if (tagId) {
    const joined = await db
      .select({ query_id: queryTags.query_id })
      .from(queryTags)
      .where(eq(queryTags.tag_id, tagId));
    const allowed = new Set(joined.map((j) => j.query_id));
    filtered = baseRows.filter((r) => allowed.has(r.id));
  }

  const ids = filtered.map((r) => r.id);
  const tagRows = ids.length
    ? await db
        .select({ query_id: queryTags.query_id, name: tags.name })
        .from(queryTags)
        .innerJoin(tags, eq(tags.id, queryTags.tag_id))
        .where(inArray(queryTags.query_id, ids))
    : [];
  const tagsByQuery = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagsByQuery.get(t.query_id) ?? [];
    arr.push(t.name);
    tagsByQuery.set(t.query_id, arr);
  }

  return filtered.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    engine: r.engine as EngineKey,
    folder_id: r.folder_id,
    tags: tagsByQuery.get(r.id) ?? [],
    updated_at: r.updated_at,
    last_opened_at: r.last_opened_at,
  }));
}

export async function getQuery(id: string): Promise<QueryFullDto | null> {
  const [row] = await getDb().select().from(queries).where(eq(queries.id, id)).limit(1);
  if (!row) return null;
  const tagNames = await getTagsForQuery(id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    engine: row.engine as EngineKey,
    folder_id: row.folder_id,
    template_id: row.template_id,
    tree: JSON.parse(row.tree),
    tags: tagNames,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_opened_at: row.last_opened_at,
  };
}

export async function createQuery(input: QueryCreate): Promise<{ id: string }> {
  engineKeySchema.parse(input.engine);
  const errors = validateTree(input.engine, input.tree);
  if (errors.length) throw Object.assign(new Error('invalid_tree'), { issues: errors });
  const id = randomUUID();
  const now = Date.now();
  await getDb()
    .insert(queries)
    .values({
      id,
      name: input.name,
      description: input.description ?? null,
      engine: input.engine,
      tree: JSON.stringify(input.tree),
      folder_id: input.folder_id ?? null,
      template_id: input.template_id ?? null,
      created_at: now,
      updated_at: now,
      last_opened_at: null,
    });
  await setQueryTags(id, input.tags ?? []);
  return { id };
}

export async function updateQuery(id: string, patch: QueryUpdate): Promise<boolean> {
  const [existing] = await getDb().select().from(queries).where(eq(queries.id, id)).limit(1);
  if (!existing || existing.deleted_at) return false;
  if (patch.tree) {
    const engine = (patch.engine ?? existing.engine) as EngineKey;
    const errors = validateTree(engine, patch.tree);
    if (errors.length) throw Object.assign(new Error('invalid_tree'), { issues: errors });
  }
  const updates: Record<string, unknown> = { updated_at: Date.now() };
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.engine !== undefined) updates.engine = patch.engine;
  if (patch.tree !== undefined) updates.tree = JSON.stringify(patch.tree);
  if (patch.folder_id !== undefined) updates.folder_id = patch.folder_id;
  if (patch.template_id !== undefined) updates.template_id = patch.template_id;
  await getDb().update(queries).set(updates).where(eq(queries.id, id));
  if (patch.tags !== undefined) await setQueryTags(id, patch.tags);
  return true;
}

export async function softDeleteQuery(id: string): Promise<boolean> {
  const res = await getDb()
    .update(queries)
    .set({ deleted_at: Date.now() })
    .where(and(eq(queries.id, id), isNull(queries.deleted_at)))
    .returning({ id: queries.id });
  return res.length > 0;
}

export async function restoreQuery(id: string): Promise<boolean> {
  const res = await getDb()
    .update(queries)
    .set({ deleted_at: null })
    .where(eq(queries.id, id))
    .returning({ id: queries.id });
  return res.length > 0;
}

export async function hardDeleteQuery(id: string): Promise<boolean> {
  const db = getDb();
  await db.delete(queryTags).where(eq(queryTags.query_id, id));
  const res = await db.delete(queries).where(eq(queries.id, id)).returning({ id: queries.id });
  return res.length > 0;
}

export async function touchQuery(id: string): Promise<void> {
  await getDb().update(queries).set({ last_opened_at: Date.now() }).where(eq(queries.id, id));
}

export async function duplicateQuery(id: string): Promise<{ id: string } | null> {
  const full = await getQuery(id);
  if (!full) return null;
  return createQuery({
    name: `${full.name} (copy)`,
    description: full.description ?? undefined,
    engine: full.engine,
    tree: full.tree,
    folder_id: full.folder_id,
    tags: full.tags,
    template_id: full.template_id ?? undefined,
  });
}
