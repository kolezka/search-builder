import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export const TEST_DB_URL =
	process.env.TEST_DATABASE_URL ?? 'postgres://search_builder:search_builder@localhost:5432/search_builder_test';

export async function freshDb(): Promise<void> {
	// Connect to admin db to drop and recreate
	const adminUrl = TEST_DB_URL.replace(/\/[^/]+$/, '/postgres');
	const dbName = TEST_DB_URL.split('/').pop()!;
	const admin = postgres(adminUrl, { max: 1 });
	await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`);
	await admin.unsafe(`CREATE DATABASE "${dbName}"`);
	await admin.end();

	const client = postgres(TEST_DB_URL, { max: 1 });
	const db = drizzle(client);
	await migrate(db, { migrationsFolder: './src/db/migrations' });
	await client.end();
}

export async function cleanupDb(): Promise<void> {
	// No-op — DB stays for inspection between runs; freshDb drops it next time
}
