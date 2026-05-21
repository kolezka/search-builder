import { folderCreateSchema, folderUpdateSchema } from '@search-builder/types';
import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';
import {
  createFolder,
  listFolders,
  restoreFolder,
  softDeleteFolder,
  updateFolder,
} from '../repos/folders-repo';

export const foldersRoute = new Hono();
foldersRoute.use('*', requireSession);

foldersRoute.get('/', async (c) => c.json(await listFolders()));

foldersRoute.post('/', async (c) => {
  const body = folderCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  return c.json(await createFolder(body.data), 201);
});

foldersRoute.patch('/:id', async (c) => {
  const body = folderUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  const ok = await updateFolder(c.req.param('id'), body.data);
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

foldersRoute.delete('/:id', async (c) => {
  const ok = await softDeleteFolder(c.req.param('id'));
  return ok ? c.body(null, 204) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

foldersRoute.post('/:id/restore', async (c) => {
  const ok = await restoreFolder(c.req.param('id'));
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
