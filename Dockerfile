# syntax=docker/dockerfile:1
# Finance Tracker — image de production.
# better-sqlite3 est un module natif : il est compilé dans l'étage `builder`
# puis recopié tel quel. La base vit dans le volume /data, jamais dans l'image.

FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Outils de compilation pour better-sqlite3 (absents de l'image slim).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Prisma lit DATABASE_URL depuis prisma.config.ts, y compris pendant `generate`
# (postinstall). Valeur factice au build : la vraie arrive par docker-compose.
ENV DATABASE_URL="file:/data/finance.db"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3010 \
    DATABASE_URL="file:/data/finance.db"

# On garde node_modules complet : le CLI prisma et tsx servent aux migrations
# et au seed lancés par l'entrypoint.
COPY --from=builder --chown=node:node /app /app
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/data"]
EXPOSE 3010
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3010/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start", "-p", "3010"]
