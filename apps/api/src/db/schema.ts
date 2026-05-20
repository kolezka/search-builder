import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const folders = sqliteTable(
  'folders',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    color: text('color'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (t) => ({ idxDeleted: index('idx_folders_deleted').on(t.deleted_at) }),
);

export const queries = sqliteTable(
  'queries',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    engine: text('engine').notNull(),
    tree: text('tree').notNull(),
    folder_id: text('folder_id'),
    template_id: text('template_id'),
    created_at: integer('created_at').notNull(),
    updated_at: integer('updated_at').notNull(),
    last_opened_at: integer('last_opened_at'),
    deleted_at: integer('deleted_at'),
  },
  (t) => ({
    idxFolder: index('idx_queries_folder').on(t.folder_id),
    idxEngine: index('idx_queries_engine').on(t.engine),
    idxDeleted: index('idx_queries_deleted').on(t.deleted_at),
    idxLastOpened: index('idx_queries_last_opened').on(t.last_opened_at),
  }),
);

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const queryTags = sqliteTable(
  'query_tags',
  {
    query_id: text('query_id').notNull(),
    tag_id: text('tag_id').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.query_id, t.tag_id] }) }),
);

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  engine: text('engine').notNull(),
  tree: text('tree').notNull(),
  category: text('category'),
  created_at: integer('created_at').notNull(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    created_at: integer('created_at').notNull(),
    expires_at: integer('expires_at').notNull(),
  },
  (t) => ({ idxExpires: index('idx_sessions_expires').on(t.expires_at) }),
);

export const appConfig = sqliteTable('app_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
