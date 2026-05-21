import type { EngineKey, QueryNode } from '@search-builder/types';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { templates } from '../db/schema';
import { createQuery } from './queries-repo';

export async function listTemplates() {
	const rows = await getDb().select().from(templates).orderBy(templates.engine, templates.name);
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		description: r.description,
		engine: r.engine as EngineKey,
		category: r.category,
		tree: JSON.parse(r.tree) as QueryNode,
	}));
}

export async function instantiateTemplate(
	id: string,
	opts: { name?: string; folder_id?: string | null },
): Promise<{ id: string } | null> {
	const row = await getDb().select().from(templates).where(eq(templates.id, id)).get();
	if (!row) return null;
	return createQuery({
		name: opts.name ?? row.name,
		description: row.description,
		engine: row.engine as EngineKey,
		tree: JSON.parse(row.tree) as QueryNode,
		folder_id: opts.folder_id ?? null,
		template_id: row.id,
	});
}
