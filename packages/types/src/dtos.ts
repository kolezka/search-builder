import { z } from 'zod';
import { engineKeySchema, queryNodeSchema } from './query-tree';

export const folderCreateSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export const folderUpdateSchema = folderCreateSchema.partial();
export type FolderCreate = z.infer<typeof folderCreateSchema>;
export type FolderUpdate = z.infer<typeof folderUpdateSchema>;

export const queryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  engine: engineKeySchema,
  tree: queryNodeSchema,
  folder_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().min(1).max(60)).optional(),
  template_id: z.string().uuid().nullable().optional(),
});
export const queryUpdateSchema = queryCreateSchema.partial();
export type QueryCreate = z.infer<typeof queryCreateSchema>;
export type QueryUpdate = z.infer<typeof queryUpdateSchema>;

export const loginSchema = z.object({ password: z.string().min(1) });
export const changePasswordSchema = z.object({
  old: z.string().min(1),
  new: z.string().min(8).max(200),
});

export type FolderDto = {
  id: string;
  name: string;
  color: string | null;
  query_count: number;
};

export type QueryListDto = {
  id: string;
  name: string;
  description: string | null;
  engine: 'google' | 'github' | 'shodan';
  folder_id: string | null;
  tags: string[];
  updated_at: number;
  last_opened_at: number | null;
};

export type QueryFullDto = QueryListDto & {
  tree: import('./query-tree').QueryNode;
  description: string | null;
  created_at: number;
  template_id: string | null;
};

export type TagDto = { id: string; name: string; usage_count: number };

export type StatsDto = {
  queries_count: number;
  folders_count: number;
  tags_count: number;
  templates_count: number;
  db_size_bytes: number;
};
