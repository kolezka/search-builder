# search-builder

Single-user, self-hosted web app for composing boolean search queries against Google, GitHub Code Search, and Shodan. Build a tree of operators and AND/OR/NOT groups; the app serialises to the engine's native syntax and opens the URL in a new tab.

## Features
- Boolean tree builder (AND/OR/NOT, nested, negation)
- Per-engine operator catalogs (Google, GitHub Code Search, Shodan)
- Library with folders + tags, soft delete, restore
- Read-only raw mode + Copy URL / Copy query
- Drag & drop reorder (within and across groups)
- Undo/redo, autosave, keyboard shortcuts
- Seed templates for common recon patterns (10 templates shipped)
- Single password auth; password change in settings

## Stack
Bun monorepo · Hono + Drizzle + SQLite (bun:sqlite) · SvelteKit · Biome · Playwright · Docker · Coolify

## Local dev

````bash
bun install
cp apps/api/.env.example apps/api/.env  # set INITIAL_PASSWORD
cd apps/api && bun src/db/migrate.ts && cd -
bun run dev:api &
bun run dev:web
````

Then open http://localhost:5173 and log in.

## Deploy (Coolify)
1. Add this repo as a Docker Compose application in Coolify pointing at `compose.yaml`.
2. Set env vars: `INITIAL_PASSWORD`, `ALLOWED_ORIGIN`, `WEB_ORIGIN`, optionally `COOKIE_DOMAIN`.
3. Mount the named volume `search_builder_data` to `/data`.
4. Deploy. On first boot the password hash is seeded from `INITIAL_PASSWORD`; subsequent boots ignore the env var.

## Known limitations (MVP)
- **Drag-and-drop & empty groups under Svelte 5**: svelte-dnd-action 0.9.x has reactivity gaps under Svelte 5. Adding a child to a freshly-empty group via store mutation may not appear until the dndzone re-evaluates. Workaround: start from a template, or reload the builder after adding the first item. To be addressed by switching to a Svelte 5-native DnD library.
- **Wayback Machine** is deferred (its query model is URL/CDX-based, not boolean).
- **No server-side result fetching** — by design. The app builds a URL and opens it in a new tab.

## Disclaimer
This is a personal recon/research tool. Use only against systems you are authorised to test.

## Docs
- [Design spec](docs/superpowers/specs/2026-05-20-search-builder-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-20-search-builder-mvp.md)
