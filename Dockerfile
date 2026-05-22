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

# ---------- Web build (produces apps/web/build via adapter-node) ----------
FROM deps AS web-build
COPY . .
RUN bun --filter @search-builder/web build

# ---------- API runtime (Hono on 3001, runs migrations on boot) ----------
FROM oven/bun:1.3.10 AS api-runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dumb-init \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.base.json tsconfig.json ./
COPY apps/api ./apps/api
COPY packages ./packages
EXPOSE 3001
WORKDIR /app/apps/api
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/server.ts"]

# ---------- Web runtime (SvelteKit Node adapter on 3000) ----------
FROM oven/bun:1.3.10 AS web-runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates dumb-init \
 && rm -rf /var/lib/apt/lists/*
COPY --from=web-build /app/node_modules ./node_modules
COPY --from=web-build /app/package.json ./package.json
COPY --from=web-build /app/apps/web/build ./apps/web/build
COPY --from=web-build /app/apps/web/package.json ./apps/web/package.json
COPY --from=web-build /app/packages ./packages
EXPOSE 3000
WORKDIR /app/apps/web
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "build/index.js"]
