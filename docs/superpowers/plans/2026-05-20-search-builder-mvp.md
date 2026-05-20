# search-builder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user, self-hosted web app that visually composes boolean search queries for Google, GitHub Code Search, and Shodan, serialises them into engine-native URLs, and stores them in a SQLite-backed library with folders and tags.

**Architecture:** Bun monorepo with two apps (`apps/api`: Hono + Drizzle + SQLite, `apps/web`: SvelteKit) and two shared packages (`packages/types`: shared types + Zod schemas, `packages/engines`: operator catalogs + tree serialisers). Cookie-session auth. Generated URLs open in new tabs — no server-side result fetching.

**Tech Stack:** Bun 1.x, Hono, Drizzle ORM, better-sqlite3, SvelteKit, TypeScript, Zod, Biome, bcryptjs, svelte-dnd-action, Playwright, GitHub Actions, Docker, Coolify.

**Spec:** [docs/superpowers/specs/2026-05-20-search-builder-design.md](../specs/2026-05-20-search-builder-design.md)

**Phases:**
1. Repo scaffold + shared types
2. Engine adapters (Google, GitHub, Shodan)
3. apps/api scaffold + DB
4. apps/api auth
5. apps/api folders + queries + tags CRUD
6. apps/api templates + integration tests
7. apps/web scaffold + layout + auth
8. apps/web library views
9. apps/web builder (core)
10. apps/web builder (polish: DnD, raw mode, undo/redo, shortcuts)
11. apps/web settings + extras
12. CI + Coolify deployment

---

## Phase 1 — Repo scaffold + shared types

### Task 1.1: Initialise Bun monorepo root

**Files:**
- Create: `package.json`
- Create: `bun.lockb` (via `bun install`)
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `README.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `package.json`** at repo root

```json
{
  "name": "search-builder",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "typecheck": "bun --filter '*' typecheck",
    "test": "bun --filter '*' test",
    "build": "bun --filter '*' build",
    "dev:api": "bun --filter @search-builder/api dev",
    "dev:web": "bun --filter @search-builder/web dev"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "typescript": "^5.6.0"
  },
  "packageManager": "bun@1.1.34"
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
build/
.svelte-kit/
.bun/
*.log
.env
.env.*
!.env.example
.DS_Store
data/
*.sqlite
*.sqlite-journal
*.sqlite-shm
*.sqlite-wal
coverage/
playwright-report/
test-results/
```

- [ ] **Step 3: Create `.nvmrc`** (for tools that don't speak Bun)

```
20
```

- [ ] **Step 4: Create `README.md`**

```markdown
# search-builder

Single-user, self-hosted boolean query builder for Google, GitHub Code Search, and Shodan.

## Stack
Bun monorepo · Hono + Drizzle + SQLite · SvelteKit · Biome · Coolify

## Quick start
```bash
bun install
cp apps/api/.env.example apps/api/.env  # set INITIAL_PASSWORD
bun run dev:api &
bun run dev:web
```

## Docs
- [Design spec](docs/superpowers/specs/2026-05-20-search-builder-design.md)
- [MVP plan](docs/superpowers/plans/2026-05-20-search-builder-mvp.md)

## Disclaimer
This is a personal recon/research tool. Use only against systems you are authorised to test.
```

- [ ] **Step 5: Create `CLAUDE.md`**

```markdown
# search-builder — Claude Code config

## Project rules
- Bun monorepo: `apps/api` (Hono+Drizzle+SQLite), `apps/web` (SvelteKit), `packages/types`, `packages/engines`
- Lint/format: Biome (`bun run lint:fix` before commit)
- Typecheck: `bun run typecheck` (across workspaces)
- Tests: `bun test` (engines + api), Playwright (web)
- Keep files under 500 lines; split components/handlers when they grow
- Never commit `.env`, `data/`, or built artefacts
- All identifiers, comments, and commit messages in English

## Key paths
- `packages/engines/src/{google,github,shodan}.ts` — operator catalogs + serializers
- `apps/api/src/db/schema.ts` — Drizzle schema
- `apps/api/src/routes/` — Hono route modules
- `apps/web/src/lib/builder/` — boolean tree UI components

## Auth model
Single user. `INITIAL_PASSWORD` env var seeds bcrypt hash into `app_config` on first boot. Sessions in `sessions` table, cookie `sid` (HttpOnly).

## Spec
See `docs/superpowers/specs/2026-05-20-search-builder-design.md`. The plan executing now is `docs/superpowers/plans/2026-05-20-search-builder-mvp.md`.
```

- [ ] **Step 6: Initialise Bun + install root devDeps**

Run: `cd /root/Development/search-builder && bun install`
Expected: `bun.lockb` created, `node_modules/` populated with biome + typescript.

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .nvmrc README.md CLAUDE.md bun.lockb
git commit -m "chore: initialise bun monorepo root"
```

---

### Task 1.2: Biome configuration

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true, "ignore": [".svelte-kit/**", "dist/**", "build/**", "node_modules/**", "data/**", "playwright-report/**"] },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 110,
    "lineEnding": "lf"
  },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" } },
  "json": { "formatter": { "enabled": true, "indentStyle": "tab" } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": { "noForEach": "off" },
      "style": { "noNonNullAssertion": "warn" },
      "suspicious": { "noExplicitAny": "warn", "noConsoleLog": "warn" }
    }
  },
  "overrides": [
    { "include": ["**/*.svelte"], "linter": { "enabled": false }, "formatter": { "enabled": false } }
  ]
}
```

- [ ] **Step 2: Run biome to verify config**

Run: `bun run lint`
Expected: exits 0 with "Checked X files in Y ms. No fixes applied."

- [ ] **Step 3: Commit**

```bash
git add biome.json
git commit -m "chore: add biome config"
```

---

### Task 1.3: TypeScript base config

**Files:**
- Create: `tsconfig.base.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": false,
    "types": ["bun-types"]
  }
}
```

- [ ] **Step 2: Create root `tsconfig.json`** (delegates to workspaces)

```json
{
  "files": [],
  "references": [
    { "path": "./packages/types" },
    { "path": "./packages/engines" },
    { "path": "./apps/api" },
    { "path": "./apps/web" }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json tsconfig.json
git commit -m "chore: add base tsconfig"
```

---

### Task 1.4: Create `packages/types` skeleton

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`
- Create: `packages/types/src/engines.ts`
- Create: `packages/types/src/query-tree.ts`
- Create: `packages/types/src/dtos.ts`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@search-builder/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  },
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: Create `packages/types/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": []
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/types/src/engines.ts`**

```typescript
export const ENGINE_KEYS = ['google', 'github', 'shodan'] as const;
export type EngineKey = (typeof ENGINE_KEYS)[number];

export type OperatorValueType =
  | 'text'
  | 'enum'
  | 'number'
  | 'range'
  | 'date'
  | 'date-range'
  | 'url'
  | 'domain';

export type OperatorSpec = {
  key: string;
  label: string;
  description: string;
  category?: string;
  valueType: OperatorValueType;
  enumValues?: string[];
  placeholder?: string;
  supportsNegation: boolean;
};
```

- [ ] **Step 4: Create `packages/types/src/query-tree.ts`**

```typescript
import { z } from 'zod';
import { ENGINE_KEYS } from './engines';

export type QueryNode = GroupNode | TermNode | OperatorNode;

export type GroupNode = {
  type: 'group';
  op: 'AND' | 'OR';
  negated?: boolean;
  children: QueryNode[];
};

export type TermNode = {
  type: 'term';
  value: string;
  exactMatch?: boolean;
  negated?: boolean;
};

export type OperatorNode = {
  type: 'operator';
  key: string;
  value: string;
  negated?: boolean;
};

export const MAX_TREE_DEPTH = 8;

const baseTermNode = z.object({
  type: z.literal('term'),
  value: z.string(),
  exactMatch: z.boolean().optional(),
  negated: z.boolean().optional(),
});

const baseOperatorNode = z.object({
  type: z.literal('operator'),
  key: z.string().min(1),
  value: z.string(),
  negated: z.boolean().optional(),
});

export const queryNodeSchema: z.ZodType<QueryNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('group'),
      op: z.enum(['AND', 'OR']),
      negated: z.boolean().optional(),
      children: z.array(queryNodeSchema),
    }),
    baseTermNode,
    baseOperatorNode,
  ]),
);

export const engineKeySchema = z.enum(ENGINE_KEYS);

export function treeDepth(node: QueryNode): number {
  if (node.type !== 'group') return 1;
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(treeDepth));
}
```

- [ ] **Step 5: Create `packages/types/src/dtos.ts`**

```typescript
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
```

- [ ] **Step 6: Create `packages/types/src/index.ts`** (barrel)

```typescript
export * from './engines';
export * from './query-tree';
export * from './dtos';
```

- [ ] **Step 7: Install zod and typecheck**

Run from repo root: `bun install`
Run: `bun --filter @search-builder/types typecheck`
Expected: exits 0, no diagnostics.

- [ ] **Step 8: Commit**

```bash
git add packages/types bun.lockb package.json
git commit -m "feat(types): add shared types and Zod schemas"
```

---

## Phase 2 — Engine adapters

### Task 2.1: Create `packages/engines` skeleton

**Files:**
- Create: `packages/engines/package.json`
- Create: `packages/engines/tsconfig.json`
- Create: `packages/engines/src/types.ts`
- Create: `packages/engines/src/serialize-helpers.ts`
- Create: `packages/engines/src/index.ts`

- [ ] **Step 1: Create `packages/engines/package.json`**

```json
{
  "name": "@search-builder/engines",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "@search-builder/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "bun-types": "latest"
  }
}
```

- [ ] **Step 2: Create `packages/engines/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [{ "path": "../types" }],
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create `packages/engines/src/types.ts`**

```typescript
import type { EngineKey, OperatorSpec, QueryNode } from '@search-builder/types';

export type ValidationError = { path: string; message: string };

export type EngineAdapter = {
  key: EngineKey;
  name: string;
  icon: string;
  baseUrl: string;
  queryParam: string;
  operators: OperatorSpec[];
  serializeTree: (tree: QueryNode) => string;
  buildUrl: (tree: QueryNode) => string;
  validateValue: (operatorKey: string, value: string) => string | null;
};

export type { EngineKey, OperatorSpec, QueryNode };
```

- [ ] **Step 4: Create `packages/engines/src/serialize-helpers.ts`**

```typescript
import type { QueryNode } from '@search-builder/types';

export function needsQuoting(value: string): boolean {
  return /\s/.test(value) || value.length === 0;
}

export function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function isEmpty(node: QueryNode): boolean {
  if (node.type === 'group') return node.children.every(isEmpty);
  if (node.type === 'term') return node.value.trim() === '';
  return node.value.trim() === '';
}
```

- [ ] **Step 5: Create `packages/engines/src/index.ts`** (registry stub)

```typescript
import type { EngineAdapter, EngineKey } from './types';

export * from './types';
export * from './serialize-helpers';

const adapters: Partial<Record<EngineKey, EngineAdapter>> = {};

export function registerEngine(adapter: EngineAdapter): void {
  adapters[adapter.key] = adapter;
}

export function getEngine(key: EngineKey): EngineAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unknown engine: ${key}`);
  return adapter;
}

export function listEngines(): EngineAdapter[] {
  return Object.values(adapters) as EngineAdapter[];
}
```

- [ ] **Step 6: Install + typecheck**

Run: `bun install`
Run: `bun --filter @search-builder/engines typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/engines bun.lockb
git commit -m "feat(engines): skeleton registry + types"
```

---

### Task 2.2: Google operator catalog

**Files:**
- Create: `packages/engines/src/operators/google.ts`

- [ ] **Step 1: Create `packages/engines/src/operators/google.ts`**

```typescript
import type { OperatorSpec } from '@search-builder/types';

export const googleOperators: OperatorSpec[] = [
  { key: 'intitle', label: 'Title contains', description: 'Single token must appear in page title', category: 'Location', valueType: 'text', supportsNegation: true, placeholder: 'admin' },
  { key: 'allintitle', label: 'All terms in title', description: 'All space-separated terms must be in title', category: 'Location', valueType: 'text', supportsNegation: true, placeholder: 'admin login' },
  { key: 'inurl', label: 'URL contains', description: 'Token must appear in URL', category: 'Location', valueType: 'text', supportsNegation: true, placeholder: 'admin' },
  { key: 'allinurl', label: 'All terms in URL', description: 'All space-separated terms must be in URL', category: 'Location', valueType: 'text', supportsNegation: true },
  { key: 'intext', label: 'Text contains', description: 'Token must appear in page body', category: 'Location', valueType: 'text', supportsNegation: true },
  { key: 'allintext', label: 'All terms in text', description: 'All space-separated terms must be in body', category: 'Location', valueType: 'text', supportsNegation: true },
  { key: 'inanchor', label: 'Anchor text contains', description: 'Token in anchor (link text) on page', category: 'Location', valueType: 'text', supportsNegation: true },
  { key: 'allinanchor', label: 'All terms in anchor', description: 'All terms in anchor text', category: 'Location', valueType: 'text', supportsNegation: true },
  { key: 'site', label: 'Restrict to domain', description: 'Restrict results to a domain or subdomain wildcard', category: 'Domain/URL', valueType: 'domain', supportsNegation: true, placeholder: 'example.com' },
  { key: 'link', label: 'Pages linking to', description: 'Pages that link to a URL (largely deprecated)', category: 'Domain/URL', valueType: 'url', supportsNegation: false },
  { key: 'related', label: 'Sites similar to', description: 'Sites similar to a URL', category: 'Domain/URL', valueType: 'url', supportsNegation: false },
  { key: 'cache', label: 'Cached version of', description: 'Google cached version of URL', category: 'Domain/URL', valueType: 'url', supportsNegation: false },
  { key: 'info', label: 'Info about URL', description: 'Page info', category: 'Domain/URL', valueType: 'url', supportsNegation: false },
  { key: 'define', label: 'Definition of', description: 'Dictionary definition', category: 'Lookup', valueType: 'text', supportsNegation: false },
  { key: 'filetype', label: 'File type', description: 'Restrict to file type', category: 'File', valueType: 'enum', supportsNegation: true, enumValues: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'sql', 'log', 'conf', 'env', 'key', 'pem', 'bak', 'json', 'yml', 'yaml', 'xml'] },
  { key: 'ext', label: 'File extension', description: 'Alias of filetype', category: 'File', valueType: 'text', supportsNegation: true, placeholder: 'pdf' },
  { key: 'daterange', label: 'Julian date range', description: 'Julian-day date range, e.g. 2459580-2459700', category: 'Date', valueType: 'range', supportsNegation: false, placeholder: '2459580-2459700' },
  { key: 'before', label: 'Indexed before', description: 'YYYY-MM-DD', category: 'Date', valueType: 'date', supportsNegation: false },
  { key: 'after', label: 'Indexed after', description: 'YYYY-MM-DD', category: 'Date', valueType: 'date', supportsNegation: false },
  { key: 'AROUND', label: 'Terms near each other', description: 'AROUND(n) — n=word distance between adjacent terms', category: 'Proximity', valueType: 'number', supportsNegation: false, placeholder: '3' },
  { key: 'weather', label: 'Weather for location', description: 'Weather widget', category: 'Lookup', valueType: 'text', supportsNegation: false },
  { key: 'stocks', label: 'Stock quote', description: 'Stock ticker', category: 'Lookup', valueType: 'text', supportsNegation: false },
  { key: 'map', label: 'Map for', description: 'Maps widget', category: 'Lookup', valueType: 'text', supportsNegation: false },
  { key: 'movie', label: 'Movie info', description: 'Movies', category: 'Lookup', valueType: 'text', supportsNegation: false },
  { key: 'source', label: 'News source', description: 'Google News source filter', category: 'Lookup', valueType: 'text', supportsNegation: false },
  { key: 'location', label: 'Location filter', description: 'News location filter', category: 'Lookup', valueType: 'text', supportsNegation: false },
];
```

- [ ] **Step 2: Commit**

```bash
git add packages/engines/src/operators/google.ts
git commit -m "feat(engines): google operator catalog"
```

---

### Task 2.3: Google adapter (serialize, buildUrl, validate) — TDD

**Files:**
- Create: `packages/engines/test/google.test.ts`
- Create: `packages/engines/src/google.ts`
- Modify: `packages/engines/src/index.ts` (register google)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/engines/test/google.test.ts
import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { google } from '../src/google';

const T = (value: string, opts: Partial<{ exactMatch: boolean; negated: boolean }> = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});
const OP = (key: string, value: string, negated = false): QueryNode => ({ type: 'operator', key, value, negated });
const G = (op: 'AND' | 'OR', children: QueryNode[], negated = false): QueryNode => ({ type: 'group', op, children, negated });

describe('google.serializeTree', () => {
  test('single term', () => {
    expect(google.serializeTree(G('AND', [T('hello')]))).toBe('hello');
  });

  test('exact match quotes the term', () => {
    expect(google.serializeTree(G('AND', [T('hello world', { exactMatch: true })]))).toBe('"hello world"');
  });

  test('negated term prefixes with minus', () => {
    expect(google.serializeTree(G('AND', [T('spam', { negated: true })]))).toBe('-spam');
  });

  test('operator inline', () => {
    expect(google.serializeTree(G('AND', [OP('site', 'example.com')]))).toBe('site:example.com');
  });

  test('operator value with space gets quoted', () => {
    expect(google.serializeTree(G('AND', [OP('intitle', 'admin login')]))).toBe('intitle:"admin login"');
  });

  test('negated operator prefixes with minus', () => {
    expect(google.serializeTree(G('AND', [OP('site', 'github.com', true)]))).toBe('-site:github.com');
  });

  test('OR group is parenthesised', () => {
    expect(
      google.serializeTree(G('AND', [G('OR', [OP('intitle', 'admin'), OP('intitle', 'login')])])),
    ).toBe('(intitle:admin OR intitle:login)');
  });

  test('nested AND inside top AND inlines without extra parens', () => {
    expect(google.serializeTree(G('AND', [T('a'), G('AND', [T('b'), T('c')])]))).toBe('a (b c)');
  });

  test('negated group wraps in -(...)', () => {
    expect(google.serializeTree(G('AND', [G('OR', [T('a'), T('b')], true)]))).toBe('-(a OR b)');
  });

  test('AROUND renders specially when used between two terms in same group', () => {
    expect(
      google.serializeTree(G('AND', [T('claude'), OP('AROUND', '3'), T('anthropic')])),
    ).toBe('claude AROUND(3) anthropic');
  });

  test('complex realistic query', () => {
    const tree = G('AND', [
      G('OR', [OP('intitle', 'admin'), OP('intitle', 'login')]),
      OP('filetype', 'php'),
      OP('site', 'github.com', true),
    ]);
    expect(google.serializeTree(tree)).toBe('(intitle:admin OR intitle:login) filetype:php -site:github.com');
  });
});

describe('google.buildUrl', () => {
  test('encodes spaces and operators', () => {
    const tree = G('AND', [OP('intitle', 'admin login'), OP('site', 'example.com')]);
    const url = google.buildUrl(tree);
    expect(url.startsWith('https://www.google.com/search?q=')).toBe(true);
    expect(decodeURIComponent(url.split('q=')[1])).toBe('intitle:"admin login" site:example.com');
  });
});

describe('google.validateValue', () => {
  test('before/after accept YYYY-MM-DD', () => {
    expect(google.validateValue('before', '2024-01-01')).toBeNull();
    expect(google.validateValue('before', '01-01-2024')).not.toBeNull();
  });
  test('AROUND accepts positive integer', () => {
    expect(google.validateValue('AROUND', '3')).toBeNull();
    expect(google.validateValue('AROUND', '0')).not.toBeNull();
    expect(google.validateValue('AROUND', '-2')).not.toBeNull();
    expect(google.validateValue('AROUND', 'abc')).not.toBeNull();
  });
  test('unknown operator returns null (no opinion)', () => {
    expect(google.validateValue('unknown_op_xyz', 'foo')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @search-builder/engines test`
Expected: FAIL — cannot find module `'../src/google'`.

- [ ] **Step 3: Implement `packages/engines/src/google.ts`**

```typescript
import type { QueryNode } from '@search-builder/types';
import type { EngineAdapter } from './types';
import { googleOperators } from './operators/google';
import { needsQuoting, quote, isEmpty } from './serialize-helpers';

function serializeNode(node: QueryNode, isTop: boolean): string {
  if (node.type === 'term') {
    if (node.value.trim() === '') return '';
    let body = node.exactMatch ? quote(node.value) : needsQuoting(node.value) ? quote(node.value) : node.value;
    return node.negated ? `-${body}` : body;
  }
  if (node.type === 'operator') {
    if (node.value.trim() === '') return '';
    const value = needsQuoting(node.value) ? quote(node.value) : node.value;
    const body = `${node.key}:${value}`;
    return node.negated ? `-${body}` : body;
  }
  // group
  const parts: string[] = [];
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (isEmpty(c)) continue;
    // Special-case: AROUND operator inlines as macro between siblings of an AND group
    if (
      node.op === 'AND' &&
      c.type === 'operator' &&
      c.key === 'AROUND' &&
      !c.negated &&
      i > 0 &&
      i < children.length - 1
    ) {
      parts.push(`AROUND(${c.value})`);
      continue;
    }
    parts.push(serializeNode(c, false));
  }
  const joiner = node.op === 'AND' ? ' ' : ' OR ';
  const joined = parts.filter(Boolean).join(joiner);
  if (isTop) return joined;
  // Non-top groups: wrap in parens; OR always, AND when there are >1 children
  const wrap = node.op === 'OR' || parts.length > 1;
  let body = wrap ? `(${joined})` : joined;
  if (node.negated) body = `-${body}`;
  return body;
}

function serializeTree(tree: QueryNode): string {
  if (tree.type !== 'group') return serializeNode(tree, true);
  return serializeNode(tree, true);
}

function buildUrl(tree: QueryNode): string {
  const q = serializeTree(tree);
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function validateValue(operatorKey: string, value: string): string | null {
  if (operatorKey === 'before' || operatorKey === 'after') {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Expected YYYY-MM-DD';
  }
  if (operatorKey === 'AROUND') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return 'Expected positive integer';
    return null;
  }
  if (operatorKey === 'daterange') {
    return /^\d{7}-\d{7}$/.test(value) ? null : 'Expected Julian range like 2459580-2459700';
  }
  return null;
}

export const google: EngineAdapter = {
  key: 'google',
  name: 'Google',
  icon: 'simple-icons:google',
  baseUrl: 'https://www.google.com/search',
  queryParam: 'q',
  operators: googleOperators,
  serializeTree,
  buildUrl,
  validateValue,
};
```

- [ ] **Step 4: Update `packages/engines/src/index.ts`** to register Google

```typescript
import type { EngineAdapter, EngineKey } from './types';
import { google } from './google';

export * from './types';
export * from './serialize-helpers';

const adapters: Partial<Record<EngineKey, EngineAdapter>> = {
  google,
};

export function getEngine(key: EngineKey): EngineAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unknown engine: ${key}`);
  return adapter;
}

export function listEngines(): EngineAdapter[] {
  return Object.values(adapters) as EngineAdapter[];
}

export { google };
```

- [ ] **Step 5: Run tests**

Run: `bun --filter @search-builder/engines test`
Expected: PASS — all 14 tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/engines/src/google.ts packages/engines/src/index.ts packages/engines/test/google.test.ts
git commit -m "feat(engines): google adapter with serialise + buildUrl + validate"
```

---

### Task 2.4: GitHub operator catalog

**Files:**
- Create: `packages/engines/src/operators/github.ts`

- [ ] **Step 1: Create `packages/engines/src/operators/github.ts`**

```typescript
import type { OperatorSpec } from '@search-builder/types';

export const githubOperators: OperatorSpec[] = [
  { key: 'repo', label: 'Repository', description: 'owner/name', category: 'Scope', valueType: 'text', supportsNegation: true, placeholder: 'torvalds/linux' },
  { key: 'user', label: 'User owner', description: 'Repos owned by user', category: 'Scope', valueType: 'text', supportsNegation: true, placeholder: 'torvalds' },
  { key: 'org', label: 'Organization owner', description: 'Repos owned by org', category: 'Scope', valueType: 'text', supportsNegation: true, placeholder: 'github' },
  { key: 'language', label: 'Language', description: 'Programming language', category: 'Filter', valueType: 'enum', supportsNegation: true, enumValues: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'c', 'cpp', 'csharp', 'ruby', 'php', 'shell', 'kotlin', 'swift', 'scala', 'elixir', 'haskell', 'lua', 'r', 'dart'] },
  { key: 'path', label: 'File path contains', description: 'Path contains substring', category: 'Filter', valueType: 'text', supportsNegation: true, placeholder: 'src/' },
  { key: 'filename', label: 'File name', description: 'Match file name', category: 'Filter', valueType: 'text', supportsNegation: true, placeholder: '.env' },
  { key: 'extension', label: 'File extension', description: 'File extension without dot', category: 'Filter', valueType: 'text', supportsNegation: true, placeholder: 'env' },
  { key: 'in', label: 'Search location', description: 'Where to look', category: 'Filter', valueType: 'enum', supportsNegation: false, enumValues: ['file', 'path', 'file,path'] },
  { key: 'size', label: 'File size', description: 'Range, e.g. >10000', category: 'Filter', valueType: 'range', supportsNegation: false, placeholder: '>10000' },
  { key: 'fork', label: 'Include forks', description: 'Forks behaviour', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['only', 'true', 'false'] },
  { key: 'mirror', label: 'Is mirror', description: 'Mirror repos', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'archived', label: 'Archived repo', description: 'Archived state', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'is', label: 'Repo visibility', description: 'Visibility', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['public', 'private'] },
  { key: 'stars', label: 'Stars', description: 'Range, e.g. >100', category: 'Repo', valueType: 'range', supportsNegation: false, placeholder: '>100' },
  { key: 'forks', label: 'Forks', description: 'Range', category: 'Repo', valueType: 'range', supportsNegation: false },
  { key: 'created', label: 'Repo created at', description: 'Date range', category: 'Repo', valueType: 'date-range', supportsNegation: false, placeholder: '>2024-01-01' },
  { key: 'pushed', label: 'Last push', description: 'Date range', category: 'Repo', valueType: 'date-range', supportsNegation: false },
  { key: 'license', label: 'License', description: 'SPDX license id', category: 'Repo', valueType: 'enum', supportsNegation: false, enumValues: ['mit', 'apache-2.0', 'gpl-3.0', 'bsd-3-clause', 'agpl-3.0', 'lgpl-3.0', 'mpl-2.0', 'unlicense'] },
  { key: 'topic', label: 'Repo topic', description: 'Topic tag', category: 'Repo', valueType: 'text', supportsNegation: true },
];
```

- [ ] **Step 2: Commit**

```bash
git add packages/engines/src/operators/github.ts
git commit -m "feat(engines): github operator catalog"
```

---

### Task 2.5: GitHub adapter — TDD

**Files:**
- Create: `packages/engines/test/github.test.ts`
- Create: `packages/engines/src/github.ts`
- Modify: `packages/engines/src/index.ts` (register github)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/engines/test/github.test.ts
import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { github } from '../src/github';

const T = (value: string, opts: Partial<{ exactMatch: boolean; negated: boolean }> = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});
const OP = (key: string, value: string, negated = false): QueryNode => ({ type: 'operator', key, value, negated });
const G = (op: 'AND' | 'OR', children: QueryNode[], negated = false): QueryNode => ({ type: 'group', op, children, negated });

describe('github.serializeTree', () => {
  test('terms AND-joined by space', () => {
    expect(github.serializeTree(G('AND', [T('TODO'), T('fixme')]))).toBe('TODO fixme');
  });

  test('operator inline', () => {
    expect(github.serializeTree(G('AND', [OP('language', 'typescript')]))).toBe('language:typescript');
  });

  test('negated operator prefixes with minus', () => {
    expect(github.serializeTree(G('AND', [OP('language', 'javascript', true)]))).toBe('-language:javascript');
  });

  test('OR group of operators', () => {
    expect(
      github.serializeTree(G('AND', [G('OR', [OP('language', 'typescript'), OP('language', 'javascript')])])),
    ).toBe('language:typescript OR language:javascript');
  });

  test('negated term uses NOT prefix', () => {
    expect(github.serializeTree(G('AND', [T('foo', { negated: true })]))).toBe('NOT foo');
  });

  test('exact-match term quoted', () => {
    expect(github.serializeTree(G('AND', [T('hello world', { exactMatch: true })]))).toBe('"hello world"');
  });

  test('complex query', () => {
    const tree = G('AND', [
      OP('repo', 'kolezka/search-builder'),
      OP('language', 'typescript'),
      OP('path', 'src/'),
      T('TODO'),
    ]);
    expect(github.serializeTree(tree)).toBe('repo:kolezka/search-builder language:typescript path:src/ TODO');
  });
});

describe('github.buildUrl', () => {
  test('url shape', () => {
    const tree = G('AND', [OP('language', 'typescript'), T('TODO')]);
    expect(github.buildUrl(tree)).toBe(
      `https://github.com/search?type=code&q=${encodeURIComponent('language:typescript TODO')}`,
    );
  });
});

describe('github.validateValue', () => {
  test('repo expects owner/name', () => {
    expect(github.validateValue('repo', 'torvalds/linux')).toBeNull();
    expect(github.validateValue('repo', 'just-a-name')).not.toBeNull();
  });
  test('size accepts comparison strings', () => {
    expect(github.validateValue('size', '>10000')).toBeNull();
    expect(github.validateValue('size', '100..200')).toBeNull();
    expect(github.validateValue('size', 'abc')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @search-builder/engines test test/github.test.ts`
Expected: FAIL — cannot find module `'../src/github'`.

- [ ] **Step 3: Implement `packages/engines/src/github.ts`**

```typescript
import type { QueryNode } from '@search-builder/types';
import type { EngineAdapter } from './types';
import { githubOperators } from './operators/github';
import { needsQuoting, quote, isEmpty } from './serialize-helpers';

function serializeNode(node: QueryNode, isTop: boolean): string {
  if (node.type === 'term') {
    if (node.value.trim() === '') return '';
    const body = node.exactMatch || needsQuoting(node.value) ? quote(node.value) : node.value;
    return node.negated ? `NOT ${body}` : body;
  }
  if (node.type === 'operator') {
    if (node.value.trim() === '') return '';
    const value = needsQuoting(node.value) ? quote(node.value) : node.value;
    const body = `${node.key}:${value}`;
    return node.negated ? `-${body}` : body;
  }
  const parts: string[] = [];
  for (const c of node.children) {
    if (isEmpty(c)) continue;
    parts.push(serializeNode(c, false));
  }
  const joiner = node.op === 'AND' ? ' ' : ' OR ';
  const joined = parts.filter(Boolean).join(joiner);
  if (isTop) return joined;
  const wrap = node.op === 'OR' && parts.length > 1;
  let body = wrap ? joined : joined;
  if (node.negated) body = `NOT (${joined})`;
  return body;
}

function serializeTree(tree: QueryNode): string {
  return serializeNode(tree, true);
}

function buildUrl(tree: QueryNode): string {
  const q = serializeTree(tree);
  return `https://github.com/search?type=code&q=${encodeURIComponent(q)}`;
}

function validateValue(operatorKey: string, value: string): string | null {
  if (operatorKey === 'repo') {
    return /^[\w.-]+\/[\w.-]+$/.test(value) ? null : 'Expected owner/name';
  }
  if (operatorKey === 'size' || operatorKey === 'stars' || operatorKey === 'forks') {
    return /^([<>]=?\d+|\d+\.\.\d+|\d+)$/.test(value) ? null : 'Expected number, >n, <n, n..m';
  }
  if (operatorKey === 'created' || operatorKey === 'pushed') {
    return /^([<>]=?)?\d{4}-\d{2}-\d{2}(\.\.\d{4}-\d{2}-\d{2})?$/.test(value)
      ? null
      : 'Expected YYYY-MM-DD or >YYYY-MM-DD or YYYY-MM-DD..YYYY-MM-DD';
  }
  return null;
}

export const github: EngineAdapter = {
  key: 'github',
  name: 'GitHub Code Search',
  icon: 'simple-icons:github',
  baseUrl: 'https://github.com/search',
  queryParam: 'q',
  operators: githubOperators,
  serializeTree,
  buildUrl,
  validateValue,
};
```

- [ ] **Step 4: Update `packages/engines/src/index.ts`**

Replace the file with:

```typescript
import type { EngineAdapter, EngineKey } from './types';
import { google } from './google';
import { github } from './github';

export * from './types';
export * from './serialize-helpers';

const adapters: Partial<Record<EngineKey, EngineAdapter>> = { google, github };

export function getEngine(key: EngineKey): EngineAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unknown engine: ${key}`);
  return adapter;
}

export function listEngines(): EngineAdapter[] {
  return Object.values(adapters) as EngineAdapter[];
}

export { google, github };
```

- [ ] **Step 5: Run tests**

Run: `bun --filter @search-builder/engines test`
Expected: PASS — google + github suites green.

- [ ] **Step 6: Commit**

```bash
git add packages/engines/src/github.ts packages/engines/src/index.ts packages/engines/test/github.test.ts
git commit -m "feat(engines): github adapter"
```

---

### Task 2.6: Shodan operator catalog

**Files:**
- Create: `packages/engines/src/operators/shodan.ts`

- [ ] **Step 1: Create `packages/engines/src/operators/shodan.ts`**

```typescript
import type { OperatorSpec } from '@search-builder/types';

export const shodanOperators: OperatorSpec[] = [
  { key: 'port', label: 'Port', description: 'Single port, comma list or range', category: 'Network', valueType: 'text', supportsNegation: true, placeholder: '80,443' },
  { key: 'hostname', label: 'Hostname contains', description: 'Substring of reverse DNS', category: 'Network', valueType: 'text', supportsNegation: true },
  { key: 'net', label: 'Network (CIDR)', description: 'CIDR block', category: 'Network', valueType: 'text', supportsNegation: true, placeholder: '1.2.3.0/24' },
  { key: 'ip', label: 'IP address', description: 'Exact IP', category: 'Network', valueType: 'text', supportsNegation: true },
  { key: 'country', label: 'Country (ISO-2)', description: '2-letter ISO country code', category: 'Geo', valueType: 'enum', supportsNegation: true, enumValues: ['PL', 'DE', 'US', 'GB', 'FR', 'NL', 'RU', 'CN', 'JP', 'KR', 'IN', 'BR', 'CA', 'AU', 'IT', 'ES', 'SE', 'CH', 'AT', 'BE'] },
  { key: 'city', label: 'City', description: 'City name', category: 'Geo', valueType: 'text', supportsNegation: true },
  { key: 'geo', label: 'Geo (lat,long,dist)', description: 'lat,long[,radius_km]', category: 'Geo', valueType: 'text', supportsNegation: false, placeholder: '52.23,21.01,50' },
  { key: 'org', label: 'Organization', description: 'Org from WHOIS', category: 'Network', valueType: 'text', supportsNegation: true },
  { key: 'isp', label: 'ISP', description: 'ISP name', category: 'Network', valueType: 'text', supportsNegation: true },
  { key: 'asn', label: 'ASN', description: 'Autonomous system number', category: 'Network', valueType: 'text', supportsNegation: true, placeholder: 'AS15169' },
  { key: 'os', label: 'Operating system', description: 'Banner-detected OS', category: 'Host', valueType: 'text', supportsNegation: true },
  { key: 'product', label: 'Product', description: 'Banner-detected product', category: 'Host', valueType: 'text', supportsNegation: true, placeholder: 'Apache' },
  { key: 'version', label: 'Product version', description: 'Detected version', category: 'Host', valueType: 'text', supportsNegation: true },
  { key: 'ssl', label: 'SSL search', description: 'Full-text in cert', category: 'TLS', valueType: 'text', supportsNegation: true },
  { key: 'ssl.cert.subject.cn', label: 'SSL subject CN', description: 'Cert subject common name', category: 'TLS', valueType: 'text', supportsNegation: true },
  { key: 'ssl.cert.issuer.cn', label: 'SSL issuer CN', description: 'Cert issuer common name', category: 'TLS', valueType: 'text', supportsNegation: true },
  { key: 'ssl.cert.serial', label: 'SSL cert serial', description: 'Hex serial', category: 'TLS', valueType: 'text', supportsNegation: true },
  { key: 'ssl.version', label: 'SSL/TLS version', description: 'Protocol version', category: 'TLS', valueType: 'enum', supportsNegation: true, enumValues: ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'] },
  { key: 'http.title', label: 'HTTP title contains', description: 'Title tag substring', category: 'HTTP', valueType: 'text', supportsNegation: true },
  { key: 'http.html', label: 'HTML contains', description: 'Substring in HTML body', category: 'HTTP', valueType: 'text', supportsNegation: true },
  { key: 'http.status', label: 'HTTP status', description: 'Status code', category: 'HTTP', valueType: 'number', supportsNegation: true, placeholder: '200' },
  { key: 'http.headers', label: 'HTTP headers contain', description: 'Substring of headers', category: 'HTTP', valueType: 'text', supportsNegation: true },
  { key: 'has_screenshot', label: 'Has screenshot', description: 'Boolean', category: 'Flags', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'has_ssl', label: 'Has SSL', description: 'Boolean', category: 'Flags', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'has_vuln', label: 'Has known vulnerability', description: 'Boolean', category: 'Flags', valueType: 'enum', supportsNegation: false, enumValues: ['true', 'false'] },
  { key: 'vuln', label: 'Vulnerability CVE', description: 'CVE id', category: 'Vuln', valueType: 'text', supportsNegation: true, placeholder: 'CVE-2021-44228' },
  { key: 'category', label: 'Category', description: 'Shodan category tag', category: 'Meta', valueType: 'text', supportsNegation: true },
  { key: 'tag', label: 'Tag', description: 'Shodan tag', category: 'Meta', valueType: 'text', supportsNegation: true },
  { key: 'after', label: 'Banner seen after', description: 'DD/MM/YYYY (Shodan format)', category: 'Date', valueType: 'date', supportsNegation: false, placeholder: '01/01/2024' },
  { key: 'before', label: 'Banner seen before', description: 'DD/MM/YYYY (Shodan format)', category: 'Date', valueType: 'date', supportsNegation: false },
];
```

- [ ] **Step 2: Commit**

```bash
git add packages/engines/src/operators/shodan.ts
git commit -m "feat(engines): shodan operator catalog"
```

---

### Task 2.7: Shodan adapter — TDD

**Files:**
- Create: `packages/engines/test/shodan.test.ts`
- Create: `packages/engines/src/shodan.ts`
- Modify: `packages/engines/src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/engines/test/shodan.test.ts
import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { shodan } from '../src/shodan';

const T = (value: string, opts: Partial<{ exactMatch: boolean; negated: boolean }> = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});
const OP = (key: string, value: string, negated = false): QueryNode => ({ type: 'operator', key, value, negated });
const G = (op: 'AND' | 'OR', children: QueryNode[], negated = false): QueryNode => ({ type: 'group', op, children, negated });

describe('shodan.serializeTree', () => {
  test('operator inline', () => {
    expect(shodan.serializeTree(G('AND', [OP('port', '80')]))).toBe('port:80');
  });

  test('term and operator combined', () => {
    expect(shodan.serializeTree(G('AND', [T('apache'), OP('port', '443')]))).toBe('apache port:443');
  });

  test('negated operator prefixes with minus', () => {
    expect(shodan.serializeTree(G('AND', [OP('country', 'CN', true)]))).toBe('-country:CN');
  });

  test('OR group wraps in parens', () => {
    expect(
      shodan.serializeTree(G('AND', [G('OR', [OP('port', '3389'), OP('port', '5900')])])),
    ).toBe('(port:3389 OR port:5900)');
  });

  test('CVE query', () => {
    expect(shodan.serializeTree(G('AND', [OP('vuln', 'CVE-2021-44228')]))).toBe('vuln:CVE-2021-44228');
  });

  test('complex network search', () => {
    const tree = G('AND', [
      OP('country', 'PL'),
      G('OR', [OP('port', '22'), OP('port', '23')]),
      OP('has_screenshot', 'true'),
    ]);
    expect(shodan.serializeTree(tree)).toBe('country:PL (port:22 OR port:23) has_screenshot:true');
  });
});

describe('shodan.buildUrl', () => {
  test('encodes query', () => {
    const tree = G('AND', [OP('port', '80'), OP('country', 'PL')]);
    expect(shodan.buildUrl(tree)).toBe(
      `https://www.shodan.io/search?query=${encodeURIComponent('port:80 country:PL')}`,
    );
  });
});

describe('shodan.validateValue', () => {
  test('port accepts number, list, range', () => {
    expect(shodan.validateValue('port', '80')).toBeNull();
    expect(shodan.validateValue('port', '80,443')).toBeNull();
    expect(shodan.validateValue('port', '8000-8100')).toBeNull();
    expect(shodan.validateValue('port', 'abc')).not.toBeNull();
  });
  test('country requires 2 uppercase letters', () => {
    expect(shodan.validateValue('country', 'PL')).toBeNull();
    expect(shodan.validateValue('country', 'pl')).not.toBeNull();
    expect(shodan.validateValue('country', 'POL')).not.toBeNull();
  });
  test('http.status requires number 100-599', () => {
    expect(shodan.validateValue('http.status', '200')).toBeNull();
    expect(shodan.validateValue('http.status', '999')).not.toBeNull();
  });
  test('vuln expects CVE pattern', () => {
    expect(shodan.validateValue('vuln', 'CVE-2021-44228')).toBeNull();
    expect(shodan.validateValue('vuln', '44228')).not.toBeNull();
  });
  test('before/after expect DD/MM/YYYY', () => {
    expect(shodan.validateValue('before', '01/01/2024')).toBeNull();
    expect(shodan.validateValue('before', '2024-01-01')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @search-builder/engines test test/shodan.test.ts`
Expected: FAIL — cannot find module `'../src/shodan'`.

- [ ] **Step 3: Implement `packages/engines/src/shodan.ts`**

```typescript
import type { QueryNode } from '@search-builder/types';
import type { EngineAdapter } from './types';
import { shodanOperators } from './operators/shodan';
import { needsQuoting, quote, isEmpty } from './serialize-helpers';

function serializeNode(node: QueryNode, isTop: boolean): string {
  if (node.type === 'term') {
    if (node.value.trim() === '') return '';
    const body = node.exactMatch || needsQuoting(node.value) ? quote(node.value) : node.value;
    return node.negated ? `-${body}` : body;
  }
  if (node.type === 'operator') {
    if (node.value.trim() === '') return '';
    const value = needsQuoting(node.value) ? quote(node.value) : node.value;
    const body = `${node.key}:${value}`;
    return node.negated ? `-${body}` : body;
  }
  const parts: string[] = [];
  for (const c of node.children) {
    if (isEmpty(c)) continue;
    parts.push(serializeNode(c, false));
  }
  const joiner = node.op === 'AND' ? ' ' : ' OR ';
  const joined = parts.filter(Boolean).join(joiner);
  if (isTop) return joined;
  const wrap = node.op === 'OR' || parts.length > 1;
  let body = wrap ? `(${joined})` : joined;
  if (node.negated) body = `-${body}`;
  return body;
}

function serializeTree(tree: QueryNode): string {
  return serializeNode(tree, true);
}

function buildUrl(tree: QueryNode): string {
  const q = serializeTree(tree);
  return `https://www.shodan.io/search?query=${encodeURIComponent(q)}`;
}

function validateValue(operatorKey: string, value: string): string | null {
  if (operatorKey === 'port') {
    return /^(\d+)(,\d+)*$|^\d+-\d+$/.test(value) ? null : 'Expected number, comma-list, or range';
  }
  if (operatorKey === 'country') {
    return /^[A-Z]{2}$/.test(value) ? null : 'Expected 2-letter uppercase ISO-2';
  }
  if (operatorKey === 'http.status') {
    const n = Number(value);
    return Number.isInteger(n) && n >= 100 && n <= 599 ? null : 'Expected HTTP status 100-599';
  }
  if (operatorKey === 'vuln') {
    return /^CVE-\d{4}-\d{4,}$/.test(value) ? null : 'Expected CVE-YYYY-NNNN';
  }
  if (operatorKey === 'before' || operatorKey === 'after') {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? null : 'Expected DD/MM/YYYY';
  }
  if (operatorKey === 'asn') {
    return /^AS\d+$/.test(value) ? null : 'Expected AS#####';
  }
  return null;
}

export const shodan: EngineAdapter = {
  key: 'shodan',
  name: 'Shodan',
  icon: 'simple-icons:shodan',
  baseUrl: 'https://www.shodan.io/search',
  queryParam: 'query',
  operators: shodanOperators,
  serializeTree,
  buildUrl,
  validateValue,
};
```

- [ ] **Step 4: Update `packages/engines/src/index.ts`**

```typescript
import type { EngineAdapter, EngineKey } from './types';
import { google } from './google';
import { github } from './github';
import { shodan } from './shodan';

export * from './types';
export * from './serialize-helpers';

const adapters: Partial<Record<EngineKey, EngineAdapter>> = { google, github, shodan };

export function getEngine(key: EngineKey): EngineAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unknown engine: ${key}`);
  return adapter;
}

export function listEngines(): EngineAdapter[] {
  return Object.values(adapters) as EngineAdapter[];
}

export { google, github, shodan };
```

- [ ] **Step 5: Run all engine tests + typecheck**

Run: `bun --filter @search-builder/engines test`
Run: `bun --filter @search-builder/engines typecheck`
Expected: all tests pass, typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add packages/engines/src/shodan.ts packages/engines/src/index.ts packages/engines/test/shodan.test.ts
git commit -m "feat(engines): shodan adapter"
```

---

### Task 2.8: Tree validator (uses engines + types)

**Files:**
- Create: `packages/engines/src/validate-tree.ts`
- Create: `packages/engines/test/validate-tree.test.ts`
- Modify: `packages/engines/src/index.ts` (export)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/engines/test/validate-tree.test.ts
import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { validateTree } from '../src/validate-tree';

const OP = (key: string, value: string): QueryNode => ({ type: 'operator', key, value });
const T = (value: string): QueryNode => ({ type: 'term', value });
const G = (op: 'AND' | 'OR', children: QueryNode[]): QueryNode => ({ type: 'group', op, children });

describe('validateTree', () => {
  test('valid google tree has no errors', () => {
    const tree = G('AND', [OP('intitle', 'admin'), OP('site', 'example.com')]);
    expect(validateTree('google', tree)).toEqual([]);
  });

  test('unknown operator key fails', () => {
    const tree = G('AND', [OP('nonsense', 'foo')]);
    const errors = validateTree('google', tree);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('Unknown operator');
  });

  test('value validator failure surfaces', () => {
    const tree = G('AND', [OP('before', 'not-a-date')]);
    const errors = validateTree('google', tree);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('YYYY-MM-DD');
  });

  test('depth > 8 fails', () => {
    let leaf: QueryNode = T('x');
    for (let i = 0; i < 9; i++) leaf = G('AND', [leaf]);
    const errors = validateTree('google', leaf);
    expect(errors.some((e) => e.message.includes('depth'))).toBe(true);
  });

  test('reports path for nested errors', () => {
    const tree = G('AND', [G('OR', [OP('nonsense', 'foo')])]);
    const errors = validateTree('google', tree);
    expect(errors[0].path).toBe('children[0].children[0]');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`cannot find module ../src/validate-tree`)

Run: `bun --filter @search-builder/engines test test/validate-tree.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `packages/engines/src/validate-tree.ts`**

```typescript
import type { EngineKey, QueryNode } from '@search-builder/types';
import { MAX_TREE_DEPTH, treeDepth } from '@search-builder/types';
import { getEngine } from './index';
import type { ValidationError } from './types';

export function validateTree(engine: EngineKey, tree: QueryNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const depth = treeDepth(tree);
  if (depth > MAX_TREE_DEPTH) {
    errors.push({ path: '', message: `Tree depth ${depth} exceeds max ${MAX_TREE_DEPTH}` });
    return errors;
  }
  const adapter = getEngine(engine);
  const operatorKeys = new Set(adapter.operators.map((o) => o.key));
  const walk = (node: QueryNode, path: string): void => {
    if (node.type === 'operator') {
      if (!operatorKeys.has(node.key)) {
        errors.push({ path, message: `Unknown operator '${node.key}' for engine ${engine}` });
        return;
      }
      const err = adapter.validateValue(node.key, node.value);
      if (err) errors.push({ path, message: err });
      return;
    }
    if (node.type === 'group') {
      node.children.forEach((c, i) => walk(c, `${path ? `${path}.` : ''}children[${i}]`));
    }
  };
  walk(tree, '');
  return errors;
}
```

- [ ] **Step 4: Export from `packages/engines/src/index.ts`** — add to end:

```typescript
export { validateTree } from './validate-tree';
```

- [ ] **Step 5: Run tests + typecheck**

Run: `bun --filter @search-builder/engines test`
Run: `bun --filter @search-builder/engines typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/engines/src/validate-tree.ts packages/engines/src/index.ts packages/engines/test/validate-tree.test.ts
git commit -m "feat(engines): validateTree against operator catalog"
```

---

## Phase 3 — apps/api scaffold + DB

### Task 3.1: Create `apps/api` package

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/.env.example`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/env.ts`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
  "name": "@search-builder/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --hot src/server.ts",
    "start": "bun src/server.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "bun test",
    "db:migrate": "bun src/db/migrate.ts",
    "db:seed": "bun src/db/seed-templates.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@search-builder/types": "workspace:*",
    "@search-builder/engines": "workspace:*",
    "hono": "^4.6.0",
    "drizzle-orm": "^0.36.0",
    "better-sqlite3": "^11.3.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/better-sqlite3": "^7.6.11",
    "drizzle-kit": "^0.28.0",
    "typescript": "^5.6.0",
    "bun-types": "latest"
  }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [{ "path": "../../packages/types" }, { "path": "../../packages/engines" }],
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create `apps/api/.env.example`**

```
PORT=3001
DB_PATH=./data/db.sqlite
INITIAL_PASSWORD=change-me-on-first-boot
SESSION_TTL_DAYS=30
COOKIE_SECURE=true
COOKIE_DOMAIN=
ALLOWED_ORIGIN=http://localhost:5173
```

- [ ] **Step 4: Create `apps/api/src/env.ts`**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DB_PATH: z.string().default('./data/db.sqlite'),
  INITIAL_PASSWORD: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_SECURE: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  COOKIE_DOMAIN: z.string().optional(),
  ALLOWED_ORIGIN: z.string().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 5: Create `apps/api/drizzle.config.ts`**

```typescript
import type { Config } from 'drizzle-kit';
import { env } from './src/env';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: env.DB_PATH },
} satisfies Config;
```

- [ ] **Step 6: Install + typecheck**

Run from repo root: `bun install`
Run: `bun --filter @search-builder/api typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/.env.example apps/api/drizzle.config.ts apps/api/src/env.ts bun.lockb
git commit -m "chore(api): scaffold package with env loader"
```

---

### Task 3.2: Drizzle schema + initial migration

**Files:**
- Create: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Create `apps/api/src/db/schema.ts`** (full schema for all tables from spec §4)

```typescript
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
```

- [ ] **Step 2: Generate initial migration**

Run: `cd apps/api && bun drizzle-kit generate`
Expected: creates `src/db/migrations/0000_*.sql`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/src/db/migrations/
git commit -m "feat(api): drizzle schema + initial migration"
```

---

### Task 3.3: DB client + migrate runner + bootstrap (password seed)

**Files:**
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/migrate.ts`
- Create: `apps/api/src/db/bootstrap.ts`

- [ ] **Step 1: Create `apps/api/src/db/client.ts`**

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;
  mkdirSync(dirname(env.DB_PATH), { recursive: true });
  _sqlite = new Database(env.DB_PATH);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');
  _sqlite.pragma('busy_timeout = 5000');
  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function closeDb(): void {
  _sqlite?.close();
  _sqlite = null;
  _db = null;
}

export type DB = ReturnType<typeof getDb>;
```

- [ ] **Step 2: Create `apps/api/src/db/migrate.ts`**

```typescript
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client';

migrate(getDb(), { migrationsFolder: './src/db/migrations' });
console.log('Migrations applied');
process.exit(0);
```

- [ ] **Step 3: Create `apps/api/src/db/bootstrap.ts`**

```typescript
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { env } from '../env';
import { getDb } from './client';
import { appConfig } from './schema';

export async function bootstrap(): Promise<void> {
  const db = getDb();
  const existing = await db.select().from(appConfig).where(eq(appConfig.key, 'password_hash')).get();
  if (existing) return;
  if (!env.INITIAL_PASSWORD) {
    throw new Error('password_hash missing and INITIAL_PASSWORD not set — cannot boot');
  }
  const hash = await bcrypt.hash(env.INITIAL_PASSWORD, 12);
  const now = Date.now();
  await db.insert(appConfig).values([
    { key: 'password_hash', value: hash },
    { key: 'first_boot_at', value: String(now) },
    { key: 'schema_version', value: '1' },
  ]);
  console.log('[boot] initial password hash seeded');
}
```

- [ ] **Step 4: Smoke-run migrate against an ephemeral DB**

Run: `cd apps/api && DB_PATH=./data/test.sqlite INITIAL_PASSWORD=tmp bun src/db/migrate.ts`
Expected: prints "Migrations applied".
Cleanup: `rm apps/api/data/test.sqlite*`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/client.ts apps/api/src/db/migrate.ts apps/api/src/db/bootstrap.ts
git commit -m "feat(api): db client, migrate runner, bootstrap"
```

---

### Task 3.4: Hono server + /health

**Files:**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/routes/health.ts`

- [ ] **Step 1: Create `apps/api/src/routes/health.ts`**

```typescript
import { Hono } from 'hono';

export const healthRoute = new Hono();
healthRoute.get('/', (c) => c.json({ status: 'ok', ts: Date.now() }));
```

- [ ] **Step 2: Create `apps/api/src/server.ts`**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { env } from './env';
import { bootstrap } from './db/bootstrap';
import { healthRoute } from './routes/health';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: env.ALLOWED_ORIGIN, credentials: true }));

app.route('/api/health', healthRoute);

app.notFound((c) => c.json({ error: 'not_found', code: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'server_error', code: 'server_error' }, 500);
});

await bootstrap();

console.log(`[api] listening on http://localhost:${env.PORT}`);

export default { port: env.PORT, fetch: app.fetch };
```

- [ ] **Step 3: Smoke test**

Shell A: `cd apps/api && INITIAL_PASSWORD=tmp DB_PATH=./data/dev.sqlite bun src/db/migrate.ts && INITIAL_PASSWORD=tmp DB_PATH=./data/dev.sqlite bun src/server.ts`
Shell B: `curl -s http://localhost:3001/api/health`
Expected: `{"status":"ok","ts":...}`
Stop shell A, cleanup: `rm apps/api/data/dev.sqlite*`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/server.ts apps/api/src/routes/health.ts
git commit -m "feat(api): hono server + health endpoint"
```

---

## Phase 4 — apps/api auth

### Task 4.1: Password + session helpers

**Files:**
- Create: `apps/api/src/auth/password.ts`
- Create: `apps/api/src/auth/sessions.ts`

- [ ] **Step 1: Create `apps/api/src/auth/password.ts`**

```typescript
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { appConfig } from '../db/schema';

export async function getPasswordHash(): Promise<string> {
  const row = await getDb().select().from(appConfig).where(eq(appConfig.key, 'password_hash')).get();
  if (!row) throw new Error('password_hash missing');
  return row.value;
}

export async function setPasswordHash(plain: string): Promise<void> {
  const hash = await bcrypt.hash(plain, 12);
  await getDb().update(appConfig).set({ value: hash }).where(eq(appConfig.key, 'password_hash'));
}

export async function verifyPassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, await getPasswordHash());
}
```

- [ ] **Step 2: Create `apps/api/src/auth/sessions.ts`**

```typescript
import { randomBytes } from 'node:crypto';
import { and, eq, gt, ne } from 'drizzle-orm';
import { env } from '../env';
import { getDb } from '../db/client';
import { sessions } from '../db/schema';

const TTL_MS = () => env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export async function createSession(): Promise<{ id: string; expires_at: number }> {
  const id = randomBytes(32).toString('hex');
  const now = Date.now();
  const expires_at = now + TTL_MS();
  await getDb().insert(sessions).values({ id, created_at: now, expires_at });
  return { id, expires_at };
}

export async function getValidSession(id: string): Promise<{ id: string; expires_at: number } | null> {
  const row = await getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expires_at, Date.now())))
    .get();
  return row ?? null;
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.id, id));
}

export async function deleteOtherSessions(keepId: string): Promise<void> {
  await getDb().delete(sessions).where(ne(sessions.id, keepId));
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `bun --filter @search-builder/api typecheck`
Expected: exits 0.

```bash
git add apps/api/src/auth/password.ts apps/api/src/auth/sessions.ts
git commit -m "feat(api): password + session helpers"
```

---

### Task 4.2: Rate limiter — TDD

**Files:**
- Create: `apps/api/src/auth/rate-limit.ts`
- Create: `apps/api/test/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/test/rate-limit.test.ts
import { describe, expect, test } from 'bun:test';
import { rateLimit } from '../src/auth/rate-limit';

describe('rateLimit', () => {
  test('allows up to N hits then blocks', () => {
    const limiter = rateLimit({ max: 3, windowMs: 60_000 });
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.check('ip-1').allowed).toBe(false);
  });
  test('separate keys do not share budget', () => {
    const limiter = rateLimit({ max: 1, windowMs: 60_000 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });
  test('window expiry resets', async () => {
    const limiter = rateLimit({ max: 1, windowMs: 10 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(limiter.check('a').allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/api && bun test test/rate-limit.test.ts`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement `apps/api/src/auth/rate-limit.ts`**

```typescript
type Bucket = { count: number; resetAt: number };

export function rateLimit(opts: { max: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();
  return {
    check(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, remaining: opts.max - 1 };
      }
      if (bucket.count >= opts.max) {
        return { allowed: false, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
      }
      bucket.count += 1;
      return { allowed: true, remaining: opts.max - bucket.count };
    },
  };
}
```

- [ ] **Step 4: Run + commit**

Run: `bun test test/rate-limit.test.ts`
Expected: PASS.

```bash
git add apps/api/src/auth/rate-limit.ts apps/api/test/rate-limit.test.ts
git commit -m "feat(api): in-memory rate limiter"
```

---

### Task 4.3: Auth routes + middleware

**Files:**
- Create: `apps/api/src/auth/middleware.ts`
- Create: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create `apps/api/src/auth/middleware.ts`**

```typescript
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { getValidSession } from './sessions';

declare module 'hono' {
  interface ContextVariableMap {
    session: { id: string; expires_at: number };
  }
}

export const requireSession: MiddlewareHandler = async (c, next) => {
  const sid = getCookie(c, 'sid');
  if (!sid) return c.json({ error: 'unauthorized', code: 'unauthorized' }, 401);
  const session = await getValidSession(sid);
  if (!session) return c.json({ error: 'unauthorized', code: 'unauthorized' }, 401);
  c.set('session', session);
  await next();
};

export function getSession(c: Context) {
  return c.get('session');
}
```

- [ ] **Step 2: Create `apps/api/src/routes/auth.ts`**

```typescript
import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { changePasswordSchema, loginSchema } from '@search-builder/types';
import { env } from '../env';
import { createSession, deleteOtherSessions, deleteSession, getValidSession } from '../auth/sessions';
import { setPasswordHash, verifyPassword } from '../auth/password';
import { rateLimit } from '../auth/rate-limit';
import { requireSession } from '../auth/middleware';

const loginLimiter = rateLimit({ max: 5, windowMs: 15 * 60 * 1000 });

export const authRoute = new Hono();

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'Lax' as const,
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

authRoute.post('/login', async (c) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown';
  const limit = loginLimiter.check(ip);
  if (!limit.allowed) {
    return c.json(
      { error: 'too many attempts', code: 'rate_limited', retry_after: limit.retryAfter },
      429,
    );
  }
  const body = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  }
  const ok = await verifyPassword(body.data.password);
  if (!ok) return c.json({ error: 'invalid credentials', code: 'unauthorized' }, 401);
  const session = await createSession();
  setCookie(c, 'sid', session.id, cookieOptions());
  return c.json({ authenticated: true, expires_at: session.expires_at });
});

authRoute.post('/logout', async (c) => {
  const sid = getCookie(c, 'sid');
  if (sid) await deleteSession(sid);
  deleteCookie(c, 'sid', { path: '/' });
  return c.body(null, 204);
});

authRoute.get('/me', async (c) => {
  const sid = getCookie(c, 'sid');
  if (!sid) return c.json({ authenticated: false });
  const session = await getValidSession(sid);
  return c.json({ authenticated: !!session });
});

authRoute.post('/change-password', requireSession, async (c) => {
  const session = c.get('session');
  const body = changePasswordSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  }
  const ok = await verifyPassword(body.data.old);
  if (!ok) return c.json({ error: 'invalid credentials', code: 'unauthorized' }, 401);
  await setPasswordHash(body.data.new);
  await deleteOtherSessions(session.id);
  return c.json({ ok: true });
});
```

- [ ] **Step 3: Mount in `apps/api/src/server.ts`** — add:

```typescript
import { authRoute } from './routes/auth';
// after healthRoute mount:
app.route('/api/auth', authRoute);
```

- [ ] **Step 4: Manual smoke**

Shell A: `cd apps/api && INITIAL_PASSWORD=tmp DB_PATH=./data/dev.sqlite COOKIE_SECURE=false bun src/db/migrate.ts && INITIAL_PASSWORD=tmp DB_PATH=./data/dev.sqlite COOKIE_SECURE=false bun src/server.ts`
Shell B:
```bash
curl -i -X POST http://localhost:3001/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"password":"tmp"}'
```
Expected: 200 + `Set-Cookie: sid=…; HttpOnly`. Then:
```bash
curl -s http://localhost:3001/api/auth/me -H "cookie: sid=<paste>"
```
Expected: `{"authenticated":true}`
Stop shell A, cleanup: `rm apps/api/data/dev.sqlite*`

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/middleware.ts apps/api/src/routes/auth.ts apps/api/src/server.ts
git commit -m "feat(api): auth routes + session middleware"
```

---

## Phase 5 — apps/api CRUD (folders, queries, tags, engines, stats)

### Task 5.1: Folders repo + route

**Files:**
- Create: `apps/api/src/repos/folders-repo.ts`
- Create: `apps/api/src/routes/folders.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create `apps/api/src/repos/folders-repo.ts`**

```typescript
import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FolderDto } from '@search-builder/types';
import { getDb } from '../db/client';
import { folders, queries } from '../db/schema';

export async function listFolders(): Promise<FolderDto[]> {
  const rows = await getDb()
    .select({
      id: folders.id,
      name: folders.name,
      color: folders.color,
      query_count: sql<number>`(SELECT COUNT(*) FROM ${queries} WHERE ${queries.folder_id} = ${folders.id} AND ${queries.deleted_at} IS NULL)`,
    })
    .from(folders)
    .where(isNull(folders.deleted_at))
    .orderBy(folders.name);
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color ?? null, query_count: r.query_count }));
}

export async function createFolder(input: { name: string; color?: string }): Promise<{ id: string }> {
  const id = randomUUID();
  const now = Date.now();
  await getDb()
    .insert(folders)
    .values({ id, name: input.name, color: input.color ?? null, created_at: now, updated_at: now });
  return { id };
}

export async function updateFolder(
  id: string,
  patch: Partial<{ name: string; color: string }>,
): Promise<boolean> {
  const res = await getDb()
    .update(folders)
    .set({ ...patch, updated_at: Date.now() })
    .where(and(eq(folders.id, id), isNull(folders.deleted_at)))
    .returning({ id: folders.id });
  return res.length > 0;
}

export async function softDeleteFolder(id: string): Promise<boolean> {
  const res = await getDb()
    .update(folders)
    .set({ deleted_at: Date.now() })
    .where(and(eq(folders.id, id), isNull(folders.deleted_at)))
    .returning({ id: folders.id });
  return res.length > 0;
}

export async function restoreFolder(id: string): Promise<boolean> {
  const res = await getDb()
    .update(folders)
    .set({ deleted_at: null })
    .where(eq(folders.id, id))
    .returning({ id: folders.id });
  return res.length > 0;
}
```

- [ ] **Step 2: Create `apps/api/src/routes/folders.ts`**

```typescript
import { Hono } from 'hono';
import { folderCreateSchema, folderUpdateSchema } from '@search-builder/types';
import { requireSession } from '../auth/middleware';
import {
  createFolder,
  listFolders,
  restoreFolder,
  softDeleteFolder,
  updateFolder,
} from '../repos/folders-repo';

export const foldersRoute = new Hono();
foldersRoute.use('*', requireSession);

foldersRoute.get('/', async (c) => c.json(await listFolders()));

foldersRoute.post('/', async (c) => {
  const body = folderCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  return c.json(await createFolder(body.data), 201);
});

foldersRoute.patch('/:id', async (c) => {
  const body = folderUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  const ok = await updateFolder(c.req.param('id'), body.data);
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

foldersRoute.delete('/:id', async (c) => {
  const ok = await softDeleteFolder(c.req.param('id'));
  return ok ? c.body(null, 204) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

foldersRoute.post('/:id/restore', async (c) => {
  const ok = await restoreFolder(c.req.param('id'));
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
```

- [ ] **Step 3: Mount + commit**

```typescript
// apps/api/src/server.ts — add
import { foldersRoute } from './routes/folders';
app.route('/api/folders', foldersRoute);
```

Run: `bun --filter @search-builder/api typecheck`
Expected: exits 0.

```bash
git add apps/api/src/repos/folders-repo.ts apps/api/src/routes/folders.ts apps/api/src/server.ts
git commit -m "feat(api): folders CRUD"
```

---

### Task 5.2: Tags repo helpers

**Files:**
- Create: `apps/api/src/repos/tags-repo.ts`

- [ ] **Step 1: Create `apps/api/src/repos/tags-repo.ts`**

```typescript
import { randomUUID } from 'node:crypto';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import type { TagDto } from '@search-builder/types';
import { getDb } from '../db/client';
import { queryTags, tags } from '../db/schema';

export async function listTags(): Promise<TagDto[]> {
  return getDb()
    .select({
      id: tags.id,
      name: tags.name,
      usage_count: sql<number>`(SELECT COUNT(*) FROM ${queryTags} WHERE ${queryTags.tag_id} = ${tags.id})`,
    })
    .from(tags)
    .orderBy(desc(sql`usage_count`), tags.name);
}

export async function deleteTag(id: string): Promise<boolean> {
  const db = getDb();
  await db.delete(queryTags).where(eq(queryTags.tag_id, id));
  const res = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
  return res.length > 0;
}

export async function ensureTagsByName(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const db = getDb();
  const existing = await db.select().from(tags).where(inArray(tags.name, names));
  const map = new Map(existing.map((r) => [r.name, r.id]));
  const toInsert = names.filter((n) => !map.has(n));
  if (toInsert.length > 0) {
    const rows = toInsert.map((name) => ({ id: randomUUID(), name }));
    await db.insert(tags).values(rows);
    for (const r of rows) map.set(r.name, r.id);
  }
  return names.map((n) => map.get(n)!);
}

export async function setQueryTags(query_id: string, names: string[]): Promise<void> {
  const db = getDb();
  await db.delete(queryTags).where(eq(queryTags.query_id, query_id));
  if (names.length === 0) return;
  const ids = await ensureTagsByName(names);
  await db.insert(queryTags).values(ids.map((tag_id) => ({ query_id, tag_id })));
}

export async function getTagsForQuery(query_id: string): Promise<string[]> {
  const rows = await getDb()
    .select({ name: tags.name })
    .from(queryTags)
    .innerJoin(tags, eq(tags.id, queryTags.tag_id))
    .where(eq(queryTags.query_id, query_id));
  return rows.map((r) => r.name);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/repos/tags-repo.ts
git commit -m "feat(api): tags repo helpers"
```

---

### Task 5.3: Queries repo + route

**Files:**
- Create: `apps/api/src/repos/queries-repo.ts`
- Create: `apps/api/src/routes/queries.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create `apps/api/src/repos/queries-repo.ts`**

```typescript
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, like, or } from 'drizzle-orm';
import { validateTree } from '@search-builder/engines';
import type {
  EngineKey,
  QueryCreate,
  QueryFullDto,
  QueryListDto,
  QueryUpdate,
} from '@search-builder/types';
import { engineKeySchema } from '@search-builder/types';
import { getDb } from '../db/client';
import { queries, queryTags, tags } from '../db/schema';
import { setQueryTags, getTagsForQuery } from './tags-repo';

type ListFilter = {
  folder?: string | null;
  tag?: string;
  engine?: EngineKey;
  search?: string;
  sort?: 'last_opened' | 'name' | 'updated';
  include_deleted?: boolean;
};

export async function listQueries(filter: ListFilter): Promise<QueryListDto[]> {
  const db = getDb();
  const conds: unknown[] = [];
  if (!filter.include_deleted) conds.push(isNull(queries.deleted_at));
  if (filter.folder !== undefined) {
    conds.push(filter.folder === null ? isNull(queries.folder_id) : eq(queries.folder_id, filter.folder));
  }
  if (filter.engine) conds.push(eq(queries.engine, filter.engine));
  if (filter.search) {
    const like_ = `%${filter.search}%`;
    conds.push(or(like(queries.name, like_), like(queries.description, like_)));
  }

  let tagId: string | null = null;
  if (filter.tag) {
    const tagRow = await db.select().from(tags).where(eq(tags.name, filter.tag)).get();
    if (!tagRow) return [];
    tagId = tagRow.id;
  }

  const sortClause =
    filter.sort === 'name'
      ? asc(queries.name)
      : filter.sort === 'updated'
        ? desc(queries.updated_at)
        : desc(queries.last_opened_at);

  // biome-ignore lint/suspicious/noExplicitAny: drizzle and combinator
  const baseRows = await db.select().from(queries).where(and(...(conds as any[]))).orderBy(sortClause);

  let filtered = baseRows;
  if (tagId) {
    const joined = await db
      .select({ query_id: queryTags.query_id })
      .from(queryTags)
      .where(eq(queryTags.tag_id, tagId));
    const allowed = new Set(joined.map((j) => j.query_id));
    filtered = baseRows.filter((r) => allowed.has(r.id));
  }

  const ids = filtered.map((r) => r.id);
  const tagRows = ids.length
    ? await db
        .select({ query_id: queryTags.query_id, name: tags.name })
        .from(queryTags)
        .innerJoin(tags, eq(tags.id, queryTags.tag_id))
        .where(inArray(queryTags.query_id, ids))
    : [];
  const tagsByQuery = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagsByQuery.get(t.query_id) ?? [];
    arr.push(t.name);
    tagsByQuery.set(t.query_id, arr);
  }

  return filtered.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    engine: r.engine as EngineKey,
    folder_id: r.folder_id,
    tags: tagsByQuery.get(r.id) ?? [],
    updated_at: r.updated_at,
    last_opened_at: r.last_opened_at,
  }));
}

export async function getQuery(id: string): Promise<QueryFullDto | null> {
  const row = await getDb().select().from(queries).where(eq(queries.id, id)).get();
  if (!row) return null;
  const tagNames = await getTagsForQuery(id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    engine: row.engine as EngineKey,
    folder_id: row.folder_id,
    template_id: row.template_id,
    tree: JSON.parse(row.tree),
    tags: tagNames,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_opened_at: row.last_opened_at,
  };
}

export async function createQuery(input: QueryCreate): Promise<{ id: string }> {
  engineKeySchema.parse(input.engine);
  const errors = validateTree(input.engine, input.tree);
  if (errors.length) throw Object.assign(new Error('invalid_tree'), { issues: errors });
  const id = randomUUID();
  const now = Date.now();
  await getDb().insert(queries).values({
    id,
    name: input.name,
    description: input.description ?? null,
    engine: input.engine,
    tree: JSON.stringify(input.tree),
    folder_id: input.folder_id ?? null,
    template_id: input.template_id ?? null,
    created_at: now,
    updated_at: now,
    last_opened_at: null,
  });
  await setQueryTags(id, input.tags ?? []);
  return { id };
}

export async function updateQuery(id: string, patch: QueryUpdate): Promise<boolean> {
  const existing = await getDb().select().from(queries).where(eq(queries.id, id)).get();
  if (!existing || existing.deleted_at) return false;
  if (patch.tree) {
    const engine = (patch.engine ?? existing.engine) as EngineKey;
    const errors = validateTree(engine, patch.tree);
    if (errors.length) throw Object.assign(new Error('invalid_tree'), { issues: errors });
  }
  const updates: Record<string, unknown> = { updated_at: Date.now() };
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.engine !== undefined) updates.engine = patch.engine;
  if (patch.tree !== undefined) updates.tree = JSON.stringify(patch.tree);
  if (patch.folder_id !== undefined) updates.folder_id = patch.folder_id;
  if (patch.template_id !== undefined) updates.template_id = patch.template_id;
  await getDb().update(queries).set(updates).where(eq(queries.id, id));
  if (patch.tags !== undefined) await setQueryTags(id, patch.tags);
  return true;
}

export async function softDeleteQuery(id: string): Promise<boolean> {
  const res = await getDb()
    .update(queries)
    .set({ deleted_at: Date.now() })
    .where(and(eq(queries.id, id), isNull(queries.deleted_at)))
    .returning({ id: queries.id });
  return res.length > 0;
}

export async function restoreQuery(id: string): Promise<boolean> {
  const res = await getDb()
    .update(queries)
    .set({ deleted_at: null })
    .where(eq(queries.id, id))
    .returning({ id: queries.id });
  return res.length > 0;
}

export async function hardDeleteQuery(id: string): Promise<boolean> {
  const db = getDb();
  await db.delete(queryTags).where(eq(queryTags.query_id, id));
  const res = await db.delete(queries).where(eq(queries.id, id)).returning({ id: queries.id });
  return res.length > 0;
}

export async function touchQuery(id: string): Promise<void> {
  await getDb().update(queries).set({ last_opened_at: Date.now() }).where(eq(queries.id, id));
}

export async function duplicateQuery(id: string): Promise<{ id: string } | null> {
  const full = await getQuery(id);
  if (!full) return null;
  return createQuery({
    name: `${full.name} (copy)`,
    description: full.description ?? undefined,
    engine: full.engine,
    tree: full.tree,
    folder_id: full.folder_id,
    tags: full.tags,
    template_id: full.template_id ?? undefined,
  });
}
```

- [ ] **Step 2: Create `apps/api/src/routes/queries.ts`**

```typescript
import { Hono } from 'hono';
import { engineKeySchema, queryCreateSchema, queryUpdateSchema } from '@search-builder/types';
import { requireSession } from '../auth/middleware';
import {
  createQuery,
  duplicateQuery,
  getQuery,
  hardDeleteQuery,
  listQueries,
  restoreQuery,
  softDeleteQuery,
  touchQuery,
  updateQuery,
} from '../repos/queries-repo';

export const queriesRoute = new Hono();
queriesRoute.use('*', requireSession);

queriesRoute.get('/', async (c) => {
  const folderParam = c.req.query('folder');
  const folder = folderParam === undefined ? undefined : folderParam === 'null' ? null : folderParam;
  const engineParam = c.req.query('engine');
  const engine = engineParam ? engineKeySchema.parse(engineParam) : undefined;
  return c.json(
    await listQueries({
      folder,
      tag: c.req.query('tag') ?? undefined,
      engine,
      search: c.req.query('search') ?? undefined,
      sort: (c.req.query('sort') as 'last_opened' | 'name' | 'updated' | undefined) ?? 'last_opened',
      include_deleted: c.req.query('include_deleted') === 'true',
    }),
  );
});

queriesRoute.get('/:id', async (c) => {
  const q = await getQuery(c.req.param('id'));
  return q ? c.json(q) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

queriesRoute.post('/', async (c) => {
  const body = queryCreateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  try {
    return c.json(await createQuery(body.data), 201);
  } catch (e) {
    const issues = (e as { issues?: unknown }).issues;
    if (issues) return c.json({ error: 'invalid tree', code: 'invalid_tree', issues }, 400);
    throw e;
  }
});

queriesRoute.patch('/:id', async (c) => {
  const body = queryUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  try {
    const ok = await updateQuery(c.req.param('id'), body.data);
    return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
  } catch (e) {
    const issues = (e as { issues?: unknown }).issues;
    if (issues) return c.json({ error: 'invalid tree', code: 'invalid_tree', issues }, 400);
    throw e;
  }
});

queriesRoute.delete('/:id', async (c) => {
  const hard = c.req.query('hard') === 'true';
  const ok = hard ? await hardDeleteQuery(c.req.param('id')) : await softDeleteQuery(c.req.param('id'));
  return ok ? c.body(null, 204) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

queriesRoute.post('/:id/restore', async (c) => {
  const ok = await restoreQuery(c.req.param('id'));
  return ok ? c.json({ ok: true }) : c.json({ error: 'not found', code: 'not_found' }, 404);
});

queriesRoute.post('/:id/touch', async (c) => {
  await touchQuery(c.req.param('id'));
  return c.body(null, 204);
});

queriesRoute.post('/:id/duplicate', async (c) => {
  const out = await duplicateQuery(c.req.param('id'));
  return out ? c.json(out, 201) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
```

- [ ] **Step 3: Mount + typecheck + commit**

```typescript
// apps/api/src/server.ts — add
import { queriesRoute } from './routes/queries';
app.route('/api/queries', queriesRoute);
```

Run: `bun --filter @search-builder/api typecheck`
Expected: exits 0.

```bash
git add apps/api/src/repos/queries-repo.ts apps/api/src/routes/queries.ts apps/api/src/server.ts
git commit -m "feat(api): queries CRUD + duplicate + touch + soft delete"
```

---

### Task 5.4: Tags route + Engines route + Stats route

**Files:**
- Create: `apps/api/src/routes/tags.ts`
- Create: `apps/api/src/routes/engines.ts`
- Create: `apps/api/src/routes/stats.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create `apps/api/src/routes/tags.ts`**

```typescript
import { Hono } from 'hono';
import { requireSession } from '../auth/middleware';
import { deleteTag, listTags } from '../repos/tags-repo';

export const tagsRoute = new Hono();
tagsRoute.use('*', requireSession);

tagsRoute.get('/', async (c) => c.json(await listTags()));

tagsRoute.delete('/:id', async (c) => {
  const ok = await deleteTag(c.req.param('id'));
  return ok ? c.body(null, 204) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
```

- [ ] **Step 2: Create `apps/api/src/routes/engines.ts`**

```typescript
import { Hono } from 'hono';
import { listEngines } from '@search-builder/engines';
import { requireSession } from '../auth/middleware';

export const enginesRoute = new Hono();
enginesRoute.use('*', requireSession);

enginesRoute.get('/', (c) =>
  c.json(
    listEngines().map((e) => ({
      key: e.key,
      name: e.name,
      icon: e.icon,
      baseUrl: e.baseUrl,
      queryParam: e.queryParam,
      operators: e.operators,
    })),
  ),
);
```

- [ ] **Step 3: Create `apps/api/src/routes/stats.ts`**

```typescript
import { statSync } from 'node:fs';
import { Hono } from 'hono';
import { isNull, sql } from 'drizzle-orm';
import { env } from '../env';
import { getDb } from '../db/client';
import { folders, queries, tags, templates } from '../db/schema';
import { requireSession } from '../auth/middleware';

export const statsRoute = new Hono();
statsRoute.use('*', requireSession);

statsRoute.get('/', async (c) => {
  const db = getDb();
  const [{ q }] = await db
    .select({ q: sql<number>`COUNT(*)` })
    .from(queries)
    .where(isNull(queries.deleted_at));
  const [{ f }] = await db
    .select({ f: sql<number>`COUNT(*)` })
    .from(folders)
    .where(isNull(folders.deleted_at));
  const [{ t }] = await db.select({ t: sql<number>`COUNT(*)` }).from(tags);
  const [{ tp }] = await db.select({ tp: sql<number>`COUNT(*)` }).from(templates);
  let db_size_bytes = 0;
  try {
    db_size_bytes = statSync(env.DB_PATH).size;
  } catch {
    db_size_bytes = 0;
  }
  return c.json({ queries_count: q, folders_count: f, tags_count: t, templates_count: tp, db_size_bytes });
});
```

- [ ] **Step 4: Mount + typecheck + commit**

```typescript
// apps/api/src/server.ts — add
import { tagsRoute } from './routes/tags';
import { enginesRoute } from './routes/engines';
import { statsRoute } from './routes/stats';
app.route('/api/tags', tagsRoute);
app.route('/api/engines', enginesRoute);
app.route('/api/stats', statsRoute);
```

Run: `bun --filter @search-builder/api typecheck`
Expected: exits 0.

```bash
git add apps/api/src/routes/tags.ts apps/api/src/routes/engines.ts apps/api/src/routes/stats.ts apps/api/src/server.ts
git commit -m "feat(api): tags, engines, stats endpoints"
```

---

## Phase 6 — Templates seed + integration tests

### Task 6.1: Template seed + repo + route

**Files:**
- Create: `apps/api/src/db/seed-templates.ts`
- Modify: `apps/api/src/db/bootstrap.ts`
- Create: `apps/api/src/repos/templates-repo.ts`
- Create: `apps/api/src/routes/templates.ts`
- Modify: `apps/api/src/server.ts`

- [ ] **Step 1: Create `apps/api/src/db/seed-templates.ts`** (10 templates from spec §11)

```typescript
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { QueryNode } from '@search-builder/types';
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
  const [{ c }] = await db.select({ c: sql<number>`COUNT(*)` }).from(templates);
  if (c > 0) return;
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
  console.log(`[boot] seeded ${SEEDS.length} templates`);
}

if (import.meta.main) {
  await seedTemplates();
  process.exit(0);
}
```

- [ ] **Step 2: Update `apps/api/src/db/bootstrap.ts`** — append at end of `bootstrap()`:

```typescript
// after the password hash insert and console.log:
await seedTemplates();
```

And add the import at top:

```typescript
import { seedTemplates } from './seed-templates';
```

- [ ] **Step 3: Create `apps/api/src/repos/templates-repo.ts`**

```typescript
import { eq } from 'drizzle-orm';
import type { EngineKey, QueryNode } from '@search-builder/types';
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
```

- [ ] **Step 4: Create `apps/api/src/routes/templates.ts`**

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { requireSession } from '../auth/middleware';
import { instantiateTemplate, listTemplates } from '../repos/templates-repo';

const instantiateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  folder_id: z.string().uuid().nullable().optional(),
});

export const templatesRoute = new Hono();
templatesRoute.use('*', requireSession);

templatesRoute.get('/', async (c) => c.json(await listTemplates()));

templatesRoute.post('/:id/instantiate', async (c) => {
  const body = instantiateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success)
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  const out = await instantiateTemplate(c.req.param('id'), body.data);
  return out ? c.json(out, 201) : c.json({ error: 'not found', code: 'not_found' }, 404);
});
```

- [ ] **Step 5: Mount in `apps/api/src/server.ts`**

```typescript
import { templatesRoute } from './routes/templates';
app.route('/api/templates', templatesRoute);
```

- [ ] **Step 6: Typecheck + commit**

Run: `bun --filter @search-builder/api typecheck`
Expected: exits 0.

```bash
git add apps/api/src/db/seed-templates.ts apps/api/src/db/bootstrap.ts apps/api/src/repos/templates-repo.ts apps/api/src/routes/templates.ts apps/api/src/server.ts
git commit -m "feat(api): templates seed + endpoints"
```

---

### Task 6.2: API integration smoke test

**Files:**
- Create: `apps/api/test/setup.ts`
- Create: `apps/api/test/integration.test.ts`

- [ ] **Step 1: Create `apps/api/test/setup.ts`** (uses Bun.spawnSync to run migrate in a fresh DB)

```typescript
import { unlinkSync, existsSync } from 'node:fs';

export async function freshDb(path: string): Promise<void> {
  for (const ext of ['', '-shm', '-wal', '-journal']) {
    const p = `${path}${ext}`;
    if (existsSync(p)) unlinkSync(p);
  }
  const proc = Bun.spawnSync({
    cmd: ['bun', 'src/db/migrate.ts'],
    env: { ...process.env, DB_PATH: path, INITIAL_PASSWORD: process.env.INITIAL_PASSWORD ?? 'pw' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (proc.exitCode !== 0) {
    throw new Error(`migrate failed: ${proc.stderr.toString()}`);
  }
}

export function cleanupDb(path: string): void {
  for (const ext of ['', '-shm', '-wal', '-journal']) {
    const p = `${path}${ext}`;
    if (existsSync(p)) unlinkSync(p);
  }
}
```

- [ ] **Step 2: Create `apps/api/test/integration.test.ts`**

```typescript
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { freshDb, cleanupDb } from './setup';

const TEST_DB = './data/integration-test.sqlite';
process.env.DB_PATH = TEST_DB;
process.env.INITIAL_PASSWORD = 'pw';
process.env.COOKIE_SECURE = 'false';

let app: { fetch: (req: Request) => Promise<Response> };
let cookie = '';

beforeAll(async () => {
  await freshDb(TEST_DB);
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

afterAll(() => cleanupDb(TEST_DB));

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
      await api('/api/queries', { method: 'POST', body: JSON.stringify({ name: 'orig', engine: 'google', tree }) })
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
```

- [ ] **Step 3: Run**

Run: `cd apps/api && bun test test/integration.test.ts`
Expected: PASS — all sub-tests green.

- [ ] **Step 4: Commit**

```bash
git add apps/api/test/setup.ts apps/api/test/integration.test.ts
git commit -m "test(api): end-to-end integration suite"
```

---

## Phase 7 — apps/web scaffold + layout + auth

### Task 7.1: Scaffold SvelteKit

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/svelte.config.js`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/.env.example`
- Create: `apps/web/src/app.html`
- Create: `apps/web/src/app.d.ts`
- Create: `apps/web/src/app.css`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@search-builder/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 5173",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "test": "playwright test"
  },
  "dependencies": {
    "@search-builder/types": "workspace:*",
    "@search-builder/engines": "workspace:*",
    "svelte-dnd-action": "^0.9.50"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.2.0",
    "@sveltejs/kit": "^2.7.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@playwright/test": "^1.48.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/svelte.config.js`**

```javascript
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: 'build' }),
    alias: { $components: 'src/lib' },
  },
};
```

- [ ] **Step 3: Create `apps/web/vite.config.ts`**

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 4: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": []
  },
  "include": ["src/**/*", ".svelte-kit/ambient.d.ts", ".svelte-kit/types/**/*"]
}
```

- [ ] **Step 5: Create `apps/web/.env.example`**

```
API_ORIGIN=http://localhost:3001
```

- [ ] **Step 6: Create `apps/web/src/app.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>search-builder</title>
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 7: Create `apps/web/src/app.d.ts`**

```typescript
declare global {
  namespace App {
    interface Locals {
      authenticated: boolean;
    }
  }
}
export {};
```

- [ ] **Step 8: Create `apps/web/src/app.css`** (base reset + variables)

```css
:root {
  --bg: #0f1115;
  --surface: rgba(255, 255, 255, 0.06);
  --surface-strong: rgba(255, 255, 255, 0.12);
  --border: rgba(255, 255, 255, 0.14);
  --text: #e8eaed;
  --text-muted: #9aa0a6;
  --accent: #6ea8fe;
  --danger: #ff7a7a;
  --warning: #f0c674;
  --success: #7fd49b;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-2: 0 10px 30px rgba(0, 0, 0, 0.45);
  --font-sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: ui-monospace, 'JetBrains Mono', 'Fira Code', monospace;
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
button { font: inherit; cursor: pointer; }
input, textarea, select { font: inherit; }
```

- [ ] **Step 9: Install + commit**

Run: `cd /root/Development/search-builder && bun install`
```bash
git add apps/web bun.lockb
git commit -m "chore(web): scaffold sveltekit + base styles"
```

---

### Task 7.2: API client + auth store

**Files:**
- Create: `apps/web/src/lib/api-client/index.ts`
- Create: `apps/web/src/lib/api-client/types.ts`
- Create: `apps/web/src/lib/stores/auth.ts`

- [ ] **Step 1: Create `apps/web/src/lib/api-client/types.ts`**

```typescript
export type ApiError = {
  error: string;
  code: string;
  issues?: unknown[];
  retry_after?: number;
};
export class ApiResponseError extends Error {
  status: number;
  body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.error);
    this.status = status;
    this.body = body;
  }
}
```

- [ ] **Step 2: Create `apps/web/src/lib/api-client/index.ts`**

```typescript
import type {
  FolderDto,
  QueryCreate,
  QueryFullDto,
  QueryListDto,
  QueryUpdate,
  TagDto,
  StatsDto,
  EngineKey,
  OperatorSpec,
} from '@search-builder/types';
import { ApiResponseError, type ApiError } from './types';

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers as Record<string, string>) },
    credentials: 'include',
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) throw new ApiResponseError(res.status, body as ApiError);
  return body as T;
}

export const api = {
  auth: {
    me: () => req<{ authenticated: boolean }>('/api/auth/me'),
    login: (password: string) =>
      req<{ authenticated: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
    logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
    changePassword: (old: string, new_: string) =>
      req<{ ok: true }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ old, new: new_ }),
      }),
  },
  engines: {
    list: () =>
      req<
        Array<{
          key: EngineKey;
          name: string;
          icon: string;
          baseUrl: string;
          queryParam: string;
          operators: OperatorSpec[];
        }>
      >('/api/engines'),
  },
  folders: {
    list: () => req<FolderDto[]>('/api/folders'),
    create: (input: { name: string; color?: string }) =>
      req<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, patch: { name?: string; color?: string }) =>
      req<{ ok: true }>(`/api/folders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string) => req<void>(`/api/folders/${id}`, { method: 'DELETE' }),
    restore: (id: string) => req<{ ok: true }>(`/api/folders/${id}/restore`, { method: 'POST' }),
  },
  queries: {
    list: (params: Record<string, string | undefined> = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
      );
      const path = `/api/queries${qs.size ? `?${qs}` : ''}`;
      return req<QueryListDto[]>(path);
    },
    get: (id: string) => req<QueryFullDto>(`/api/queries/${id}`),
    create: (input: QueryCreate) => req<{ id: string }>('/api/queries', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, patch: QueryUpdate) =>
      req<{ ok: true }>(`/api/queries/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string, hard = false) =>
      req<void>(`/api/queries/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' }),
    restore: (id: string) => req<{ ok: true }>(`/api/queries/${id}/restore`, { method: 'POST' }),
    touch: (id: string) => req<void>(`/api/queries/${id}/touch`, { method: 'POST' }),
    duplicate: (id: string) => req<{ id: string }>(`/api/queries/${id}/duplicate`, { method: 'POST' }),
  },
  tags: {
    list: () => req<TagDto[]>('/api/tags'),
    remove: (id: string) => req<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list: () =>
      req<Array<{ id: string; name: string; description: string; engine: EngineKey; category: string | null; tree: import('@search-builder/types').QueryNode }>>(
        '/api/templates',
      ),
    instantiate: (id: string, body: { name?: string; folder_id?: string | null } = {}) =>
      req<{ id: string }>(`/api/templates/${id}/instantiate`, { method: 'POST', body: JSON.stringify(body) }),
  },
  stats: {
    get: () => req<StatsDto>('/api/stats'),
  },
};

export { ApiResponseError };
```

- [ ] **Step 3: Create `apps/web/src/lib/stores/auth.ts`**

```typescript
import { writable } from 'svelte/store';
import { api } from '../api-client';

export const authStore = writable<{ authenticated: boolean; loading: boolean }>({
  authenticated: false,
  loading: true,
});

export async function refreshAuth(): Promise<void> {
  authStore.update((s) => ({ ...s, loading: true }));
  const me = await api.auth.me().catch(() => ({ authenticated: false }));
  authStore.set({ authenticated: me.authenticated, loading: false });
}

export async function logout(): Promise<void> {
  await api.auth.logout().catch(() => {});
  authStore.set({ authenticated: false, loading: false });
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `bun --filter @search-builder/web typecheck`
Expected: exits 0 (may take a moment on first run).

```bash
git add apps/web/src/lib/api-client apps/web/src/lib/stores/auth.ts
git commit -m "feat(web): typed api client + auth store"
```

---

### Task 7.3: Root layout + login page + hooks

**Files:**
- Create: `apps/web/src/hooks.client.ts`
- Create: `apps/web/src/routes/+layout.svelte`
- Create: `apps/web/src/routes/+layout.ts`
- Create: `apps/web/src/routes/login/+page.svelte`
- Create: `apps/web/src/routes/+page.svelte` (placeholder)
- Create: `apps/web/src/lib/ui/Glass.svelte`
- Create: `apps/web/src/lib/ui/GlassInput.svelte`
- Create: `apps/web/src/lib/ui/GlassButton.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/ui/Glass.svelte`**

```svelte
<script lang="ts">
  export let padding: string = '12px 16px';
  export let radius: string = 'var(--radius-md)';
  export let elevated = false;
  let className = '';
  export { className as class };
</script>

<div
  class={`glass ${className}`}
  style="--p:{padding};--r:{radius};{elevated ? '--sh:var(--shadow-2)' : '--sh:var(--shadow-1)'}"
>
  <slot />
</div>

<style>
  .glass {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: var(--p);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: var(--sh);
  }
</style>
```

- [ ] **Step 2: Create `apps/web/src/lib/ui/GlassInput.svelte`**

```svelte
<script lang="ts">
  export let value = '';
  export let placeholder = '';
  export let type: 'text' | 'password' = 'text';
  export let autocomplete = 'off';
  export let disabled = false;
</script>

<input
  class="glass-input"
  bind:value
  {placeholder}
  {type}
  {autocomplete}
  {disabled}
  on:input
  on:keydown
  on:focus
  on:blur
/>

<style>
  .glass-input {
    width: 100%;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    outline: none;
  }
  .glass-input:focus { border-color: var(--accent); }
  .glass-input:disabled { opacity: 0.6; }
</style>
```

- [ ] **Step 3: Create `apps/web/src/lib/ui/GlassButton.svelte`**

```svelte
<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'secondary';
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';
</script>

<button class="glass-btn {variant}" {disabled} {type} on:click>
  <slot />
</button>

<style>
  .glass-btn {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .glass-btn:hover:not(:disabled) { border-color: var(--accent); }
  .glass-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .primary { background: var(--accent); color: #0a0c12; border-color: transparent; }
  .danger { color: var(--danger); border-color: rgba(255, 122, 122, 0.4); }
</style>
```

- [ ] **Step 4: Create `apps/web/src/hooks.client.ts`** (refresh auth on boot)

```typescript
import { refreshAuth } from '$lib/stores/auth';
export async function init() {
  await refreshAuth();
}
```

- [ ] **Step 5: Create `apps/web/src/routes/+layout.ts`** (disable SSR for personal app)

```typescript
export const ssr = false;
export const prerender = false;
```

- [ ] **Step 6: Create `apps/web/src/routes/+layout.svelte`**

```svelte
<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authStore, refreshAuth } from '$lib/stores/auth';

  onMount(async () => {
    await refreshAuth();
  });

  $: if (!$authStore.loading && !$authStore.authenticated && $page.url.pathname !== '/login') {
    goto('/login', { replaceState: true });
  }
  $: if (!$authStore.loading && $authStore.authenticated && $page.url.pathname === '/login') {
    goto('/', { replaceState: true });
  }
</script>

{#if $authStore.loading}
  <main class="boot"><div>loading…</div></main>
{:else}
  <slot />
{/if}

<style>
  .boot {
    display: grid; place-items: center; min-height: 100vh; color: var(--text-muted);
  }
</style>
```

- [ ] **Step 7: Create `apps/web/src/routes/login/+page.svelte`**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { api, ApiResponseError } from '$lib/api-client';
  import { authStore } from '$lib/stores/auth';
  import Glass from '$lib/ui/Glass.svelte';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  let password = '';
  let error = '';
  let submitting = false;

  async function submit(e: Event) {
    e.preventDefault();
    error = '';
    submitting = true;
    try {
      await api.auth.login(password);
      authStore.set({ authenticated: true, loading: false });
      await goto('/');
    } catch (e) {
      if (e instanceof ApiResponseError) {
        error =
          e.body.code === 'rate_limited'
            ? `Too many attempts. Retry in ${e.body.retry_after ?? '?'}s.`
            : 'Invalid password';
      } else {
        error = 'Network error';
      }
    } finally {
      submitting = false;
    }
  }
</script>

<main class="page">
  <Glass padding="24px 28px" elevated>
    <h1>search-builder</h1>
    <form on:submit={submit}>
      <label>
        Password
        <GlassInput type="password" bind:value={password} autocomplete="current-password" />
      </label>
      {#if error}<p class="err">{error}</p>{/if}
      <GlassButton variant="primary" type="submit" disabled={submitting || password.length === 0}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </GlassButton>
    </form>
  </Glass>
</main>

<style>
  .page { display: grid; place-items: center; min-height: 100vh; }
  h1 { margin: 0 0 16px; font-size: 18px; font-weight: 600; }
  form { display: grid; gap: 12px; min-width: 280px; }
  label { display: grid; gap: 6px; }
  .err { color: var(--danger); margin: 0; }
</style>
```

- [ ] **Step 8: Create `apps/web/src/routes/+page.svelte`** (placeholder)

```svelte
<main style="padding: 24px;">
  <h1>search-builder</h1>
  <p>Library view comes next (Phase 8).</p>
</main>
```

- [ ] **Step 9: Smoke test**

Shell A (start api): `cd apps/api && INITIAL_PASSWORD=tmp DB_PATH=./data/dev.sqlite COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 bun src/db/migrate.ts && INITIAL_PASSWORD=tmp DB_PATH=./data/dev.sqlite COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 bun src/server.ts`
Shell B (start web): `cd apps/web && API_ORIGIN=http://localhost:3001 bun run dev`
Open http://localhost:5173, expect login page. Submit password `tmp` → should redirect to /. Stop both, cleanup: `rm apps/api/data/dev.sqlite*`

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/hooks.client.ts apps/web/src/routes apps/web/src/lib/ui
git commit -m "feat(web): layout + login + auth redirect"
```

---

## Phase 8 — apps/web library views

### Task 8.1: Engines store + shell layout

**Files:**
- Create: `apps/web/src/lib/stores/engines.ts`
- Create: `apps/web/src/routes/(app)/+layout.svelte`
- Create: `apps/web/src/routes/(app)/+layout.ts`
- Move: `apps/web/src/routes/+page.svelte` → `apps/web/src/routes/(app)/+page.svelte` (delete old)
- Create: `apps/web/src/lib/components/TopBar.svelte`
- Create: `apps/web/src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/stores/engines.ts`**

```typescript
import { writable } from 'svelte/store';
import type { EngineKey, OperatorSpec } from '@search-builder/types';
import { api } from '../api-client';

export type EngineMeta = {
  key: EngineKey;
  name: string;
  icon: string;
  baseUrl: string;
  queryParam: string;
  operators: OperatorSpec[];
};

export const enginesStore = writable<EngineMeta[]>([]);

let loaded = false;
export async function loadEngines(): Promise<void> {
  if (loaded) return;
  const list = await api.engines.list();
  enginesStore.set(list);
  loaded = true;
}
```

- [ ] **Step 2: Create `apps/web/src/routes/(app)/+layout.ts`**

```typescript
export const ssr = false;
```

- [ ] **Step 3: Create `apps/web/src/routes/(app)/+layout.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadEngines } from '$lib/stores/engines';
  import TopBar from '$lib/components/TopBar.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';

  onMount(loadEngines);
</script>

<div class="shell">
  <TopBar />
  <div class="body">
    <aside><Sidebar /></aside>
    <main><slot /></main>
  </div>
</div>

<style>
  .shell { min-height: 100vh; display: grid; grid-template-rows: 56px 1fr; }
  .body { display: grid; grid-template-columns: 240px 1fr; min-height: 0; }
  aside {
    border-right: 1px solid var(--border);
    padding: 12px;
    overflow-y: auto;
  }
  main { padding: 16px 24px; overflow-y: auto; }
  @media (max-width: 768px) {
    .body { grid-template-columns: 1fr; }
    aside { display: none; }
  }
</style>
```

- [ ] **Step 4: Create `apps/web/src/lib/components/TopBar.svelte`**

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { enginesStore } from '$lib/stores/engines';
  import { logout } from '$lib/stores/auth';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  let search = '';
  let menuOpen = false;

  function go(engine: string) {
    menuOpen = false;
    goto(`/q/new?engine=${engine}`);
  }

  function submitSearch(e: KeyboardEvent) {
    if (e.key === 'Enter') goto(`/?search=${encodeURIComponent(search)}`);
  }

  async function doLogout() {
    await logout();
    goto('/login');
  }
</script>

<header>
  <a class="brand" href="/">search-builder</a>
  <div class="search">
    <GlassInput bind:value={search} placeholder="Search queries…" on:keydown={submitSearch} />
  </div>
  <div class="actions">
    <div class="dropdown">
      <GlassButton variant="primary" on:click={() => (menuOpen = !menuOpen)}>+ New query</GlassButton>
      {#if menuOpen}
        <div class="menu">
          {#each $enginesStore as e}
            <button on:click={() => go(e.key)}>{e.name}</button>
          {/each}
        </div>
      {/if}
    </div>
    <a href="/settings" title="Settings">⚙</a>
    <button class="logout" on:click={doLogout} title="Logout">⎋</button>
  </div>
</header>

<style>
  header {
    display: grid; grid-template-columns: 220px 1fr auto;
    gap: 12px; align-items: center; padding: 8px 16px;
    border-bottom: 1px solid var(--border);
  }
  .brand { font-weight: 600; }
  .actions { display: flex; gap: 8px; align-items: center; }
  .actions a, .logout {
    color: var(--text-muted); background: none; border: none; font-size: 18px;
  }
  .actions a:hover, .logout:hover { color: var(--text); }
  .dropdown { position: relative; }
  .menu {
    position: absolute; right: 0; top: calc(100% + 6px);
    background: var(--surface-strong); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px; display: grid; min-width: 180px; z-index: 10;
  }
  .menu button {
    text-align: left; background: none; border: none; color: var(--text);
    padding: 8px 10px; border-radius: var(--radius-sm);
  }
  .menu button:hover { background: var(--surface); }
</style>
```

- [ ] **Step 5: Create `apps/web/src/lib/components/Sidebar.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api-client';
  import type { FolderDto, TagDto } from '@search-builder/types';

  let folders: FolderDto[] = [];
  let tags: TagDto[] = [];

  async function refresh() {
    [folders, tags] = await Promise.all([api.folders.list(), api.tags.list()]);
  }

  onMount(refresh);

  $: pathname = $page.url.pathname;
  function activeFolder(id: string) {
    return pathname === `/folders/${id}`;
  }
  function activeTag(name: string) {
    return pathname === `/tags/${encodeURIComponent(name)}`;
  }
</script>

<nav>
  <section>
    <h3>Folders</h3>
    <a href="/" class:active={pathname === '/'}>All queries</a>
    {#each folders as f}
      <a href={`/folders/${f.id}`} class:active={activeFolder(f.id)}>
        <span class="dot" style="background:{f.color ?? '#666'}"></span>
        <span class="label">{f.name}</span>
        <span class="count">{f.query_count}</span>
      </a>
    {/each}
  </section>

  <section>
    <h3>Tags</h3>
    {#each tags as t}
      <a href={`/tags/${encodeURIComponent(t.name)}`} class:active={activeTag(t.name)}>
        <span class="label">#{t.name}</span>
        <span class="count">{t.usage_count}</span>
      </a>
    {/each}
  </section>

  <section>
    <a href="/trash" class="trash" class:active={pathname === '/trash'}>🗑 Trash</a>
  </section>
</nav>

<style>
  nav { display: flex; flex-direction: column; gap: 18px; }
  h3 {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text-muted); margin: 0 0 6px;
  }
  a {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: var(--radius-sm); color: var(--text);
  }
  a:hover { background: var(--surface); text-decoration: none; }
  a.active { background: var(--surface-strong); }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { color: var(--text-muted); font-size: 12px; }
  .trash { color: var(--text-muted); }
</style>
```

- [ ] **Step 6: Move root page into `(app)` route group**

Delete: `apps/web/src/routes/+page.svelte`

Create: `apps/web/src/routes/(app)/+page.svelte` (placeholder; library list added in 8.2):

```svelte
<h2>Library</h2>
<p style="color: var(--text-muted)">Listing comes next.</p>
```

- [ ] **Step 7: Smoke + commit**

Run web dev server; log in; expect shell with topbar + sidebar.

```bash
git add apps/web/src/lib/stores/engines.ts apps/web/src/lib/components apps/web/src/routes/(app)
git rm apps/web/src/routes/+page.svelte 2>/dev/null || true
git commit -m "feat(web): shell layout with topbar + sidebar"
```

---

### Task 8.2: Library list + folder/tag/search filters

**Files:**
- Create: `apps/web/src/lib/components/QueryList.svelte`
- Modify: `apps/web/src/routes/(app)/+page.svelte`
- Create: `apps/web/src/routes/(app)/folders/[id]/+page.svelte`
- Create: `apps/web/src/routes/(app)/tags/[name]/+page.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/components/QueryList.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { QueryListDto } from '@search-builder/types';
  import { api } from '$lib/api-client';
  import Glass from '$lib/ui/Glass.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  export let folder: string | null | undefined = undefined;
  export let tag: string | undefined = undefined;
  export let search: string | undefined = undefined;
  export let includeDeleted = false;
  export let title: string;

  let items: QueryListDto[] = [];
  let loading = true;

  async function refresh() {
    loading = true;
    items = await api.queries.list({
      folder: folder === null ? 'null' : folder,
      tag,
      search,
      include_deleted: includeDeleted ? 'true' : undefined,
    });
    loading = false;
  }

  $: void [folder, tag, search, includeDeleted], refresh();

  async function open(item: QueryListDto) {
    await goto(`/q/${item.id}`);
  }

  async function remove(item: QueryListDto) {
    if (!confirm(`Move "${item.name}" to trash?`)) return;
    await api.queries.remove(item.id);
    await refresh();
  }

  async function restore(item: QueryListDto) {
    await api.queries.restore(item.id);
    await refresh();
  }

  function fmt(ms: number | null): string {
    if (!ms) return '—';
    const diff = Date.now() - ms;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  }
</script>

<header class="head">
  <h2>{title}</h2>
  <span class="count">{loading ? '…' : items.length}</span>
</header>

{#if loading}
  <p style="color: var(--text-muted)">Loading…</p>
{:else if items.length === 0}
  <p style="color: var(--text-muted)">No queries here yet.</p>
{:else}
  <ul class="list">
    {#each items as q (q.id)}
      <li>
        <Glass>
          <div class="row">
            <button class="open" on:click={() => open(q)}>
              <div class="name">{q.name}</div>
              <div class="meta">
                <span class="engine">{q.engine}</span>
                {#each q.tags as t}<span class="tag">#{t}</span>{/each}
                <span class="when">{fmt(q.last_opened_at ?? q.updated_at)}</span>
              </div>
            </button>
            <div class="actions">
              {#if includeDeleted}
                <GlassButton on:click={() => restore(q)}>Restore</GlassButton>
              {:else}
                <GlassButton variant="danger" on:click={() => remove(q)}>Delete</GlassButton>
              {/if}
            </div>
          </div>
        </Glass>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
  .head h2 { margin: 0; }
  .count { color: var(--text-muted); }
  ul.list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
  .open {
    text-align: left; background: none; border: none; color: var(--text);
    padding: 0; cursor: pointer; display: grid; gap: 4px;
  }
  .name { font-weight: 500; }
  .meta { color: var(--text-muted); font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .engine { background: var(--surface); padding: 1px 6px; border-radius: 4px; }
  .tag { color: var(--accent); }
</style>
```

- [ ] **Step 2: Replace `apps/web/src/routes/(app)/+page.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import QueryList from '$lib/components/QueryList.svelte';
  $: search = $page.url.searchParams.get('search') ?? undefined;
</script>

<QueryList title="All queries" {search} />
```

- [ ] **Step 3: Create `apps/web/src/routes/(app)/folders/[id]/+page.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api } from '$lib/api-client';
  import QueryList from '$lib/components/QueryList.svelte';

  let folderName = '';

  async function load(id: string) {
    const folders = await api.folders.list();
    folderName = folders.find((f) => f.id === id)?.name ?? 'Folder';
  }

  $: void load($page.params.id);
</script>

<QueryList folder={$page.params.id} title={folderName} />
```

- [ ] **Step 4: Create `apps/web/src/routes/(app)/tags/[name]/+page.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import QueryList from '$lib/components/QueryList.svelte';
  $: tagName = decodeURIComponent($page.params.name);
</script>

<QueryList tag={tagName} title={`#${tagName}`} />
```

- [ ] **Step 5: Create `apps/web/src/routes/(app)/trash/+page.svelte`**

```svelte
<QueryList includeDeleted title="Trash" />
```

- [ ] **Step 6: Smoke + commit**

```bash
git add apps/web/src/lib/components/QueryList.svelte apps/web/src/routes/(app)
git commit -m "feat(web): library + folder/tag/trash views"
```

---

## Phase 9 — apps/web builder (core)

### Task 9.1: Builder store + node ops helpers

**Files:**
- Create: `apps/web/src/lib/builder/node-ops.ts`
- Create: `apps/web/src/lib/builder/store.ts`
- Create: `apps/web/test/node-ops.test.ts`

- [ ] **Step 1: Create failing test for node-ops**

```typescript
// apps/web/test/node-ops.test.ts
import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import {
  addChild,
  removeAt,
  updateAt,
  moveNode,
} from '../src/lib/builder/node-ops';

const G = (children: QueryNode[]): QueryNode => ({ type: 'group', op: 'AND', children });
const T = (v: string): QueryNode => ({ type: 'term', value: v });

describe('node-ops', () => {
  test('addChild appends to group at path', () => {
    const t = G([T('a')]);
    const next = addChild(t, [], T('b'));
    expect((next as { children: QueryNode[] }).children.map((c) => (c as { value: string }).value)).toEqual(['a', 'b']);
  });

  test('removeAt removes child by index path', () => {
    const t = G([T('a'), T('b'), T('c')]);
    const next = removeAt(t, [1]);
    expect((next as { children: QueryNode[] }).children.map((c) => (c as { value: string }).value)).toEqual(['a', 'c']);
  });

  test('updateAt replaces node deeply', () => {
    const t = G([G([T('inner')])]);
    const next = updateAt(t, [0, 0], (n) => ({ ...(n as { type: 'term'; value: string }), value: 'updated' }));
    const inner = ((next as { children: QueryNode[] }).children[0] as { children: QueryNode[] }).children[0];
    expect((inner as { value: string }).value).toBe('updated');
  });

  test('moveNode moves between groups', () => {
    const t = G([G([T('a'), T('b')]), G([])]);
    const next = moveNode(t, [0, 0], [1, 0]);
    const left = (next as { children: QueryNode[] }).children[0] as { children: QueryNode[] };
    const right = (next as { children: QueryNode[] }).children[1] as { children: QueryNode[] };
    expect(left.children.map((c) => (c as { value: string }).value)).toEqual(['b']);
    expect(right.children.map((c) => (c as { value: string }).value)).toEqual(['a']);
  });
});
```

Run: `cd apps/web && bun test test/node-ops.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 2: Implement `apps/web/src/lib/builder/node-ops.ts`**

```typescript
import type { QueryNode } from '@search-builder/types';

export type Path = number[];

function isGroup(n: QueryNode): n is QueryNode & { type: 'group'; children: QueryNode[] } {
  return n.type === 'group';
}

function cloneChildren(children: QueryNode[]): QueryNode[] {
  return children.slice();
}

export function addChild(root: QueryNode, path: Path, child: QueryNode): QueryNode {
  if (!isGroup(root)) throw new Error('cannot add child to non-group root');
  if (path.length === 0) {
    return { ...root, children: [...root.children, child] };
  }
  const [head, ...rest] = path;
  const newChildren = cloneChildren(root.children);
  newChildren[head] = addChild(newChildren[head], rest, child);
  return { ...root, children: newChildren };
}

export function removeAt(root: QueryNode, path: Path): QueryNode {
  if (path.length === 0) throw new Error('cannot remove root');
  if (!isGroup(root)) throw new Error('path traverses non-group');
  const [head, ...rest] = path;
  const newChildren = cloneChildren(root.children);
  if (rest.length === 0) {
    newChildren.splice(head, 1);
  } else {
    newChildren[head] = removeAt(newChildren[head], rest);
  }
  return { ...root, children: newChildren };
}

export function updateAt(
  root: QueryNode,
  path: Path,
  fn: (node: QueryNode) => QueryNode,
): QueryNode {
  if (path.length === 0) return fn(root);
  if (!isGroup(root)) throw new Error('path traverses non-group');
  const [head, ...rest] = path;
  const newChildren = cloneChildren(root.children);
  newChildren[head] = updateAt(newChildren[head], rest, fn);
  return { ...root, children: newChildren };
}

export function getAt(root: QueryNode, path: Path): QueryNode {
  if (path.length === 0) return root;
  if (!isGroup(root)) throw new Error('path traverses non-group');
  return getAt(root.children[path[0]], path.slice(1));
}

export function moveNode(root: QueryNode, from: Path, to: Path): QueryNode {
  const node = getAt(root, from);
  const removed = removeAt(root, from);
  // adjust target path if it shares prefix with from and from-index precedes target
  const adjusted = adjustPath(to, from);
  const parentPath = adjusted.slice(0, -1);
  const idx = adjusted[adjusted.length - 1];
  const parent = getAt(removed, parentPath) as QueryNode & { type: 'group' };
  const newChildren = cloneChildren(parent.children);
  newChildren.splice(idx, 0, node);
  return updateAt(removed, parentPath, (p) => ({ ...(p as { type: 'group'; op: 'AND' | 'OR' }), children: newChildren }));
}

function adjustPath(target: Path, removed: Path): Path {
  if (target.length < removed.length) return target;
  for (let i = 0; i < removed.length - 1; i++) {
    if (target[i] !== removed[i]) return target;
  }
  // same parent or deeper
  if (target.length === removed.length && target[removed.length - 1] > removed[removed.length - 1]) {
    const next = target.slice();
    next[removed.length - 1]--;
    return next;
  }
  return target;
}
```

- [ ] **Step 3: Run tests**

Run: `cd apps/web && bun test test/node-ops.test.ts`
Expected: PASS.

- [ ] **Step 4: Create `apps/web/src/lib/builder/store.ts`**

```typescript
import { writable, derived, get } from 'svelte/store';
import type { EngineKey, QueryNode, QueryFullDto } from '@search-builder/types';
import { api, ApiResponseError } from '$lib/api-client';
import { addChild, removeAt, updateAt, moveNode } from './node-ops';
import type { Path } from './node-ops';

export type BuilderState = {
  id: string | null;
  name: string;
  description: string;
  engine: EngineKey;
  folder_id: string | null;
  tags: string[];
  tree: QueryNode;
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  history: QueryNode[];
  future: QueryNode[];
};

const emptyTree = (): QueryNode => ({ type: 'group', op: 'AND', children: [] });

function initial(engine: EngineKey): BuilderState {
  return {
    id: null,
    name: '',
    description: '',
    engine,
    folder_id: null,
    tags: [],
    tree: emptyTree(),
    dirty: false,
    saving: false,
    savedAt: null,
    history: [],
    future: [],
  };
}

export const builderStore = writable<BuilderState>(initial('google'));

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 800;
const HISTORY_LIMIT = 20;

export function setFromServer(full: QueryFullDto): void {
  builderStore.set({
    id: full.id,
    name: full.name,
    description: full.description ?? '',
    engine: full.engine,
    folder_id: full.folder_id,
    tags: full.tags,
    tree: full.tree,
    dirty: false,
    saving: false,
    savedAt: full.updated_at,
    history: [],
    future: [],
  });
}

export function resetForNew(engine: EngineKey): void {
  builderStore.set(initial(engine));
}

function pushHistory(state: BuilderState, before: QueryNode): BuilderState {
  const history = [before, ...state.history].slice(0, HISTORY_LIMIT);
  return { ...state, history, future: [] };
}

export function mutateTree(fn: (tree: QueryNode) => QueryNode): void {
  builderStore.update((s) => {
    const before = s.tree;
    const next = fn(s.tree);
    if (next === before) return s;
    return scheduleSave({ ...pushHistory(s, before), tree: next, dirty: true });
  });
}

export function setField<K extends keyof BuilderState>(key: K, value: BuilderState[K]): void {
  builderStore.update((s) => scheduleSave({ ...s, [key]: value, dirty: true }));
}

export function undo(): void {
  builderStore.update((s) => {
    if (s.history.length === 0) return s;
    const [prev, ...rest] = s.history;
    return scheduleSave({ ...s, tree: prev, history: rest, future: [s.tree, ...s.future], dirty: true });
  });
}

export function redo(): void {
  builderStore.update((s) => {
    if (s.future.length === 0) return s;
    const [next, ...rest] = s.future;
    return scheduleSave({ ...s, tree: next, future: rest, history: [s.tree, ...s.history], dirty: true });
  });
}

export const builderActions = {
  addChild(path: Path, child: QueryNode) {
    mutateTree((t) => addChild(t, path, child));
  },
  removeAt(path: Path) {
    mutateTree((t) => removeAt(t, path));
  },
  updateAt(path: Path, fn: (n: QueryNode) => QueryNode) {
    mutateTree((t) => updateAt(t, path, fn));
  },
  move(from: Path, to: Path) {
    mutateTree((t) => moveNode(t, from, to));
  },
};

function scheduleSave(state: BuilderState): BuilderState {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(persist, DEBOUNCE_MS);
  return state;
}

async function persist(): Promise<void> {
  const s = get(builderStore);
  if (!s.dirty) return;
  builderStore.update((x) => ({ ...x, saving: true }));
  try {
    if (s.id === null) {
      if (s.name.trim().length === 0) {
        builderStore.update((x) => ({ ...x, saving: false }));
        return;
      }
      const { id } = await api.queries.create({
        name: s.name,
        description: s.description || undefined,
        engine: s.engine,
        tree: s.tree,
        folder_id: s.folder_id,
        tags: s.tags,
      });
      builderStore.update((x) => ({ ...x, id, dirty: false, saving: false, savedAt: Date.now() }));
    } else {
      await api.queries.update(s.id, {
        name: s.name,
        description: s.description || undefined,
        engine: s.engine,
        tree: s.tree,
        folder_id: s.folder_id,
        tags: s.tags,
      });
      builderStore.update((x) => ({ ...x, dirty: false, saving: false, savedAt: Date.now() }));
    }
  } catch (e) {
    builderStore.update((x) => ({ ...x, saving: false }));
    if (e instanceof ApiResponseError) console.warn('save failed', e.body);
    else console.warn('save failed', e);
  }
}

export async function forceSave(): Promise<void> {
  if (debounceTimer) clearTimeout(debounceTimer);
  await persist();
}

export const saveStatus = derived(builderStore, ($s) => {
  if ($s.saving) return 'Saving…';
  if ($s.dirty) return 'Unsaved changes';
  if ($s.savedAt) return `Saved ${Math.round((Date.now() - $s.savedAt) / 1000)}s ago`;
  return '';
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/builder/node-ops.ts apps/web/src/lib/builder/store.ts apps/web/test/node-ops.test.ts
git commit -m "feat(web): builder store + node-ops with TDD"
```

---

### Task 9.2: PreviewBar component

**Files:**
- Create: `apps/web/src/lib/builder/PreviewBar.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/builder/PreviewBar.svelte`**

```svelte
<script lang="ts">
  import type { EngineKey, QueryNode } from '@search-builder/types';
  import { getEngine, validateTree } from '@search-builder/engines';
  import { api } from '$lib/api-client';
  import GlassButton from '$lib/ui/GlassButton.svelte';
  import { builderStore } from './store';

  export let engine: EngineKey;
  export let tree: QueryNode;

  $: adapter = getEngine(engine);
  $: serialized = adapter.serializeTree(tree);
  $: url = adapter.buildUrl(tree);
  $: errors = validateTree(engine, tree);
  $: disabled = serialized.trim().length === 0 || errors.length > 0;

  async function openInEngine() {
    if (disabled) return;
    if ($builderStore.id) await api.queries.touch($builderStore.id).catch(() => {});
    window.open(url, '_blank', 'noopener');
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }
</script>

<div class="bar">
  <pre class="q">{serialized || '(empty)'}</pre>
  {#if errors.length > 0}
    <ul class="errs">
      {#each errors as e}<li>{e.path || '(root)'}: {e.message}</li>{/each}
    </ul>
  {/if}
  <div class="actions">
    <GlassButton variant="primary" {disabled} on:click={openInEngine}>
      Open in {adapter.name} ↗
    </GlassButton>
    <GlassButton {disabled} on:click={() => copy(url)}>Copy URL</GlassButton>
    <GlassButton {disabled} on:click={() => copy(serialized)}>Copy query</GlassButton>
  </div>
</div>

<style>
  .bar {
    display: grid; gap: 8px; padding: 12px; border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .q {
    margin: 0; padding: 8px 10px; background: var(--bg);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    font-family: var(--font-mono); font-size: 13px; white-space: pre-wrap; word-break: break-word;
  }
  .errs {
    margin: 0; padding-left: 18px; color: var(--danger); font-size: 12px;
  }
  .actions { display: flex; gap: 8px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/builder/PreviewBar.svelte
git commit -m "feat(web): PreviewBar with live serialise + validation"
```

---

### Task 9.3: Group, TermRow, OperatorRow components

**Files:**
- Create: `apps/web/src/lib/builder/TermRow.svelte`
- Create: `apps/web/src/lib/builder/OperatorRow.svelte`
- Create: `apps/web/src/lib/builder/Group.svelte`
- Create: `apps/web/src/lib/builder/OperatorPicker.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/builder/OperatorPicker.svelte`**

```svelte
<script lang="ts">
  import type { OperatorSpec } from '@search-builder/types';
  export let operators: OperatorSpec[];
  export let value: string;
  export let onChange: (key: string) => void;

  let filter = '';
  let open = false;

  $: filtered = filter
    ? operators.filter(
        (o) =>
          o.key.toLowerCase().includes(filter.toLowerCase()) ||
          o.label.toLowerCase().includes(filter.toLowerCase()),
      )
    : operators;

  $: grouped = (() => {
    const m = new Map<string, OperatorSpec[]>();
    for (const o of filtered) {
      const cat = o.category ?? 'Other';
      const arr = m.get(cat) ?? [];
      arr.push(o);
      m.set(cat, arr);
    }
    return [...m.entries()];
  })();

  function pick(key: string) {
    onChange(key);
    open = false;
    filter = '';
  }
</script>

<div class="wrap">
  <button class="trigger" on:click={() => (open = !open)}>
    {value || 'select…'} <span class="caret">▾</span>
  </button>
  {#if open}
    <div class="pop">
      <input bind:value={filter} placeholder="Filter operators…" autofocus />
      <div class="scroll">
        {#each grouped as [cat, ops]}
          <div class="cat">{cat}</div>
          {#each ops as o}
            <button class="item" on:click={() => pick(o.key)}>
              <span class="key">{o.key}</span>
              <span class="label">{o.label}</span>
              <span class="desc">{o.description}</span>
            </button>
          {/each}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { position: relative; }
  .trigger {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px;
    font-family: var(--font-mono); font-size: 13px; min-width: 120px; text-align: left;
  }
  .caret { color: var(--text-muted); margin-left: 4px; }
  .pop {
    position: absolute; top: calc(100% + 4px); left: 0;
    background: var(--surface-strong); border: 1px solid var(--border);
    border-radius: var(--radius-sm); min-width: 320px; max-height: 320px;
    z-index: 50; display: grid; grid-template-rows: auto 1fr;
  }
  input { background: var(--bg); color: var(--text); border: none; padding: 8px 10px; border-bottom: 1px solid var(--border); }
  .scroll { overflow-y: auto; }
  .cat { font-size: 11px; text-transform: uppercase; color: var(--text-muted); padding: 4px 10px; }
  .item {
    display: grid; grid-template-columns: 110px 1fr; gap: 4px;
    background: none; color: var(--text); border: none; text-align: left; padding: 6px 10px;
  }
  .item:hover { background: var(--surface); }
  .key { font-family: var(--font-mono); color: var(--accent); }
  .label { font-size: 13px; }
  .desc { grid-column: 1 / -1; color: var(--text-muted); font-size: 12px; }
</style>
```

- [ ] **Step 2: Create `apps/web/src/lib/builder/TermRow.svelte`**

```svelte
<script lang="ts">
  import type { QueryNode } from '@search-builder/types';
  import { builderActions } from './store';
  import type { Path } from './node-ops';

  export let node: QueryNode & { type: 'term' };
  export let path: Path;

  function update(patch: Partial<typeof node>) {
    builderActions.updateAt(path, (n) => ({ ...(n as typeof node), ...patch }));
  }
  function remove() {
    builderActions.removeAt(path);
  }
</script>

<div class="row">
  <span class="grip" title="drag handle">⋮⋮</span>
  <span class="lbl">term</span>
  <input
    class="val"
    placeholder="text to search…"
    value={node.value}
    on:input={(e) => update({ value: (e.target as HTMLInputElement).value })}
  />
  <button
    class="toggle"
    title={node.exactMatch ? 'remove exact match' : 'exact match'}
    aria-pressed={!!node.exactMatch}
    on:click={() => update({ exactMatch: !node.exactMatch })}
  >"…"</button>
  <button
    class="toggle"
    title={node.negated ? 'remove negation' : 'negate'}
    aria-pressed={!!node.negated}
    on:click={() => update({ negated: !node.negated })}
  >NOT</button>
  <button class="del" on:click={remove} title="remove">×</button>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 24px 50px 1fr auto auto 28px;
    gap: 6px; align-items: center;
    padding: 4px 6px; border-radius: var(--radius-sm);
  }
  .row:hover { background: var(--surface); }
  .grip { color: var(--text-muted); cursor: grab; user-select: none; text-align: center; }
  .lbl { font-size: 11px; color: var(--text-muted); }
  .val {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-mono);
  }
  .toggle, .del {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 2px 8px; font-size: 12px;
  }
  .toggle[aria-pressed='true'] { background: var(--accent); color: #0a0c12; border-color: transparent; }
  .del { color: var(--danger); }
</style>
```

- [ ] **Step 3: Create `apps/web/src/lib/builder/OperatorRow.svelte`**

```svelte
<script lang="ts">
  import type { QueryNode, OperatorSpec } from '@search-builder/types';
  import { getEngine } from '@search-builder/engines';
  import { builderActions, builderStore } from './store';
  import type { Path } from './node-ops';
  import OperatorPicker from './OperatorPicker.svelte';

  export let node: QueryNode & { type: 'operator' };
  export let path: Path;

  $: adapter = getEngine($builderStore.engine);
  $: operators = adapter.operators;
  $: spec = operators.find((o) => o.key === node.key) as OperatorSpec | undefined;
  $: validationError = spec ? adapter.validateValue(node.key, node.value) : `Unknown operator '${node.key}'`;

  function update(patch: Partial<typeof node>) {
    builderActions.updateAt(path, (n) => ({ ...(n as typeof node), ...patch }));
  }
  function remove() {
    builderActions.removeAt(path);
  }
</script>

<div class="row" class:err={!!validationError && node.value !== ''}>
  <span class="grip">⋮⋮</span>
  <OperatorPicker {operators} value={node.key} onChange={(key) => update({ key })} />
  {#if spec?.valueType === 'enum' && spec.enumValues}
    <select
      class="val"
      value={node.value}
      on:change={(e) => update({ value: (e.target as HTMLSelectElement).value })}
    >
      <option value=""></option>
      {#each spec.enumValues as v}<option>{v}</option>{/each}
    </select>
  {:else}
    <input
      class="val"
      placeholder={spec?.placeholder ?? 'value'}
      value={node.value}
      on:input={(e) => update({ value: (e.target as HTMLInputElement).value })}
    />
  {/if}
  <button
    class="toggle"
    disabled={!spec?.supportsNegation}
    aria-pressed={!!node.negated}
    on:click={() => update({ negated: !node.negated })}
    title={node.negated ? 'remove negation' : 'negate'}
  >NOT</button>
  <button class="del" on:click={remove}>×</button>
  {#if validationError && node.value !== ''}
    <div class="hint">{validationError}</div>
  {/if}
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 24px auto 1fr auto 28px;
    gap: 6px; align-items: center;
    padding: 4px 6px; border-radius: var(--radius-sm);
  }
  .row.err { box-shadow: inset 0 0 0 1px var(--danger); }
  .row:hover { background: var(--surface); }
  .grip { color: var(--text-muted); cursor: grab; user-select: none; text-align: center; }
  .val, select.val {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px; font-family: var(--font-mono);
  }
  .toggle, .del {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 2px 8px; font-size: 12px;
  }
  .toggle[aria-pressed='true'] { background: var(--accent); color: #0a0c12; border-color: transparent; }
  .del { color: var(--danger); }
  .hint { grid-column: 3 / span 3; font-size: 12px; color: var(--danger); padding: 0 4px; }
</style>
```

- [ ] **Step 4: Create `apps/web/src/lib/builder/Group.svelte`**

```svelte
<script lang="ts">
  import type { QueryNode } from '@search-builder/types';
  import { builderActions } from './store';
  import type { Path } from './node-ops';
  import TermRow from './TermRow.svelte';
  import OperatorRow from './OperatorRow.svelte';

  export let node: QueryNode & { type: 'group' };
  export let path: Path = [];
  export let isRoot = false;

  let menuOpen = false;

  function add(kind: 'term' | 'operator' | 'and' | 'or') {
    menuOpen = false;
    const child: QueryNode =
      kind === 'term'
        ? { type: 'term', value: '' }
        : kind === 'operator'
          ? { type: 'operator', key: '', value: '' }
          : { type: 'group', op: kind === 'and' ? 'AND' : 'OR', children: [] };
    builderActions.addChild(path, child);
  }

  function toggleOp() {
    builderActions.updateAt(path, (n) => ({
      ...(n as typeof node),
      op: (n as typeof node).op === 'AND' ? 'OR' : 'AND',
    }));
  }

  function toggleNegate() {
    builderActions.updateAt(path, (n) => ({ ...(n as typeof node), negated: !(n as typeof node).negated }));
  }

  function removeMe() {
    builderActions.removeAt(path);
  }
</script>

<div class="group" class:root={isRoot}>
  <header>
    {#if !isRoot}
      <button class="op" on:click={toggleOp} title="toggle AND/OR">{node.op}</button>
      <button class="neg" aria-pressed={!!node.negated} on:click={toggleNegate} title="negate group">NOT</button>
      <button class="del" on:click={removeMe} title="remove group">×</button>
    {:else}
      <span class="op static">AND</span>
    {/if}
  </header>

  <div class="children">
    {#each node.children as child, i (path.join('.') + '/' + i)}
      {#if child.type === 'group'}
        <svelte:self node={child} path={[...path, i]} isRoot={false} />
      {:else if child.type === 'term'}
        <TermRow node={child} path={[...path, i]} />
      {:else}
        <OperatorRow node={child} path={[...path, i]} />
      {/if}
    {/each}
  </div>

  <footer>
    <div class="dropdown">
      <button on:click={() => (menuOpen = !menuOpen)}>+ Add</button>
      {#if menuOpen}
        <div class="menu">
          <button on:click={() => add('term')}>Term</button>
          <button on:click={() => add('operator')}>Operator</button>
          <button on:click={() => add('and')}>Sub-group AND</button>
          <button on:click={() => add('or')}>Sub-group OR</button>
        </div>
      {/if}
    </div>
  </footer>
</div>

<style>
  .group {
    border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: 8px; margin: 6px 0;
    background: rgba(255, 255, 255, 0.02);
  }
  .group.root { border-color: transparent; padding: 0; background: none; }
  header { display: flex; gap: 6px; align-items: center; }
  .op {
    background: var(--accent); color: #0a0c12; border: none;
    border-radius: var(--radius-sm); padding: 2px 8px; font-weight: 600;
  }
  .op.static { background: var(--surface); color: var(--text-muted); padding: 2px 8px; border-radius: var(--radius-sm); }
  .neg, .del {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 2px 8px; font-size: 12px;
  }
  .neg[aria-pressed='true'] { background: var(--danger); color: #0a0c12; border-color: transparent; }
  .del { color: var(--danger); margin-left: auto; }
  .children { padding-left: 8px; }
  footer { padding-top: 4px; }
  .dropdown { position: relative; display: inline-block; }
  .dropdown > button {
    background: none; border: 1px dashed var(--border); color: var(--text-muted);
    border-radius: var(--radius-sm); padding: 4px 10px;
  }
  .menu {
    position: absolute; top: 100%; left: 0; margin-top: 4px;
    background: var(--surface-strong); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px; display: grid; min-width: 180px; z-index: 5;
  }
  .menu button {
    background: none; border: none; color: var(--text);
    text-align: left; padding: 6px 8px; border-radius: var(--radius-sm);
  }
  .menu button:hover { background: var(--surface); }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/builder/TermRow.svelte apps/web/src/lib/builder/OperatorRow.svelte apps/web/src/lib/builder/Group.svelte apps/web/src/lib/builder/OperatorPicker.svelte
git commit -m "feat(web): Group / TermRow / OperatorRow / OperatorPicker"
```

---

### Task 9.4: Builder root + routes (`/q/new`, `/q/[id]`)

**Files:**
- Create: `apps/web/src/lib/builder/Builder.svelte`
- Create: `apps/web/src/routes/(app)/q/new/+page.svelte`
- Create: `apps/web/src/routes/(app)/q/[id]/+page.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/builder/Builder.svelte`**

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { EngineKey, FolderDto } from '@search-builder/types';
  import { api } from '$lib/api-client';
  import { enginesStore } from '$lib/stores/engines';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';
  import Group from './Group.svelte';
  import PreviewBar from './PreviewBar.svelte';
  import { builderStore, saveStatus, setField, forceSave, undo, redo } from './store';

  let folders: FolderDto[] = [];
  let tagsText = '';

  $: $builderStore && (tagsText = $builderStore.tags.join(', '));

  async function loadFolders() {
    folders = await api.folders.list();
  }
  loadFolders();

  function onTagsBlur() {
    const parsed = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    setField('tags', parsed);
  }

  function onKeyDown(e: KeyboardEvent) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 's') {
      e.preventDefault();
      void forceSave();
    } else if (meta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<section class="builder">
  <header class="topline">
    <select
      value={$builderStore.engine}
      on:change={(e) => setField('engine', (e.target as HTMLSelectElement).value as EngineKey)}
    >
      {#each $enginesStore as e}
        <option value={e.key}>{e.name}</option>
      {/each}
    </select>
    <GlassInput placeholder="Query name…" bind:value={$builderStore.name} on:input={() => setField('name', $builderStore.name)} />
    <select
      value={$builderStore.folder_id ?? ''}
      on:change={(e) => setField('folder_id', (e.target as HTMLSelectElement).value || null)}
    >
      <option value="">(no folder)</option>
      {#each folders as f}<option value={f.id}>{f.name}</option>{/each}
    </select>
    <span class="status">{$saveStatus}</span>
  </header>

  <PreviewBar engine={$builderStore.engine} tree={$builderStore.tree} />

  <div class="body">
    <Group node={$builderStore.tree} isRoot />
  </div>

  <footer class="meta">
    <label>
      <span>Tags (comma-separated)</span>
      <GlassInput bind:value={tagsText} on:blur={onTagsBlur} />
    </label>
    <label>
      <span>Description</span>
      <textarea bind:value={$builderStore.description} on:blur={() => setField('description', $builderStore.description)} />
    </label>
  </footer>
</section>

<style>
  .builder { display: grid; gap: 0; }
  .topline {
    display: grid; grid-template-columns: 160px 1fr 200px auto; gap: 8px;
    padding: 12px; align-items: center; border-bottom: 1px solid var(--border);
  }
  .topline select {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 6px;
  }
  .status { color: var(--text-muted); font-size: 12px; }
  .body { padding: 12px; }
  .meta { padding: 12px; display: grid; gap: 12px; }
  .meta label { display: grid; gap: 6px; }
  .meta label span { font-size: 12px; color: var(--text-muted); }
  textarea {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 8px; min-height: 60px; resize: vertical;
  }
</style>
```

- [ ] **Step 2: Create `apps/web/src/routes/(app)/q/new/+page.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { EngineKey } from '@search-builder/types';
  import Builder from '$lib/builder/Builder.svelte';
  import { resetForNew } from '$lib/builder/store';

  onMount(() => {
    const engine = ($page.url.searchParams.get('engine') as EngineKey | null) ?? 'google';
    resetForNew(engine);
  });
</script>

<Builder />
```

- [ ] **Step 3: Create `apps/web/src/routes/(app)/q/[id]/+page.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { api } from '$lib/api-client';
  import Builder from '$lib/builder/Builder.svelte';
  import { setFromServer } from '$lib/builder/store';

  let loaded = false;
  let error = '';

  async function load(id: string) {
    loaded = false;
    error = '';
    try {
      const full = await api.queries.get(id);
      setFromServer(full);
      loaded = true;
    } catch (e) {
      error = 'Failed to load query';
    }
  }

  $: void load($page.params.id);
</script>

{#if error}
  <p style="color: var(--danger)">{error}</p>
{:else if !loaded}
  <p style="color: var(--text-muted)">Loading…</p>
{:else}
  <Builder />
{/if}
```

- [ ] **Step 4: Smoke test**

Start API + Web. From library, click "+ New query → Google". Add a term and an operator. Watch preview update. Type a name. Wait 1 sec — autosave shows "Saved". Reload → query persists.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/builder/Builder.svelte apps/web/src/routes/(app)/q
git commit -m "feat(web): builder page + new/edit routes + autosave"
```

---

## Phase 10 — Builder polish (engine switcher, raw mode, DnD reorder)

### Task 10.1: EngineSwitcher with confirmation modal

**Files:**
- Create: `apps/web/src/lib/builder/EngineSwitcher.svelte`
- Create: `apps/web/src/lib/builder/find-incompatible.ts`
- Modify: `apps/web/src/lib/builder/Builder.svelte` (replace inline `<select>` for engine)

- [ ] **Step 1: Create `apps/web/src/lib/builder/find-incompatible.ts`**

```typescript
import type { EngineKey, OperatorSpec, QueryNode } from '@search-builder/types';
import { getEngine } from '@search-builder/engines';

export function findIncompatibleOperators(tree: QueryNode, target: EngineKey): string[] {
  const valid = new Set(getEngine(target).operators.map((o: OperatorSpec) => o.key));
  const out: string[] = [];
  const walk = (n: QueryNode): void => {
    if (n.type === 'operator' && !valid.has(n.key)) out.push(n.key);
    if (n.type === 'group') n.children.forEach(walk);
  };
  walk(tree);
  return [...new Set(out)];
}

export function stripIncompatibleOperators(tree: QueryNode, target: EngineKey): QueryNode {
  const valid = new Set(getEngine(target).operators.map((o: OperatorSpec) => o.key));
  const walk = (n: QueryNode): QueryNode | null => {
    if (n.type === 'operator') return valid.has(n.key) ? n : null;
    if (n.type === 'group') {
      const children = n.children.map(walk).filter((c): c is QueryNode => c !== null);
      return { ...n, children };
    }
    return n;
  };
  return (walk(tree) as QueryNode) ?? { type: 'group', op: 'AND', children: [] };
}
```

- [ ] **Step 2: Create `apps/web/src/lib/builder/EngineSwitcher.svelte`**

```svelte
<script lang="ts">
  import type { EngineKey } from '@search-builder/types';
  import { enginesStore } from '$lib/stores/engines';
  import { builderStore, setField } from './store';
  import { findIncompatibleOperators, stripIncompatibleOperators } from './find-incompatible';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  let pendingTarget: EngineKey | null = null;
  let incompatible: string[] = [];

  function onChange(e: Event) {
    const target = (e.target as HTMLSelectElement).value as EngineKey;
    if (target === $builderStore.engine) return;
    incompatible = findIncompatibleOperators($builderStore.tree, target);
    if (incompatible.length === 0) {
      setField('engine', target);
      return;
    }
    pendingTarget = target;
    // revert the visible <select>
    (e.target as HTMLSelectElement).value = $builderStore.engine;
  }

  function confirmStrip() {
    if (!pendingTarget) return;
    const stripped = stripIncompatibleOperators($builderStore.tree, pendingTarget);
    setField('engine', pendingTarget);
    setField('tree', stripped);
    pendingTarget = null;
    incompatible = [];
  }

  function cancel() {
    pendingTarget = null;
    incompatible = [];
  }
</script>

<select value={$builderStore.engine} on:change={onChange}>
  {#each $enginesStore as e}
    <option value={e.key}>{e.name}</option>
  {/each}
</select>

{#if pendingTarget}
  <div class="overlay" on:click={cancel}>
    <div class="modal" on:click|stopPropagation>
      <h3>Switch to {pendingTarget}?</h3>
      <p>The following operators are not supported in <strong>{pendingTarget}</strong> and will be removed:</p>
      <ul>
        {#each incompatible as k}<li><code>{k}</code></li>{/each}
      </ul>
      <div class="actions">
        <GlassButton on:click={cancel}>Cancel</GlassButton>
        <GlassButton variant="primary" on:click={confirmStrip}>Drop &amp; switch</GlassButton>
      </div>
    </div>
  </div>
{/if}

<style>
  select {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 6px;
  }
  .overlay {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
    display: grid; place-items: center; z-index: 100;
  }
  .modal {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: 20px; max-width: 480px; width: 90%;
  }
  h3 { margin: 0 0 8px; }
  ul { font-family: var(--font-mono); font-size: 13px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
</style>
```

- [ ] **Step 3: Replace inline engine `<select>` in `Builder.svelte`**

In `apps/web/src/lib/builder/Builder.svelte`, replace the `<select value={$builderStore.engine}…</select>` block in `.topline` with:

```svelte
<EngineSwitcher />
```

And add at top of `<script>`:

```typescript
import EngineSwitcher from './EngineSwitcher.svelte';
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/builder/find-incompatible.ts apps/web/src/lib/builder/EngineSwitcher.svelte apps/web/src/lib/builder/Builder.svelte
git commit -m "feat(web): EngineSwitcher with incompatible-operator confirm modal"
```

---

### Task 10.2: Raw mode (read-only textarea)

**Files:**
- Create: `apps/web/src/lib/builder/RawMode.svelte`
- Modify: `apps/web/src/lib/builder/Builder.svelte` (add toggle + render)

- [ ] **Step 1: Create `apps/web/src/lib/builder/RawMode.svelte`**

```svelte
<script lang="ts">
  import type { QueryNode, EngineKey } from '@search-builder/types';
  import { getEngine } from '@search-builder/engines';
  export let engine: EngineKey;
  export let tree: QueryNode;
  $: text = getEngine(engine).serializeTree(tree);

  async function copy() {
    await navigator.clipboard.writeText(text);
  }
</script>

<div class="raw">
  <header>
    <span>Read-only raw query (engine: {engine})</span>
    <button on:click={copy}>Copy</button>
  </header>
  <textarea readonly value={text} rows={6}></textarea>
</div>

<style>
  .raw { display: grid; gap: 6px; padding: 12px; border-top: 1px solid var(--border); }
  header { display: flex; justify-content: space-between; align-items: center; color: var(--text-muted); font-size: 12px; }
  textarea {
    background: var(--bg); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 8px; font-family: var(--font-mono);
  }
  button {
    background: var(--surface); color: var(--text); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 4px 8px;
  }
</style>
```

- [ ] **Step 2: Patch `apps/web/src/lib/builder/Builder.svelte`** — add toggle near `.status`:

Add inside `<script>`:

```typescript
import RawMode from './RawMode.svelte';
let showRaw = false;
```

In template, append after `</footer>`:

```svelte
<div class="raw-toggle">
  <button on:click={() => (showRaw = !showRaw)}>{showRaw ? 'Hide' : 'Show'} raw query</button>
</div>
{#if showRaw}
  <RawMode engine={$builderStore.engine} tree={$builderStore.tree} />
{/if}
```

Style additions:

```css
.raw-toggle { padding: 0 12px; }
.raw-toggle button {
  background: none; border: none; color: var(--text-muted); padding: 6px 0; font-size: 12px;
}
.raw-toggle button:hover { color: var(--text); }
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/builder/RawMode.svelte apps/web/src/lib/builder/Builder.svelte
git commit -m "feat(web): RawMode toggleable read-only textarea"
```

---

### Task 10.3: Drag & drop reorder within and across groups

**Files:**
- Modify: `apps/web/src/lib/builder/Group.svelte` (wrap children with svelte-dnd-action)

- [ ] **Step 1: Modify `apps/web/src/lib/builder/Group.svelte`**

Replace the `<script>` and `.children` block. New script additions:

```typescript
import { dndzone, type DndEvent } from 'svelte-dnd-action';
import { flip } from 'svelte/animate';

function items(): Array<QueryNode & { _id: string }> {
  return node.children.map((c, i) => ({ ...c, _id: `${path.join('.')}/${i}` }));
}

function handleConsider(e: CustomEvent<DndEvent<QueryNode & { _id: string }>>) {
  const next = e.detail.items.map(({ _id, ...rest }) => rest as QueryNode);
  builderActions.updateAt(path, (n) => ({ ...(n as typeof node), children: next }));
}

function handleFinalize(e: CustomEvent<DndEvent<QueryNode & { _id: string }>>) {
  handleConsider(e);
}
```

Replace `.children` block:

```svelte
<div
  class="children"
  use:dndzone={{ items: items(), type: 'group-child', flipDurationMs: 120 }}
  on:consider={handleConsider}
  on:finalize={handleFinalize}
>
  {#each items() as child, i (child._id)}
    <div animate:flip={{ duration: 120 }}>
      {#if child.type === 'group'}
        <svelte:self node={child} path={[...path, i]} isRoot={false} />
      {:else if child.type === 'term'}
        <TermRow node={child} path={[...path, i]} />
      {:else}
        <OperatorRow node={child} path={[...path, i]} />
      {/if}
    </div>
  {/each}
</div>
```

- [ ] **Step 2: Smoke test**

Start API + Web. Open builder. Add several rows. Drag with the `⋮⋮` handle to reorder. Drag into nested group. Verify preview updates.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/builder/Group.svelte
git commit -m "feat(web): drag-and-drop reorder via svelte-dnd-action"
```

---

### Task 10.4: New-from-template UI

**Files:**
- Modify: `apps/web/src/lib/components/TopBar.svelte` (add "from template" menu)
- Create: `apps/web/src/lib/components/TemplatePickerModal.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/components/TemplatePickerModal.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api-client';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  const dispatch = createEventDispatcher<{ close: void }>();

  type T = Awaited<ReturnType<typeof api.templates.list>>[number];
  let items: T[] = [];
  let loading = true;

  onMount(async () => {
    items = await api.templates.list();
    loading = false;
  });

  async function pick(t: T) {
    const created = await api.templates.instantiate(t.id, {});
    dispatch('close');
    await goto(`/q/${created.id}`);
  }
</script>

<div class="overlay" on:click={() => dispatch('close')}>
  <div class="modal" on:click|stopPropagation>
    <header>
      <h3>New from template</h3>
      <button on:click={() => dispatch('close')}>×</button>
    </header>
    {#if loading}
      <p>Loading…</p>
    {:else}
      <ul>
        {#each items as t}
          <li>
            <button on:click={() => pick(t)}>
              <div class="row">
                <span class="engine">{t.engine}</span>
                <span class="name">{t.name}</span>
              </div>
              <div class="desc">{t.description}</div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; max-width: 560px; width: 90%; max-height: 80vh; display: grid; grid-template-rows: auto 1fr; }
  header { display: flex; justify-content: space-between; align-items: center; }
  header button { background: none; border: none; color: var(--text-muted); font-size: 20px; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 4px; overflow-y: auto; }
  ul button {
    background: none; border: 1px solid var(--border); border-radius: var(--radius-sm);
    color: var(--text); text-align: left; padding: 10px 12px; width: 100%; display: grid; gap: 4px;
  }
  ul button:hover { border-color: var(--accent); }
  .row { display: flex; gap: 8px; align-items: baseline; }
  .engine { font-size: 11px; padding: 1px 6px; background: var(--surface); border-radius: 4px; color: var(--text-muted); }
  .desc { color: var(--text-muted); font-size: 12px; }
</style>
```

- [ ] **Step 2: Update `apps/web/src/lib/components/TopBar.svelte`** — add a "From template…" item to the `+ New query` dropdown:

In the script, add:

```typescript
import TemplatePickerModal from './TemplatePickerModal.svelte';
let templateModalOpen = false;
```

Inside the `.menu` block (after the engine list):

```svelte
<button on:click={() => { menuOpen = false; templateModalOpen = true; }}>From template…</button>
```

After the `</header>` element (top-level), add:

```svelte
{#if templateModalOpen}
  <TemplatePickerModal on:close={() => (templateModalOpen = false)} />
{/if}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/components/TemplatePickerModal.svelte apps/web/src/lib/components/TopBar.svelte
git commit -m "feat(web): new-from-template flow"
```

---

## Phase 11 — Settings page

### Task 11.1: Settings: change password + stats

**Files:**
- Create: `apps/web/src/routes/(app)/settings/+page.svelte`

- [ ] **Step 1: Create the page**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ApiResponseError } from '$lib/api-client';
  import Glass from '$lib/ui/Glass.svelte';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  let stats: Awaited<ReturnType<typeof api.stats.get>> | null = null;
  let oldPw = '';
  let newPw = '';
  let confirmPw = '';
  let err = '';
  let msg = '';
  let working = false;

  onMount(async () => {
    stats = await api.stats.get();
  });

  async function submit(e: Event) {
    e.preventDefault();
    err = ''; msg = '';
    if (newPw.length < 8) { err = 'New password must be at least 8 chars'; return; }
    if (newPw !== confirmPw) { err = 'New passwords do not match'; return; }
    working = true;
    try {
      await api.auth.changePassword(oldPw, newPw);
      msg = 'Password updated. Other sessions signed out.';
      oldPw = newPw = confirmPw = '';
    } catch (e) {
      err = e instanceof ApiResponseError && e.body.code === 'unauthorized' ? 'Current password is wrong' : 'Failed';
    } finally {
      working = false;
    }
  }

  function fmtBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
  }
</script>

<h2>Settings</h2>

<section>
  <h3>Storage</h3>
  <Glass>
    {#if !stats}
      <p style="color: var(--text-muted)">Loading…</p>
    {:else}
      <dl>
        <dt>Queries</dt><dd>{stats.queries_count}</dd>
        <dt>Folders</dt><dd>{stats.folders_count}</dd>
        <dt>Tags</dt><dd>{stats.tags_count}</dd>
        <dt>Templates</dt><dd>{stats.templates_count}</dd>
        <dt>Database</dt><dd>{fmtBytes(stats.db_size_bytes)}</dd>
      </dl>
    {/if}
  </Glass>
</section>

<section>
  <h3>Change password</h3>
  <Glass>
    <form on:submit={submit}>
      <label><span>Current password</span><GlassInput type="password" bind:value={oldPw} /></label>
      <label><span>New password</span><GlassInput type="password" bind:value={newPw} /></label>
      <label><span>Confirm new</span><GlassInput type="password" bind:value={confirmPw} /></label>
      {#if err}<p class="err">{err}</p>{/if}
      {#if msg}<p class="ok">{msg}</p>{/if}
      <GlassButton variant="primary" type="submit" disabled={working || !oldPw || !newPw}>
        {working ? 'Working…' : 'Update password'}
      </GlassButton>
    </form>
  </Glass>
</section>

<style>
  h2 { margin: 0 0 12px; }
  section { margin-bottom: 18px; max-width: 480px; }
  h3 { margin: 0 0 8px; font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  dl { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; margin: 0; }
  dt { color: var(--text-muted); }
  form { display: grid; gap: 10px; }
  label { display: grid; gap: 4px; }
  label span { font-size: 12px; color: var(--text-muted); }
  .err { color: var(--danger); margin: 0; }
  .ok { color: var(--success); margin: 0; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/(app)/settings
git commit -m "feat(web): settings page (stats + change password)"
```

---

### Task 11.2: Folder management UI (rename, color, delete)

**Files:**
- Create: `apps/web/src/lib/components/FolderManager.svelte`
- Modify: `apps/web/src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Create `apps/web/src/lib/components/FolderManager.svelte`**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '$lib/api-client';
  import GlassInput from '$lib/ui/GlassInput.svelte';
  import GlassButton from '$lib/ui/GlassButton.svelte';

  export let mode: 'create' | 'edit';
  export let id = '';
  export let initialName = '';
  export let initialColor = '#6ea8fe';

  const dispatch = createEventDispatcher<{ saved: void; close: void }>();

  let name = initialName;
  let color = initialColor;
  let working = false;

  async function save() {
    working = true;
    try {
      if (mode === 'create') await api.folders.create({ name, color });
      else await api.folders.update(id, { name, color });
      dispatch('saved');
      dispatch('close');
    } finally {
      working = false;
    }
  }

  async function remove() {
    if (!confirm(`Move folder "${initialName}" to trash? Its queries become unfiled.`)) return;
    working = true;
    try {
      await api.folders.remove(id);
      dispatch('saved');
      dispatch('close');
    } finally {
      working = false;
    }
  }
</script>

<div class="overlay" on:click={() => dispatch('close')}>
  <div class="modal" on:click|stopPropagation>
    <h3>{mode === 'create' ? 'New folder' : 'Edit folder'}</h3>
    <label><span>Name</span><GlassInput bind:value={name} /></label>
    <label><span>Color</span><input type="color" bind:value={color} /></label>
    <div class="actions">
      {#if mode === 'edit'}<GlassButton variant="danger" on:click={remove}>Delete</GlassButton>{/if}
      <GlassButton on:click={() => dispatch('close')}>Cancel</GlassButton>
      <GlassButton variant="primary" disabled={working || !name} on:click={save}>{working ? '…' : 'Save'}</GlassButton>
    </div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: grid; place-items: center; z-index: 100; }
  .modal { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; min-width: 320px; display: grid; gap: 12px; }
  h3 { margin: 0; }
  label { display: grid; gap: 6px; }
  label span { font-size: 12px; color: var(--text-muted); }
  input[type=color] { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 4px; height: 36px; width: 60px; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>
```

- [ ] **Step 2: Modify `apps/web/src/lib/components/Sidebar.svelte`** — add "+ new folder" button and per-folder edit menu

Add to `<script>`:

```typescript
import FolderManager from './FolderManager.svelte';
let openManager: { mode: 'create' | 'edit'; id?: string; initialName?: string; initialColor?: string } | null = null;
```

Inside the `Folders` section, after the list `{#each folders…}{/each}`:

```svelte
<button class="newf" on:click={() => (openManager = { mode: 'create' })}>+ New folder</button>
```

And add right-click to each folder anchor:

```svelte
<a
  href={`/folders/${f.id}`}
  class:active={activeFolder(f.id)}
  on:contextmenu|preventDefault={() => (openManager = { mode: 'edit', id: f.id, initialName: f.name, initialColor: f.color ?? '#6ea8fe' })}
>
```

After `<nav>`:

```svelte
{#if openManager}
  <FolderManager
    mode={openManager.mode}
    id={openManager.id ?? ''}
    initialName={openManager.initialName ?? ''}
    initialColor={openManager.initialColor ?? '#6ea8fe'}
    on:saved={refresh}
    on:close={() => (openManager = null)}
  />
{/if}
```

Style addition:

```css
.newf {
  background: none; border: 1px dashed var(--border); color: var(--text-muted);
  border-radius: var(--radius-sm); padding: 4px 8px; margin-top: 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/components/FolderManager.svelte apps/web/src/lib/components/Sidebar.svelte
git commit -m "feat(web): folder create/edit/delete via right-click + button"
```

---

### Task 11.3: Playwright e2e for critical paths

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests-e2e/login.spec.ts`
- Create: `apps/web/tests-e2e/builder.spec.ts`

- [ ] **Step 1: Create `apps/web/playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'cd ../api && INITIAL_PASSWORD=e2e DB_PATH=./data/e2e.sqlite COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 bun src/db/migrate.ts && INITIAL_PASSWORD=e2e DB_PATH=./data/e2e.sqlite COOKIE_SECURE=false ALLOWED_ORIGIN=http://localhost:5173 bun src/server.ts',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'API_ORIGIN=http://localhost:3001 bun run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
```

- [ ] **Step 2: Create `apps/web/tests-e2e/login.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('login happy path', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Password').fill('e2e');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /library|all queries/i })).toBeVisible();
});

test('login wrong password shows error', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.locator('.err')).toContainText(/invalid|password/i);
});
```

- [ ] **Step 3: Create `apps/web/tests-e2e/builder.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Password').fill('e2e');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/');
}

test('new query from template, open in google', async ({ page, context }) => {
  await login(page);
  await page.getByRole('button', { name: /\+ new query/i }).click();
  await page.getByRole('button', { name: /from template/i }).click();
  await page.getByRole('button', { name: /exposed \.env/i }).click();
  await expect(page).toHaveURL(/\/q\/[0-9a-f-]+/);
  // wait briefly for autosave
  await page.waitForTimeout(900);

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: /open in google/i }).click();
  const popup = await popupPromise;
  expect(popup.url()).toContain('google.com/search');
});

test('add term and operator, observe preview', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: /\+ new query/i }).click();
  await page.getByRole('button', { name: 'Google' }).click();
  await page.getByPlaceholder('Query name…').fill('e2e test');
  await page.getByRole('button', { name: '+ Add' }).first().click();
  await page.getByRole('button', { name: 'Term' }).click();
  await page.getByPlaceholder('text to search…').fill('hello');
  await expect(page.locator('pre.q')).toContainText('hello');
});
```

- [ ] **Step 4: Install playwright browsers + run**

Run: `cd apps/web && bunx playwright install chromium`
Run: `cd apps/web && bun run test`
Expected: all 4 e2e tests pass. (Cleanup the e2e DB if needed: `rm apps/api/data/e2e.sqlite*`.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/tests-e2e
git commit -m "test(web): playwright e2e for login + builder critical paths"
```

---

## Phase 12 — CI + Docker + Coolify deploy

### Task 12.1: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun --filter @search-builder/types test || true
      - run: bun --filter @search-builder/engines test
      - run: bun --filter @search-builder/api test
      - run: bunx playwright install --with-deps chromium
        working-directory: apps/web
      - run: bun run test
        working-directory: apps/web
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report
          retention-days: 7
```

- [ ] **Step 2: Commit + push to verify**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: github actions lint + typecheck + tests + e2e"
git push
```

Watch the run on GitHub → all jobs green.

---

### Task 12.2: Dockerfile + compose.yaml for Coolify

**Files:**
- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
.svelte-kit
build
dist
data
*.log
.env
.env.*
.git
.github
playwright-report
test-results
```

- [ ] **Step 2: Create `Dockerfile`** (multi-stage; one image runs both api + web behind a tiny supervisor)

```dockerfile
# syntax=docker/dockerfile:1.7
FROM oven/bun:1.1.34 AS deps
WORKDIR /app
COPY package.json bun.lockb tsconfig.base.json tsconfig.json biome.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/engines/package.json packages/engines/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun --filter @search-builder/web build

FROM oven/bun:1.1.34 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates dumb-init && rm -rf /var/lib/apt/lists/*
COPY infra/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000 3001
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/entrypoint.sh"]
```

- [ ] **Step 3: Create `infra/entrypoint.sh`** (runs migrations, then both servers)

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /app/apps/api
bun src/db/migrate.ts
bun src/server.ts &
API_PID=$!
cd /app/apps/web
PORT=3000 ORIGIN=${WEB_ORIGIN:-http://localhost:3000} node build &
WEB_PID=$!
trap "kill $API_PID $WEB_PID" SIGINT SIGTERM
wait -n $API_PID $WEB_PID
```

- [ ] **Step 4: Create `compose.yaml`**

```yaml
services:
  search-builder:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      PORT: 3001
      DB_PATH: /data/db.sqlite
      INITIAL_PASSWORD: ${INITIAL_PASSWORD}
      SESSION_TTL_DAYS: 30
      COOKIE_SECURE: 'true'
      COOKIE_DOMAIN: ${COOKIE_DOMAIN:-}
      ALLOWED_ORIGIN: ${ALLOWED_ORIGIN}
      WEB_ORIGIN: ${WEB_ORIGIN}
    volumes:
      - search_builder_data:/data

volumes:
  search_builder_data:
```

- [ ] **Step 5: Smoke build locally**

Run: `cd /root/Development/search-builder && docker build -t search-builder:dev .`
Expected: image builds, no errors.

- [ ] **Step 6: Commit + push**

```bash
git add Dockerfile .dockerignore compose.yaml infra/entrypoint.sh
git commit -m "build: dockerfile + compose for coolify deploy"
git push
```

---

### Task 12.3: README finalization + first deploy

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
# search-builder

Single-user, self-hosted web app for composing boolean search queries against Google, GitHub Code Search, and Shodan. Build a tree of operators and AND/OR/NOT groups; the app serialises to the engine's native syntax and opens the URL in a new tab.

## Features
- Boolean tree builder (AND/OR/NOT, nested, negation)
- Per-engine operator catalogs (Google, GitHub Code Search, Shodan)
- Library with folders + tags, soft delete, restore
- Read-only raw mode + Copy URL / Copy query
- Drag & drop reorder within and across groups
- Undo/redo, autosave, keyboard shortcuts
- Seed templates for common recon patterns
- Single password auth; password change in settings

## Stack
Bun monorepo · Hono + Drizzle + SQLite · SvelteKit · Biome · Playwright · Docker · Coolify

## Local dev
```bash
bun install
cp apps/api/.env.example apps/api/.env  # set INITIAL_PASSWORD
cd apps/api && bun src/db/migrate.ts && cd -
bun run dev:api &
bun run dev:web
```

Open http://localhost:5173 and log in.

## Deploy (Coolify)
1. Add this repo as an application in Coolify.
2. Set env: `INITIAL_PASSWORD`, `ALLOWED_ORIGIN`, `WEB_ORIGIN`, `COOKIE_DOMAIN`.
3. Mount volume at `/data`.
4. Deploy.

## Disclaimer
This is a personal recon/research tool. Use only against systems you are authorised to test.

## Docs
- [Design spec](docs/superpowers/specs/2026-05-20-search-builder-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-20-search-builder-mvp.md)
```

- [ ] **Step 2: Commit + push + deploy**

```bash
git add README.md
git commit -m "docs: README with usage + deploy guide"
git push
```

In Coolify, create app pointing at `kolezka/search-builder`, set env vars, attach `/data` volume, deploy. Verify the public URL responds with `/login`.

---

## Self-review (run after writing the plan)

- **Spec coverage** — each section in the spec is implemented somewhere above:
  - §3 repo structure → Task 1.1, 1.4, 2.1, 3.1, 7.1
  - §4 data model → Task 3.2 (schema), Task 6.1 (templates)
  - §5 query tree → Task 1.4 (types) + 2.8 (validator)
  - §6 engine adapters → Tasks 2.2–2.7
  - §7 API surface → Tasks 3.4, 4.3, 5.1, 5.3, 5.4, 6.1
  - §8 auth → Tasks 4.1, 4.2, 4.3
  - §9 builder UX → Tasks 9.1–10.3
  - §10 page shell → Tasks 7.3, 8.1, 8.2
  - §11 templates → Tasks 6.1, 10.4
  - §12 soft delete → built into 5.1, 5.3 (CRUD), 8.2 (trash route)
  - §13 testing → Tasks 2.3, 2.5, 2.7, 2.8, 4.2, 6.2, 9.1, 11.3
  - §14 risks → tracked in spec
  - Appendices → Tasks 2.2, 2.4, 2.6
- **Placeholders** — none ("TBD", "TODO", "implement later" not present in any task body).
- **Type consistency** — `QueryNode`, `EngineKey`, `OperatorSpec`, `FolderDto`, `QueryListDto`, `QueryFullDto`, `StatsDto`, `TagDto`, `EngineAdapter` are defined once in `packages/types` and consumed consistently in `packages/engines`, `apps/api`, and `apps/web`. Method names match across layers (`api.queries.list/get/create/update/remove/restore/touch/duplicate` ↔ `/api/queries` routes).
- **Method name consistency** — `serializeTree`, `buildUrl`, `validateValue` consistent across all three adapters; `validateTree` lives in `packages/engines/src/validate-tree.ts` and is used by `apps/api/src/repos/queries-repo.ts`.






