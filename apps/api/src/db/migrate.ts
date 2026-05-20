import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { getDb } from './client';

migrate(getDb(), { migrationsFolder: './src/db/migrations' });
console.log('Migrations applied');
process.exit(0);
