import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { databaseUrl } from '../env';
import * as schema from './schema';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (_db) return _db;
	_client = postgres(databaseUrl(), { max: 10, prepare: false });
	_db = drizzle(_client, { schema });
	return _db;
}

export async function closeDb(): Promise<void> {
	if (_client) await _client.end();
	_client = null;
	_db = null;
}

export type DB = ReturnType<typeof getDb>;
