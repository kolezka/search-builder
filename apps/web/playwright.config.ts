import { defineConfig } from '@playwright/test';

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
      command:
        'cd ../api && INITIAL_PASSWORD=e2e DB_PATH=./data/e2e.sqlite COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 bun src/db/migrate.ts && INITIAL_PASSWORD=e2e DB_PATH=./data/e2e.sqlite COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 bun src/server.ts',
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
