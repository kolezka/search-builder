# syntax=docker/dockerfile:1.7

# ---------- Shared workspace install ----------
FROM oven/bun:1.3.10 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json tsconfig.json biome.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/engines/package.json packages/engines/
RUN bun install --frozen-lockfile

# ---------- Web build (SvelteKit bundles Hono into the SSR output) ----------
FROM deps AS web-build
COPY . .
RUN bun --filter @search-builder/web build

# ---------- Runtime (single process: SvelteKit on 3000, /api/* served in-process) ----------
FROM oven/bun:1.3.10 AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dumb-init \
 && rm -rf /var/lib/apt/lists/*
COPY --from=web-build /app/node_modules ./node_modules
COPY --from=web-build /app/package.json ./package.json
COPY --from=web-build /app/apps/web/build ./apps/web/build
COPY --from=web-build /app/apps/web/package.json ./apps/web/package.json
# API source ships so the entrypoint can run migrations via bun before
# node starts serving. The Hono app itself is already bundled into
# apps/web/build via vite's noExternal.
COPY --from=web-build /app/apps/api ./apps/api
COPY --from=web-build /app/packages ./packages
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "cd /app/apps/api && bun src/db/migrate.ts && cd /app/apps/web && exec node build/index.js"]
