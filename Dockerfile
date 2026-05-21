# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.10 AS deps
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json tsconfig.json biome.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/engines/package.json packages/engines/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun --filter @search-builder/web build

FROM oven/bun:1.3.10 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates dumb-init && rm -rf /var/lib/apt/lists/*
COPY infra/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000 3001
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/entrypoint.sh"]
