FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

ENV NODE_ENV=production
EXPOSE 3000

# Dokploy (Swarm) only routes to a new container once this passes, so a broken deploy
# never replaces a working one. /health only checks that the process answers: a short
# database outage must not make Swarm restart every API container. start-period covers migrations.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1

CMD ["sh", "-c", "bun scripts/migrate.ts && exec bun dist/index.js"]