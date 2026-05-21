import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { TEST_DB_URL, cleanupDb, freshDb } from './setup';

process.env.DATABASE_URL = TEST_DB_URL;
process.env.INITIAL_PASSWORD = 'pw';
process.env.COOKIE_SECURE = 'false';

let app: { fetch: (req: Request) => Promise<Response> };
let cookie = '';

beforeAll(async () => {
	await freshDb();
	const boot = await import(`../src/db/bootstrap.ts?t=${Date.now()}`);
	await boot.bootstrap();
	const mod = await import(`../src/server.ts?t=${Date.now()}`);
	app = mod.default;

	const res = await app.fetch(
		new Request('http://localhost/api/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ password: 'pw' }),
		}),
	);
	cookie = res.headers.get('set-cookie')!.split(';')[0];
});

afterAll(() => cleanupDb());

async function api(path: string, init: RequestInit = {}) {
	return app.fetch(
		new Request(`http://localhost${path}`, {
			...init,
			headers: { 'content-type': 'application/json', cookie, ...(init.headers as Record<string, string>) },
		}),
	);
}

describe('integration', () => {
	test('login required without cookie', async () => {
		const res = await app.fetch(new Request('http://localhost/api/queries'));
		expect(res.status).toBe(401);
	});

	test('engines list contains all three', async () => {
		const list = (await (await api('/api/engines')).json()) as { key: string }[];
		expect(list.map((e) => e.key).sort()).toEqual(['github', 'google', 'shodan']);
	});

	test('templates seeded', async () => {
		const list = (await (await api('/api/templates')).json()) as unknown[];
		expect(list.length).toBeGreaterThanOrEqual(10);
	});

	test('CRUD folder + query + tags + soft delete + restore', async () => {
		const folder = await (
			await api('/api/folders', { method: 'POST', body: JSON.stringify({ name: 'recon' }) })
		).json();
		expect(typeof folder.id).toBe('string');

		const tree = {
			type: 'group',
			op: 'AND',
			children: [{ type: 'operator', key: 'site', value: 'example.com' }],
		};
		const q = await (
			await api('/api/queries', {
				method: 'POST',
				body: JSON.stringify({
					name: 'q1',
					engine: 'google',
					tree,
					folder_id: folder.id,
					tags: ['★pinned', 'recon'],
				}),
			})
		).json();

		const full = await (await api(`/api/queries/${q.id}`)).json();
		expect(full.tags).toContain('★pinned');
		expect(full.tree).toEqual(tree);

		const delRes = await api(`/api/queries/${q.id}`, { method: 'DELETE' });
		expect(delRes.status).toBe(204);

		const after = (await (await api('/api/queries')).json()) as { id: string }[];
		expect(after.find((x) => x.id === q.id)).toBeUndefined();

		const withDeleted = (await (await api('/api/queries?include_deleted=true')).json()) as { id: string }[];
		expect(withDeleted.find((x) => x.id === q.id)).toBeDefined();

		const restore = await api(`/api/queries/${q.id}/restore`, { method: 'POST' });
		expect(restore.status).toBe(200);
	});

	test('invalid operator key rejected', async () => {
		const tree = {
			type: 'group',
			op: 'AND',
			children: [{ type: 'operator', key: 'nonsense', value: 'x' }],
		};
		const res = await api('/api/queries', {
			method: 'POST',
			body: JSON.stringify({ name: 'bad', engine: 'google', tree }),
		});
		expect(res.status).toBe(400);
		expect((await res.json()).code).toBe('invalid_tree');
	});

	test('duplicate produces "(copy)" suffix', async () => {
		const tree = { type: 'group', op: 'AND', children: [{ type: 'term', value: 'hello' }] };
		const q = await (
			await api('/api/queries', {
				method: 'POST',
				body: JSON.stringify({ name: 'orig', engine: 'google', tree }),
			})
		).json();
		const dup = await (await api(`/api/queries/${q.id}/duplicate`, { method: 'POST' })).json();
		const full = await (await api(`/api/queries/${dup.id}`)).json();
		expect(full.name).toBe('orig (copy)');
	});

	test('instantiate template creates query', async () => {
		const tpls = (await (await api('/api/templates')).json()) as { id: string }[];
		const res = await api(`/api/templates/${tpls[0].id}/instantiate`, { method: 'POST', body: '{}' });
		expect(res.status).toBe(201);
	});

	test('stats endpoint returns counts', async () => {
		const stats = await (await api('/api/stats')).json();
		expect(stats.templates_count).toBeGreaterThanOrEqual(10);
		expect(stats.queries_count).toBeGreaterThanOrEqual(1);
	});
});
