import { app } from './app';
import { bootstrap } from './db/bootstrap';
import { env } from './env';

await bootstrap();

export default { port: env.PORT, fetch: app.fetch };
