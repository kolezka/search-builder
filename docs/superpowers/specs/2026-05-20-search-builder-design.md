# search-builder — design spec

Last updated: 2026-05-20
Status: draft — pending user approval

## 1. Overview

`search-builder` is a single-user, self-hosted web application for visually composing complex boolean search queries against three engines: **Google**, **GitHub Code Search**, and **Shodan**. The user builds queries as a nested tree of terms, operators, and AND/OR/NOT groups; the app serialises the tree into the engine's native query syntax and opens the result in a new browser tab.

Saved queries live in a library organised by flat folders and cross-cutting tags. The app does not execute searches server-side — it only generates URLs. No API keys, no result fetching, no result storage.

### Goals
- Build arbitrarily nested boolean queries (`(intitle:admin OR intitle:login) AND filetype:php -site:github.com`) without thinking about syntax
- Per-engine operator catalogs surfaced as a discoverable, searchable list
- Personal library of saved queries with folders + tags
- Trivial deploy to Coolify (Docker, SQLite volume, single password)

### Non-goals (MVP)
- Multi-user, accounts, sharing
- Server-side result fetching (no Google/GitHub/Shodan API integration)
- Wayback Machine support (deferred — fundamentally different from boolean engines)
- Mobile-native app (web is responsive enough)
- Query history with snapshots of past results

## 2. Stack & deployment

- **Runtime**: Bun
- **API**: Hono + Drizzle ORM
- **Web**: SvelteKit
- **DB**: SQLite, single file, mounted volume in Coolify
- **Auth**: cookie session, password hash in DB (env seed on first boot)
- **Repo layout**: Bun monorepo with workspaces (mirrors kolezka-cards)
- **Lint/format**: Biome
- **Tests**: `bun test` (engines + api), Playwright (web e2e)
- **CI**: GitHub Actions — lint, typecheck, test, e2e
- **Deploy**: Coolify with `compose.yaml`, persistent volume for SQLite

## 3. Repository structure

```
search-builder/
├── apps/
│   ├── api/                            # Hono + Drizzle + Bun
│   │   ├── src/
│   │   │   ├── routes/                 # /auth, /engines, /folders, /queries, /tags, /templates
│   │   │   ├── db/                     # schema.ts, migrations/, client.ts
│   │   │   ├── auth/                   # middleware, password hashing, sessions
│   │   │   ├── validation/             # zod schemas, tree validator
│   │   │   └── server.ts
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── web/                            # SvelteKit
│       ├── src/
│       │   ├── routes/                 # /login, /, /q/new, /q/[id], /folders/[id], /tags/[name], /trash, /settings
│       │   ├── lib/
│       │   │   ├── builder/            # Builder.svelte, Group.svelte, TermRow.svelte, OperatorRow.svelte, PreviewBar.svelte, EngineSwitcher.svelte, RawMode.svelte
│       │   │   ├── api-client/         # typed fetch wrapper, queries/folders/tags clients
│       │   │   ├── stores/             # builderStore, authStore, notifyStore
│       │   │   └── ui/                 # Glass* components copied from kolezka-cards (see §10)
│       │   ├── app.html
│       │   └── hooks.server.ts         # session check, redirect to /login
│       ├── svelte.config.js
│       └── package.json
├── packages/
│   ├── types/                          # shared types (QueryNode, EngineKey, DTOs), Zod schemas
│   └── engines/                        # per-engine OperatorSpec[] + serializeTree + buildUrl
│       └── src/
│           ├── types.ts
│           ├── google.ts
│           ├── github.ts
│           ├── shodan.ts
│           ├── operators/              # catalog definitions per engine, see Appendix
│           ├── serialize.ts            # generic tree → string walker (engine-specific overrides)
│           └── index.ts                # engines registry
├── compose.yaml                        # Coolify Docker Compose
├── Dockerfile                          # multi-stage: build apps, runtime serves both
├── biome.json
├── tsconfig.base.json
├── package.json                        # workspaces: ["apps/*", "packages/*"]
└── README.md
```

## 4. Data model (Drizzle, SQLite)

```typescript
// folders — flat (no parent_id)
folders {
  id           text pk (uuid)
  name         text not null
  color        text                    // hex, optional sidebar tint
  created_at   integer not null        // unix ms
  updated_at   integer not null
  deleted_at   integer                 // soft delete
}

// queries — main entity
queries {
  id              text pk (uuid)
  name            text not null
  description     text                  // optional, no length limit
  engine          text not null         // 'google' | 'github' | 'shodan'
  tree            text not null         // JSON-serialized QueryNode
  folder_id       text                  // fk -> folders.id, nullable (root)
  template_id     text                  // fk -> templates.id, set when "new from template" used
  created_at      integer not null
  updated_at      integer not null
  last_opened_at  integer                // null until first "open in engine"
  deleted_at      integer                // soft delete
}

// tags — cross-cutting categorization
tags {
  id    text pk
  name  text unique not null            // case-sensitive; e.g. '★pinned' for favorites
}
query_tags {
  query_id  text fk
  tag_id    text fk
  PK (query_id, tag_id)
}

// templates — seeded read-only library
templates {
  id           text pk
  name         text not null
  description  text not null
  engine       text not null
  tree         text not null            // same JSON shape as queries.tree
  category     text                     // optional, for grouping in UI
  created_at   integer not null
}

// sessions — cookie auth state
sessions {
  id          text pk                  // crypto-random hex, 32B
  created_at  integer not null
  expires_at  integer not null
}

// app_config — single-row config (password hash, schema version)
app_config {
  key    text pk                       // 'password_hash', 'schema_version', 'first_boot_at'
  value  text not null
}
```

### Conventions
- All entities with `deleted_at` are excluded from default queries (`WHERE deleted_at IS NULL`).
- `★pinned` is a reserved tag rendered first in the library list with a star icon.
- `template_id` lets the UI show "Created from template: X" on saved queries, and survives template renames.

## 5. Query tree shape (`packages/types`)

```typescript
export type EngineKey = 'google' | 'github' | 'shodan';

export type QueryNode = GroupNode | TermNode | OperatorNode;

export type GroupNode = {
  type: 'group';
  op: 'AND' | 'OR';
  negated?: boolean;                    // renders as -(...) or NOT(...) depending on engine
  children: QueryNode[];                // length 0 allowed but produces empty serialization
};

export type TermNode = {
  type: 'term';
  value: string;                        // raw user input; serializer applies quoting
  exactMatch?: boolean;                 // if true, wraps in double quotes
  negated?: boolean;                    // if true, prefixes with - (Google/Shodan) or NOT (GitHub)
};

export type OperatorNode = {
  type: 'operator';
  key: string;                          // operator key, must exist in engine.operators
  value: string;                        // raw value; serializer/validator applies engine-specific rules
  negated?: boolean;
};
```

### Tree invariants (validated server-side via Zod)
- Root is always a `GroupNode`. Top-level group has `op: 'AND'` and is non-negated (UI hides the controls).
- `children` may be empty; an empty top-level group serializes to empty string and `Open in engine` is disabled.
- `OperatorNode.key` must exist in `engines[engine].operators`.
- `value` must pass `operator.validate?.(value)` when defined.
- Tree depth limited to 8 (safety against pathological recursion).

## 6. Engine adapters (`packages/engines`)

### Shared contract

```typescript
export type OperatorValueType = 'text' | 'enum' | 'number' | 'range' | 'date' | 'date-range' | 'url' | 'domain';

export type OperatorSpec = {
  key: string;
  label: string;                        // "Title contains"
  description: string;                  // tooltip
  category?: string;                    // for grouping in dropdown
  valueType: OperatorValueType;
  enumValues?: string[];                // when valueType='enum'
  placeholder?: string;
  supportsNegation: boolean;
  validate?: (value: string) => string | null;  // null = ok, string = error
};

export type EngineAdapter = {
  key: EngineKey;
  name: string;
  icon: string;                         // iconify key, e.g. 'simple-icons:google'
  baseUrl: string;
  operators: OperatorSpec[];
  serializeTree: (tree: QueryNode) => string;
  buildUrl: (tree: QueryNode) => string;
};

export const engines: Record<EngineKey, EngineAdapter> = { google, github, shodan };
```

### Serialization rules (per engine)

**Google** — `https://www.google.com/search?q=<url-encoded>`:
- Terms separated by space (implicit AND).
- `OR` group: children joined by ` OR `, wrapped in `(...)`.
- `AND` group at top level: bare; nested AND group is `(a b c)`.
- Negation: prefix node with `-`. Negated group: `-(...)`.
- Operator: `key:value`; quote value if it contains space; uppercase macro for `AROUND(n)`.
- TermNode with `exactMatch`: `"value"`.

**GitHub** — `https://github.com/search?type=code&q=<url-encoded>`:
- Terms separated by space; bare terms = AND (GitHub does not support arbitrary boolean grouping in code search, see "fallback" below).
- `OR` group: children joined by ` OR `; **only flat OR groups supported** — nested OR inside AND not honored by GitHub. The serializer accepts the tree but emits a warning surfaced in UI: "GitHub Code Search ignores nested OR; consider flattening".
- Negation on term: `NOT term`; on operator: `-key:value` (e.g., `-language:javascript`).
- Operator: `key:value`; values with spaces must be quoted.

**Shodan** — `https://www.shodan.io/search?query=<url-encoded>`:
- Terms separated by space (implicit AND).
- `OR`: explicit literal between children; group wrapped in `(...)`.
- Negation: prefix `-`.
- Operator: `key:value` (always lowercase key); ranges and CIDR allowed for specific keys (`port:80,443`, `net:1.2.3.0/24`).

### Validation
- Per-operator `validate` (e.g., `port` only accepts numbers or comma-lists or ranges; `country` only accepts ISO-2 codes; URL operators validate as URL).
- Tree-level validation enforces invariants from §5.

### UI rendering of engine-specific quirks
- **Engine switcher** shows confirmation modal when switching from engine A to B if tree contains operators not present in B. Modal offers: (a) drop unsupported nodes and switch, (b) cancel.
- **GitHub nested-OR warning**: builder renders a yellow notice when an OR group is nested inside another OR group while engine is GitHub.

## 7. API surface (Hono)

Base path: `/api`. All endpoints require session cookie except `/auth/*`.

### Auth

| Method | Path                  | Description                                                                            |
| ------ | --------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/auth/login`         | Body `{ password }`. On success, sets `sid` HttpOnly cookie (30d), returns 200.        |
| POST   | `/auth/logout`        | Deletes session row + clears cookie.                                                   |
| GET    | `/auth/me`            | Returns `{ authenticated: bool }` for SvelteKit hooks bootstrap.                       |
| POST   | `/auth/change-password` | Body `{ old, new }`. Verifies old, replaces hash in `app_config`, invalidates other sessions. |

### Engines (static catalog)

| Method | Path                  | Description                                                                |
| ------ | --------------------- | -------------------------------------------------------------------------- |
| GET    | `/engines`            | Returns `EngineAdapter[]` (without function fields, just metadata). Cached. |

### Folders

| Method | Path                  | Description                                                          |
| ------ | --------------------- | -------------------------------------------------------------------- |
| GET    | `/folders`            | Returns `[{ id, name, color, query_count }]` (active only).         |
| POST   | `/folders`            | Body `{ name, color? }`. Returns created folder.                    |
| PATCH  | `/folders/:id`        | Body `{ name?, color? }`. Returns updated folder.                   |
| DELETE | `/folders/:id`        | Soft-delete folder. Its queries' `folder_id` set to null.           |
| POST   | `/folders/:id/restore` | Undo soft delete.                                                    |

### Queries

| Method | Path                       | Description                                                                                       |
| ------ | -------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/queries`                 | Query params: `folder`, `tag`, `engine`, `search`, `sort=last_opened\|name\|updated`, `include_deleted`. Returns light DTO (no `tree`). |
| GET    | `/queries/:id`             | Returns full record incl. `tree`.                                                                 |
| POST   | `/queries`                 | Body `{ name, description?, engine, tree, folder_id?, tags?, template_id? }`. Validates tree.    |
| PATCH  | `/queries/:id`             | Body: any subset of above + `deleted_at` is rejected (use DELETE).                                |
| DELETE | `/queries/:id`             | Soft delete.                                                                                      |
| POST   | `/queries/:id/restore`     | Undo soft delete.                                                                                 |
| DELETE | `/queries/:id?hard=true`   | Hard delete from trash page (irreversible, requires confirmation in UI).                          |
| POST   | `/queries/:id/duplicate`   | Creates copy with `name = "<name> (copy)"`, same tree/folder/tags, `last_opened_at` reset.       |
| POST   | `/queries/:id/touch`       | Bumps `last_opened_at`. Called by web client just before `window.open(buildUrl(tree))`.          |

### Tags

| Method | Path                  | Description                                                          |
| ------ | --------------------- | -------------------------------------------------------------------- |
| GET    | `/tags`               | Returns `[{ id, name, usage_count }]`.                              |
| DELETE | `/tags/:id`           | Removes tag + all `query_tags` rows. Hard delete (tags are cheap).   |

Tags are not POSTed directly — they are created/deleted implicitly when `POST/PATCH /queries` includes/omits tag names. The backend resolves tag names → ids, creating missing ones.

### Templates

| Method | Path                              | Description                                                                                  |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/templates`                      | Returns all templates with full tree.                                                        |
| POST   | `/templates/:id/instantiate`      | Body `{ name?, folder_id? }`. Creates new `queries` row from template, returns query.        |

Templates are seeded at first boot from `apps/api/src/db/seed-templates.ts`. They are not editable from the UI in MVP.

### Stats

| Method | Path                  | Description                                                                |
| ------ | --------------------- | -------------------------------------------------------------------------- |
| GET    | `/stats`              | Returns `{ queries_count, folders_count, tags_count, templates_count, db_size_bytes }` for `/settings` page. |

### Validation
- All POST/PATCH bodies validated by Zod schemas exported from `packages/types`.
- Tree validation: recursive walker checks operator keys against `engines[engine].operators` and runs `validate?` per operator.
- Rejection format: `400 { error, code: 'invalid_tree', issues: [...] }`.

### Error format
```typescript
type ApiError =
  | { error: string, code: 'unauthorized' }
  | { error: string, code: 'not_found' }
  | { error: string, code: 'validation_error', issues: ZodIssue[] }
  | { error: string, code: 'rate_limited', retry_after: number }
  | { error: string, code: 'server_error', requestId: string };
```

### Rate limiting
- `/auth/login`: 5 attempts / 15 minutes / IP. In-memory token bucket (reset OK on restart — single user, low stake).

## 8. Authentication

### Bootstrap (first boot)
1. On container start, `apps/api` checks `app_config.password_hash`.
2. If missing, reads `INITIAL_PASSWORD` env var, hashes with bcrypt (cost 12), writes to `app_config`, logs `[boot] initial password set from env`.
3. `INITIAL_PASSWORD` is ignored thereafter.
4. If neither `password_hash` in DB nor `INITIAL_PASSWORD` env is present → boot fails with clear message.

### Login flow
1. `POST /auth/login { password }` → `bcrypt.compare(password, app_config.password_hash)`.
2. On match: generate 32-byte hex token, insert into `sessions` with `expires_at = now + 30d`, set cookie `sid=<token>; HttpOnly; Secure; SameSite=Lax; Path=/`.
3. On mismatch: 401 + increment rate-limit bucket.

### Session validation
- Hono middleware reads `sid` cookie, looks up in `sessions`, checks `expires_at > now`.
- Stale sessions are not auto-cleaned; a periodic task is overkill — let them accumulate (tiny rows). Optional: cleanup on login.

### Password change
- `POST /auth/change-password` requires valid session AND correct `old` password.
- On success, writes new hash, then deletes all other sessions (keeps current one).

## 9. Builder UX

### Component hierarchy

```
/q/[id] route
└─ Builder.svelte                  // root, owns builderStore
   ├─ TopBar.svelte                // engine switcher, name, save status, actions
   │  ├─ EngineSwitcher.svelte
   │  └─ ActionMenu.svelte         // duplicate, delete, raw mode, undo/redo
   ├─ PreviewBar.svelte            // live serialized output, Open/Copy buttons
   ├─ Group.svelte (root)          // recursive
   │  ├─ Group.svelte              // nested subgroup
   │  │  └─ ...
   │  ├─ TermRow.svelte
   │  └─ OperatorRow.svelte
   └─ RawMode.svelte               // toggleable read-only textarea
```

### State (`builderStore`)
- Holds `{ engine, tree, name, description, folder_id, tags, dirty, savedAt }`.
- Mutations via immutable updates (helper `updateNode(tree, path, fn)`).
- Undo/redo: ring buffer of 20 prior states, with `Cmd+Z` / `Cmd+Shift+Z`.
- Autosave: debounced 800 ms on `dirty=true` → `PATCH /api/queries/:id`. New queries (`/q/new`) save on first explicit name + first edit (defensive — avoid creating empty rows).

### Interactions
- **Add to group**: each group has a `+` button revealing menu — Term, Operator, Subgroup AND, Subgroup OR.
- **Remove node**: trash icon at row end; subgroups: confirm modal if non-empty.
- **Reorder**: drag handle on each row + group; drag within a group reorders, drag across groups moves. Implementation: `svelte-dnd-action`.
- **Negate**: toggle per row/group.
- **Exact match (terms only)**: toggle wraps value in `"…"`.
- **Engine switch**: dropdown; if tree contains operators not in target engine, modal asks to drop them or cancel.
- **Operator dropdown**: combobox with fuzzy search, grouped by `category`, shows `label` + `description` per item, Enter to select.
- **Raw mode toggle**: read-only textarea displays `serializeTree(tree)` + Copy button. Editing the textarea is disabled in MVP (no parser).
- **Open in engine**: button on PreviewBar — calls `POST /queries/:id/touch`, then `window.open(buildUrl(tree), '_blank', 'noopener')`. Disabled when tree is empty or has validation errors.
- **Copy URL** / **Copy query string**: clipboard with toast confirmation.

### Keyboard shortcuts
- `Cmd/Ctrl + Enter` — Open in engine
- `Cmd/Ctrl + S` — force save now
- `Cmd/Ctrl + D` — duplicate query
- `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` — undo / redo
- `Backspace` on empty row — delete row
- `Esc` — close any open dropdown/modal

### Validation in UI
- Empty term / empty operator value → yellow row border, excluded from preview.
- Operator with failed `validate` → red row border + inline tooltip.
- Open in engine disabled when preview is empty or any row has red state.

### No virtualization in MVP
- Typical queries have <30 leaves; large queries (>100) will render slowly but acceptably. Add virtualization if real usage shows it's needed.

## 10. Page shell, routing, UI library

### Routes
- `/login` — password form, redirects to `/` on success, redirects authenticated users away from `/login`.
- `/` — home, default sidebar (all folders + tags), main pane = library list sorted by `last_opened_at` desc.
- `/q/new?engine=google` — empty builder, engine preselected from query param (default google if missing).
- `/q/[id]` — builder loaded with existing query.
- `/folders/[id]` — library filtered to folder (sidebar highlights, main lists folder contents).
- `/tags/[name]` — library filtered to tag.
- `/trash` — soft-deleted queries (and folders, in a separate section). Actions: restore, hard-delete.
- `/settings` — change password, show storage stats (counts, DB file size).

### Layout shell
- Topbar (height 56px): logo, global search input, "New query" dropdown (per engine), settings cog, logout.
- Left sidebar (width 240px, collapsible): folder tree (flat list), tag list (sorted by usage_count desc), trash link at bottom.
- Main pane: route-specific content.

### Glass UI components
- Copy `Glass.svelte`, `GlassButton.svelte`, `GlassSelect.svelte`, `GlassToggle.svelte`, `GlassInput.svelte` from `kolezka-cards/apps/web/src/lib/ui/` into `search-builder/apps/web/src/lib/ui/`.
- Do **not** create a shared `packages/ui` for this MVP — YAGNI for cross-repo abstraction.

### Responsive
- Desktop-first. On mobile (<768px), sidebar collapses behind hamburger; builder uses single column with vertical groups.

## 11. Templates (seeded library)

Read-only seeded set, populated on first boot via `seed-templates.ts`. MVP set (10 templates):

| Name                                | Engine  | Category       | Why                                             |
| ----------------------------------- | ------- | -------------- | ----------------------------------------------- |
| Exposed .env files                  | google  | secrets        | `filetype:env intext:DB_PASSWORD`              |
| Open directory listings             | google  | recon          | `intitle:"index of /" -inurl:html`             |
| Login pages on subdomain            | google  | recon          | `(intitle:login OR intitle:"sign in") site:*.example.com` |
| Leaked AWS keys                     | github  | secrets        | `AKIA` in code + filename hints                 |
| Hardcoded passwords in code         | github  | secrets        | `password=` in file + language filters          |
| Open RDP servers in country         | shodan  | exposed-svc    | `port:3389 country:PL`                          |
| Unauthenticated MongoDB             | shodan  | exposed-svc    | `product:MongoDB -authentication`               |
| ICS/SCADA exposed                   | shodan  | exposed-svc    | `port:502 OR port:102 has_screenshot:true`     |
| Outdated Apache servers             | shodan  | vuln           | `product:Apache version:2.2`                    |
| GitHub repos with .env in path      | github  | secrets        | `path:.env`                                     |

Each template stores a full `QueryNode` tree (not a string) so it deserializes cleanly into the builder.

## 12. Soft delete behaviour

- `queries.deleted_at` and `folders.deleted_at` are set on DELETE.
- Default `GET /queries` and `GET /folders` filter out rows with `deleted_at != null`.
- `GET /queries?include_deleted=true` returns soft-deleted (used by `/trash` page).
- Restore endpoints (`POST .../restore`) clear `deleted_at`.
- Hard delete (`DELETE /queries/:id?hard=true`) is irreversible, requires double-confirm in UI ("Type the query name to confirm").
- Cascading: deleting a folder does NOT cascade to its queries — they keep `folder_id` set, and when the folder is restored they reappear. If the folder is hard-deleted, the affected queries have `folder_id` nulled.

## 13. Testing strategy

### `packages/engines` — high coverage
- Per engine: snapshot tests of `serializeTree` for representative trees (term, operator, OR group, nested groups, negation, exact match, mixed).
- `buildUrl` tests for each engine covering URL encoding, special characters, and unicode.
- `validate` tests for operators with custom validators (e.g., `port`, `country`, `daterange`).

### `apps/api` — integration against real SQLite
- CRUD for queries, folders, tags, templates.
- Auth: bad password → 401, good → 200 + cookie, expired session → 401, rate limit after 5 fails.
- Tree validation rejection: nonexistent operator key, invalid value, depth > 8.
- Soft delete & restore round-trip.
- Duplicate endpoint produces deep copy.
- DB: in-memory SQLite (`:memory:`), fresh schema per test.

### `apps/web` — Playwright e2e (critical paths only)
- Login flow (success + bad password).
- Create query from template, add an operator, save, open in engine (mock `window.open`).
- Drag-and-drop reorder within a group + across groups.
- Engine switch with incompatible operator → modal flow.

### CI (`.github/workflows/ci.yml`)
- Job: `bun install`, `biome ci`, `tsc --noEmit` (both apps + packages), `bun test` in engines + api, `bun playwright test` in web (headless Chromium).
- Pre-commit hook (`lefthook` or `simple-git-hooks`): `biome check --apply`, `tsc --noEmit` for staged-touched packages.

## 14. Open questions / risks

- **GitHub Code Search nested booleans**: GitHub's query parser ignores nested OR within AND in many cases. Mitigation: warning surface in UI (§6). Risk: user builds a query that renders correctly in preview but GitHub silently flattens, returning unexpected results. Documenting this in tooltip is necessary.
- **Operator drift**: Google and Shodan evolve their operator sets. We have no programmatic way to track this. Mitigation: catalog lives in code, easy to PR-update. Add a footer link "Suggest missing operator" → GitHub issue.
- **Bot indexing on public repo**: repo is public per user request. Templates with "leaked credentials" wording might attract attention. Acceptable risk for OSS recon tool; document in README that this is for authorised testing only.
- **SQLite locking under concurrent web requests**: WAL mode + reasonable busy_timeout handles single-user load trivially.
- **Cookie session vs token in URL** when sharing links: opening a query in engine uses `window.open`, no auth needed. No issue.

## 15. Build sequence (informs the implementation plan)

Not part of this spec — `writing-plans` will turn this into a phased plan. Likely phases:
1. Repo init: monorepo skeleton, biome, tsconfig, package.json workspaces, Dockerfile, compose.yaml.
2. `packages/types` + `packages/engines` (Google first, then GitHub, then Shodan, with tests as we go).
3. `apps/api` boot: DB schema, migrations, auth, /engines, /folders, /queries minimal CRUD.
4. `apps/web` boot: SvelteKit shell, login page, library list (no builder yet).
5. Builder: tree state, Group/TermRow/OperatorRow, preview bar, autosave.
6. Drag & drop, engine switcher with confirmation, raw mode.
7. Tags, search, trash, templates, settings.
8. CI workflow, Coolify deploy.

---

## Appendix A — Google operator catalog (MVP set)

| Key            | Label                       | Value type   | Negation | Notes                                    |
| -------------- | --------------------------- | ------------ | -------- | ---------------------------------------- |
| `intitle`      | Title contains              | text         | yes      | Single token only                         |
| `allintitle`   | All terms in title          | text         | yes      | Space-separated terms                     |
| `inurl`        | URL contains                | text         | yes      |                                           |
| `allinurl`     | All terms in URL            | text         | yes      |                                           |
| `intext`       | Text contains               | text         | yes      |                                           |
| `allintext`    | All terms in text           | text         | yes      |                                           |
| `inanchor`     | Anchor text contains        | text         | yes      |                                           |
| `allinanchor`  | All terms in anchor         | text         | yes      |                                           |
| `site`         | Restrict to domain          | domain       | yes      | Wildcard subdomain allowed: `*.example.com` |
| `link`         | Pages linking to            | url          | no       | Deprecated by Google but still works partially |
| `related`      | Sites similar to            | url          | no       |                                           |
| `cache`        | Cached version of           | url          | no       |                                           |
| `info`         | Info about URL              | url          | no       |                                           |
| `define`       | Definition of               | text         | no       |                                           |
| `filetype`     | File type                   | enum         | yes      | pdf, doc, xls, ppt, txt, csv, sql, log, conf, env, key, pem, bak, …  |
| `ext`          | File extension              | text         | yes      | Alias of filetype                         |
| `daterange`    | Julian date range           | range        | no       | `daterange:2459580-2459700`               |
| `before`       | Indexed before              | date         | no       | `before:2024-01-01`                       |
| `after`        | Indexed after               | date         | no       | `after:2024-01-01`                        |
| `AROUND`       | Terms near each other       | number       | no       | Renders inline as `AROUND(n)` between terms — special UI |
| `weather`      | Weather for location        | text         | no       |                                           |
| `stocks`       | Stock quote                 | text         | no       |                                           |
| `map`          | Map for                     | text         | no       |                                           |
| `movie`        | Movie info                  | text         | no       |                                           |
| `source`       | News source                 | text         | no       |                                           |
| `loc`/`location` | Location filter           | text         | no       |                                           |

## Appendix B — GitHub Code Search operator catalog

| Key          | Label                  | Value type | Negation | Notes                                                 |
| ------------ | ---------------------- | ---------- | -------- | ----------------------------------------------------- |
| `repo`       | Repository             | text       | yes      | `owner/name`                                          |
| `user`       | User owner             | text       | yes      |                                                       |
| `org`        | Organization owner     | text       | yes      |                                                       |
| `language`   | Language               | enum       | yes      | js, ts, py, go, rust, …                               |
| `path`       | File path contains     | text       | yes      |                                                       |
| `filename`   | File name              | text       | yes      |                                                       |
| `extension`  | File extension         | text       | yes      | Without dot                                           |
| `in`         | Search location        | enum       | no       | `file`, `path`, `file,path`                           |
| `size`       | File size              | range      | no       | `>10000`, `<5000`, `100..1000`                        |
| `fork`       | Include forks          | enum       | no       | `only`, `true`                                        |
| `mirror`     | Is mirror              | enum       | no       | `true`, `false`                                       |
| `archived`   | Archived repo          | enum       | no       | `true`, `false`                                       |
| `is`         | Repo visibility        | enum       | no       | `public`, `private`                                   |
| `stars`      | Stars                  | range      | no       |                                                       |
| `forks`      | Forks                  | range      | no       |                                                       |
| `created`    | Repo created at        | date-range | no       |                                                       |
| `pushed`     | Last push              | date-range | no       |                                                       |
| `license`    | License                | enum       | no       | `mit`, `apache-2.0`, `gpl-3.0`, …                     |
| `topic`      | Repo topic             | text       | yes      |                                                       |

## Appendix C — Shodan operator catalog

| Key                    | Label                  | Value type | Negation | Notes                                  |
| ---------------------- | ---------------------- | ---------- | -------- | -------------------------------------- |
| `port`                 | Port                   | number     | yes      | Comma-list and ranges: `80,443,8000-8100` |
| `hostname`             | Hostname contains      | text       | yes      |                                        |
| `net`                  | Network (CIDR)         | text       | yes      | `1.2.3.0/24`                           |
| `ip`                   | IP address             | text       | yes      |                                        |
| `country`              | Country (ISO-2)        | enum       | yes      |                                        |
| `city`                 | City                   | text       | yes      |                                        |
| `geo`                  | Geo (lat, long, dist)  | text       | no       |                                        |
| `org`                  | Organization           | text       | yes      |                                        |
| `isp`                  | ISP                    | text       | yes      |                                        |
| `asn`                  | ASN                    | text       | yes      | `AS15169`                              |
| `os`                   | Operating system       | text       | yes      |                                        |
| `product`              | Product                | text       | yes      |                                        |
| `version`              | Product version        | text       | yes      |                                        |
| `ssl`                  | SSL certificate search | text       | yes      |                                        |
| `ssl.cert.subject.cn`  | SSL cert subject CN    | text       | yes      |                                        |
| `ssl.cert.issuer.cn`   | SSL cert issuer CN     | text       | yes      |                                        |
| `ssl.cert.serial`      | SSL cert serial        | text       | yes      |                                        |
| `ssl.version`          | SSL/TLS version        | enum       | yes      | `TLSv1`, `TLSv1.1`, `TLSv1.2`, `TLSv1.3` |
| `http.title`           | HTTP page title        | text       | yes      |                                        |
| `http.html`            | HTML content contains  | text       | yes      |                                        |
| `http.status`          | HTTP status            | number     | yes      |                                        |
| `http.headers`         | HTTP header contains   | text       | yes      |                                        |
| `has_screenshot`       | Has screenshot         | enum       | no       | `true`, `false`                        |
| `has_ssl`              | Has SSL                | enum       | no       | `true`, `false`                        |
| `has_vuln`             | Has known vulnerability| enum       | no       | `true`, `false`                        |
| `vuln`                 | CVE ID                 | text       | yes      | `CVE-2021-44228`                       |
| `category`             | Category               | text       | yes      |                                        |
| `tag`                  | Tag                    | text       | yes      |                                        |
| `after`                | Banner seen after      | date       | no       | `01/01/2024` (US format Shodan uses)   |
| `before`               | Banner seen before     | date       | no       |                                        |
