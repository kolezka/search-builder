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
