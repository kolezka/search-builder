import type { Config } from 'drizzle-kit';
import { databaseUrl } from './src/env';

export default {
	schema: './src/db/schema.ts',
	out: './src/db/migrations',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl() },
} satisfies Config;
