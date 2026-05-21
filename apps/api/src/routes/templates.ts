import { Hono } from 'hono';
import { z } from 'zod';
import { requireSession } from '../auth/middleware';
import { instantiateTemplate, listTemplates } from '../repos/templates-repo';

const instantiateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  folder_id: z.string().uuid().nullable().optional(),
});

export const templatesRoute = new Hono();
templatesRoute.use('*', requireSession);

templatesRoute.get('/', async (c) => c.json(await listTemplates()));

templatesRoute.post('/:id/instantiate', async (c) => {
  const body = instantiateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  const out = await instantiateTemplate(c.req.param('id'), body.data);
  return out ? c.json(out, 201) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
