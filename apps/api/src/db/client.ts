import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database | null = null;

export function getDb() {
  if (_db) return _db;
  mkdirSync(dirname(env.DB_PATH), { recursive: true });
  _sqlite = new Database(env.DB_PATH);
  _sqlite.run('PRAGMA journal_mode = WAL');
  _sqlite.run('PRAGMA foreign_keys = ON');
  _sqlite.run('PRAGMA busy_timeout = 5000');
  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function closeDb(): void {
  _sqlite?.close();
  _sqlite = null;
  _db = null;
}

export type DB = ReturnType<typeof getDb>;
