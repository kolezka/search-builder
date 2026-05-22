import { bootstrap } from '@search-builder/api';

// Migrations run via the entrypoint (`bun apps/api/src/db/migrate.ts`)
// before this process starts; bootstrap seeds the password hash on
// first boot. In dev the separate `bun run dev:api` process owns boot,
// so we only run it in production.
if (process.env.NODE_ENV === 'production') {
  await bootstrap();
}
