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
Bun monorepo · Hono + Drizzle + Postgres (postgres-js) · SvelteKit (adapter-node) · Biome · Playwright · Docker · Coolify

## Local dev

Start only the database with Docker, then run the app processes directly:

````bash
docker compose -f docker-compose.dev.yml up -d
bun install
cd apps/api && DATABASE_URL=postgres://search_builder:search_builder@localhost:5432/search_builder bun src/db/migrate.ts && cd -
INITIAL_PASSWORD=dev bun run dev:api &
bun run dev:web
````

Then open http://localhost:5173 and log in with password `dev`.

The dev compose file provides Postgres on `localhost:5432` with user/db `search_builder` and password `search_builder`.

## Database configuration

The API accepts either a full `DATABASE_URL` or individual `POSTGRES_*` variables:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | Full connection string; overrides all POSTGRES_* vars when set |
| `POSTGRES_HOST` | `postgres` | Service name in compose network |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_USER` | `search_builder` | Baked into custom pg image — no need to set |
| `POSTGRES_PASSWORD` | *(required)* | Only secret; set in Coolify env tab |
| `POSTGRES_DB` | `search_builder` | Baked into custom pg image — no need to set |

The custom Postgres image (`docker/postgres.Dockerfile`) bakes `POSTGRES_USER` and `POSTGRES_DB` as constants so they don't appear as editable fields in Coolify's env UI — only `POSTGRES_PASSWORD` needs to be set there.

## Deploy (Coolify)

The stack ships two services: `postgres` (private) and `app` (public, port 3000). The `app` container runs a single Node process — SvelteKit's adapter-node serves the UI and a catch-all `/api/[...path]/+server.ts` route delegates to a Hono instance mounted in-process. No separate api container, no internal port, no CORS.

1. Add this repo as a Docker Compose application in Coolify pointing at `docker-compose.yml`.
2. Set the following env vars in the Coolify env tab:

   | Variable | Required | Example |
   |---|---|---|
   | `POSTGRES_PASSWORD` | yes | `hunter2` |
   | `INITIAL_PASSWORD` | yes (first boot) | `hunter2` |
   | `COOKIE_DOMAIN` | optional | `.example.com` |
   | `SESSION_TTL_DAYS` | optional | `30` |
   | `COOKIE_SECURE` | optional | `true` |

   `SERVICE_FQDN_APP_3000` is injected by Coolify (auto-generated, or set a custom domain in the app's Domains tab); the compose substitutes `SERVICE_URL_APP` into `ORIGIN`/`ALLOWED_ORIGIN`.

3. Deploy. The entrypoint runs `bun apps/api/src/db/migrate.ts` before `node apps/web/build/index.js` starts. On first boot the password hash is seeded from `INITIAL_PASSWORD`; subsequent boots ignore it.

## Known limitations (MVP)
- **Drag-and-drop & empty groups under Svelte 5**: svelte-dnd-action 0.9.x has reactivity gaps under Svelte 5. Adding a child to a freshly-empty group via store mutation may not appear until the dndzone re-evaluates. Workaround: start from a template, or reload the builder after adding the first item. To be addressed by switching to a Svelte 5-native DnD library.
- **Wayback Machine** is deferred (its query model is URL/CDX-based, not boolean).
- **No server-side result fetching** — by design. The app builds a URL and opens it in a new tab.

## Disclaimer
This is a personal recon/research tool. Use only against systems you are authorised to test.

## Docs
- [Design spec](docs/superpowers/specs/2026-05-20-search-builder-design.md)
- [Implementation plan](docs/superpowers/plans/2026-05-20-search-builder-mvp.md)
