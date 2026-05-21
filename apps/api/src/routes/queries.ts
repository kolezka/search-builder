import { engineKeySchema, queryCreateSchema, queryUpdateSchema } from '@search-builder/types';
import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';
import {
  createQuery,
  duplicateQuery,
  getQuery,
  hardDeleteQuery,
  listQueries,
  restoreQuery,
  softDeleteQuery,
  touchQuery,
  updateQuery,
} from '../repos/queries-repo';

export const queriesRoute = new Hono();
queriesRoute.use('*', requireSession);

queriesRoute.get('/', async (c) => {
  const folderParam = c.req.query('folder');
  const folder = folderParam === undefined ? undefined : folderParam === 'null' ? null : folderParam;
  const engineParam = c.req.query('engine');
  const engine = engineParam ? engineKeySchema.parse(engineParam) : undefined;
  return c.json(
    await listQueries({
      folder,
      tag: c.req.query('tag') ?? undefined,
      engine,
      search: c.req.query('search') ?? undefined,
      sort: (c.req.query('sort') as 'last_opened' | 'name' | 'updated' | undefined) ?? 'last_opened',
      include_deleted: c.req.query('include_deleted') === 'true',
    }),
  );
});

queriesRoute.get('/:id', async (c) => {
  const q = await getQuery(c.req.param('id'));
  return q ? c.json(q) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

queriesRoute.post('/', async (c) => {
  const body = queryCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  try {
    return c.json(await createQuery(body.data), 201);
  } catch (e) {
    const issues = (e as { issues?: unknown }).issues;
    if (issues) return c.json({ error: 'invalid tree', code: 'invalid_tree', issues }, 400);
    throw e;
  }
});

queriesRoute.patch('/:id', async (c) => {
  const body = queryUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  try {
    const ok = await updateQuery(c.req.param('id'), body.data);
    return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
  } catch (e) {
    const issues = (e as { issues?: unknown }).issues;
    if (issues) return c.json({ error: 'invalid tree', code: 'invalid_tree', issues }, 400);
    throw e;
  }
});

queriesRoute.delete('/:id', async (c) => {
  const hard = c.req.query('hard') === 'true';
  const ok = hard ? await hardDeleteQuery(c.req.param('id')) : await softDeleteQuery(c.req.param('id'));
  return ok ? c.body(null, 204) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

queriesRoute.post('/:id/restore', async (c) => {
  const ok = await restoreQuery(c.req.param('id'));
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

queriesRoute.post('/:id/touch', async (c) => {
  await touchQuery(c.req.param('id'));
  return c.body(null, 204);
});

queriesRoute.post('/:id/duplicate', async (c) => {
  const out = await duplicateQuery(c.req.param('id'));
  return out ? c.json(out, 201) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
