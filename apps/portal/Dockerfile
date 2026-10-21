FROM oven/bun:1.2.21 AS bun
FROM node:26.12.0-bookworm-slim AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

# Workspace manifests keep the shared lockfile valid. Only portal source is copied.
COPY package.json bun.lock ./
COPY apps/portal/package.json apps/portal/package.json
COPY apps/site/package.json apps/site/package.json
COPY packages/api/package.json packages/api/package.json
RUN bun install --frozen-lockfile
COPY apps/portal apps/portal
COPY packages/api packages/api
COPY apps/server/openapi.yaml apps/server/openapi.yaml
COPY scripts scripts
ENV CLOUDFLARE_SEND_METRICS=false WRANGLER_SEND_METRICS=false

# Cloudflare deploys this bundle. The local emulator is a separate target.
FROM base AS worker-build
RUN bun run --cwd apps/portal build \
    && node scripts/worker-artifacts.mjs --app portal --clean \
    && node scripts/worker-artifacts.mjs --app portal

FROM base AS development
RUN chmod +x apps/portal/bin/docker-entrypoint
EXPOSE 4001
ENTRYPOINT ["/app/apps/portal/bin/docker-entrypoint"]
CMD ["bun", "run", "--cwd", "apps/portal", "dev", "--host", "0.0.0.0"]
