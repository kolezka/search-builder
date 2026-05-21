import { pgTable, text, bigint, primaryKey, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const folders = pgTable(
	'folders',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		color: text('color'),
		created_at: bigint('created_at', { mode: 'number' }).notNull(),
		updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
		deleted_at: bigint('deleted_at', { mode: 'number' }),
	},
	(t) => ({ idxDeleted: index('idx_folders_deleted').on(t.deleted_at) }),
);

export const queries = pgTable(
	'queries',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		engine: text('engine').notNull(),
		tree: text('tree').notNull(),
		folder_id: text('folder_id'),
		template_id: text('template_id'),
		created_at: bigint('created_at', { mode: 'number' }).notNull(),
		updated_at: bigint('updated_at', { mode: 'number' }).notNull(),
		last_opened_at: bigint('last_opened_at', { mode: 'number' }),
		deleted_at: bigint('deleted_at', { mode: 'number' }),
	},
	(t) => ({
		idxFolder: index('idx_queries_folder').on(t.folder_id),
		idxEngine: index('idx_queries_engine').on(t.engine),
		idxDeleted: index('idx_queries_deleted').on(t.deleted_at),
		idxLastOpened: index('idx_queries_last_opened').on(t.last_opened_at),
	}),
);

export const tags = pgTable(
	'tags',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
	},
	(t) => ({ uniqName: uniqueIndex('uniq_tags_name').on(t.name) }),
);

export const queryTags = pgTable(
	'query_tags',
	{
		query_id: text('query_id').notNull(),
		tag_id: text('tag_id').notNull(),
	},
	(t) => ({ pk: primaryKey({ columns: [t.query_id, t.tag_id] }) }),
);

export const templates = pgTable('templates', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	engine: text('engine').notNull(),
	tree: text('tree').notNull(),
	category: text('category'),
	created_at: bigint('created_at', { mode: 'number' }).notNull(),
});

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		created_at: bigint('created_at', { mode: 'number' }).notNull(),
		expires_at: bigint('expires_at', { mode: 'number' }).notNull(),
	},
	(t) => ({ idxExpires: index('idx_sessions_expires').on(t.expires_at) }),
);

export const appConfig = pgTable('app_config', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
});
