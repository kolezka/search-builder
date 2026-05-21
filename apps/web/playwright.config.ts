import { defineConfig } from '@playwright/test';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://search_builder:search_builder@localhost:5432/search_builder';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `cd ../api && env DATABASE_URL='${DATABASE_URL}' INITIAL_PASSWORD=e2e COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 sh -c 'bun src/db/migrate.ts && exec bun src/server.ts'`,
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'API_ORIGIN=http://localhost:3001 bun run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
