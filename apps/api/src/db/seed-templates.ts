import { randomUUID } from 'node:crypto';
import type { QueryNode } from '@search-builder/types';
import { sql } from 'drizzle-orm';
import { getDb } from './client';
import { templates } from './schema';

type Seed = {
  name: string;
  description: string;
  engine: 'google' | 'github' | 'shodan';
  category: string;
  tree: QueryNode;
};

const G = (children: QueryNode[], op: 'AND' | 'OR' = 'AND'): QueryNode => ({ type: 'group', op, children });
const OP = (key: string, value: string, negated = false): QueryNode => ({
  type: 'operator',
  key,
  value,
  negated,
});
const T = (value: string, opts: { exactMatch?: boolean; negated?: boolean } = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});

const SEEDS: Seed[] = [
  {
    name: 'Exposed .env files',
    description: 'Files containing common env-style secret keys',
    engine: 'google',
    category: 'secrets',
    tree: G([OP('filetype', 'env'), OP('intext', 'DB_PASSWORD')]),
  },
  {
    name: 'Open directory listings',
    description: 'Apache/Nginx default index pages',
    engine: 'google',
    category: 'recon',
    tree: G([OP('intitle', 'index of /'), OP('inurl', 'html', true)]),
  },
  {
    name: 'Login pages on subdomains',
    description: 'Replace example.com with target',
    engine: 'google',
    category: 'recon',
    tree: G([G([OP('intitle', 'login'), OP('intitle', 'sign in')], 'OR'), OP('site', '*.example.com')]),
  },
  {
    name: 'Leaked AWS keys',
    description: 'AWS access key prefix in code',
    engine: 'github',
    category: 'secrets',
    tree: G([T('AKIA'), OP('in', 'file')]),
  },
  {
    name: 'Hardcoded passwords in code',
    description: 'password assignments in scripts',
    engine: 'github',
    category: 'secrets',
    tree: G([T('password='), OP('language', 'javascript')]),
  },
  {
    name: 'Repos with .env in path',
    description: 'Source trees that ship .env',
    engine: 'github',
    category: 'secrets',
    tree: G([OP('path', '.env')]),
  },
  {
    name: 'Open RDP servers in Poland',
    description: 'Port 3389 exposed in PL',
    engine: 'shodan',
    category: 'exposed-svc',
    tree: G([OP('port', '3389'), OP('country', 'PL')]),
  },
  {
    name: 'Unauthenticated MongoDB',
    description: 'Mongo without auth',
    engine: 'shodan',
    category: 'exposed-svc',
    tree: G([OP('product', 'MongoDB'), T('authentication', { negated: true })]),
  },
  {
    name: 'ICS/SCADA exposed (Modbus/S7)',
    description: 'Industrial controllers with screenshots',
    engine: 'shodan',
    category: 'exposed-svc',
    tree: G([G([OP('port', '502'), OP('port', '102')], 'OR'), OP('has_screenshot', 'true')]),
  },
  {
    name: 'Outdated Apache 2.2',
    description: 'Apache 2.2 still online',
    engine: 'shodan',
    category: 'vuln',
    tree: G([OP('product', 'Apache'), OP('version', '2.2')]),
  },
];

export async function seedTemplates(): Promise<void> {
  const db = getDb();
  const [{ c }] = await db.select({ c: sql<string>`COUNT(*)` }).from(templates);
  if (Number(c) > 0) return;
  const now = Date.now();
  await db.insert(templates).values(
    SEEDS.map((s) => ({
      id: randomUUID(),
      name: s.name,
      description: s.description,
      engine: s.engine,
      tree: JSON.stringify(s.tree),
      category: s.category,
      created_at: now,
    })),
  );
}

if (import.meta.main) {
  await seedTemplates();
  process.exit(0);
}
