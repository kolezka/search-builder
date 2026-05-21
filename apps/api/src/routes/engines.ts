import { listEngines } from '@search-builder/engines';
import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';

export const enginesRoute = new Hono();
enginesRoute.use('*', requireSession);

enginesRoute.get('/', (c) =>
  c.json(
    listEngines().map((e) => ({
      key: e.key,
      name: e.name,
      icon: e.icon,
      baseUrl: e.baseUrl,
      queryParam: e.queryParam,
      operators: e.operators,
    })),
  ),
);
