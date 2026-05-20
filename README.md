# search-builder

Single-user, self-hosted boolean query builder for Google, GitHub Code Search, and Shodan.

## Stack
Bun monorepo · Hono + Drizzle + SQLite · SvelteKit · Biome · Coolify

## Quick start

````bash
bun install
cp apps/api/.env.example apps/api/.env  # set INITIAL_PASSWORD
bun run dev:api &
bun run dev:web
````

## Docs
- [Design spec](docs/superpowers/specs/2026-05-20-search-builder-design.md)
- [MVP plan](docs/superpowers/plans/2026-05-20-search-builder-mvp.md)

## Disclaimer
This is a personal recon/research tool. Use only against systems you are authorised to test.
