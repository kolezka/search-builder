import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';
import { deleteTag, listTags } from '../repos/tags-repo';

export const tagsRoute = new Hono();
tagsRoute.use('*', requireSession);

tagsRoute.get('/', async (c) => c.json(await listTags()));

tagsRoute.delete('/:id', async (c) => {
  const ok = await deleteTag(c.req.param('id'));
  return ok ? c.body(null, 204) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
