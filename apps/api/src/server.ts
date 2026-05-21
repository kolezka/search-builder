import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bootstrap } from './db/bootstrap';
import { env } from './env';
import { authRoute } from './routes/auth';
import { foldersRoute } from './routes/folders';
import { healthRoute } from './routes/health';
import { queriesRoute } from './routes/queries';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: env.ALLOWED_ORIGIN, credentials: true }));

app.route('/api/health', healthRoute);
app.route('/api/auth', authRoute);
app.route('/api/folders', foldersRoute);
app.route('/api/queries', queriesRoute);

app.notFound((c) => c.json({ error: 'not_found', code: 'not_found' }, 404));
app.onError((err, c) => {
	console.error(err);
	return c.json({ error: 'server_error', code: 'server_error' }, 500);
});

await bootstrap();

console.log(`[api] listening on http://localhost:${env.PORT}`);

export default { port: env.PORT, fetch: app.fetch };
