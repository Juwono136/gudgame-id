# Gud Game production image — Next.js standalone on Alpine.
# Runtime networking: joins Docker network `tunnel` (see docker-compose.yml).
# Speaks to postgres (PG 18) / redis / storage_gateway by Docker DNS service names.
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# `.dockerignore` excludes `.env*`. Placeholders only for module resolution during `next build`.
# Pages are force-dynamic — build does not connect to Postgres. Runtime env comes from compose / CI secrets.
ARG DATABASE_URL=postgresql://docker-build:docker-build@127.0.0.1:5432/docker_build
ENV DATABASE_URL=${DATABASE_URL}
ARG REDIS_URL=redis://127.0.0.1:6379
ENV REDIS_URL=${REDIS_URL}

# Bake public URLs + Firebase client config into the bundle.
ARG NEXT_PUBLIC_APP_URL=https://gudgame.id
ARG NEXT_PUBLIC_SITE_URL=https://gudgame.id
ARG NEXT_PUBLIC_STORAGE_URL=https://storage.gudgame.id
ARG NEXT_PUBLIC_FIREBASE_API_KEY=
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
ARG NEXT_PUBLIC_FIREBASE_APP_ID=
ARG BETTER_AUTH_URL=https://gudgame.id
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_STORAGE_URL=${NEXT_PUBLIC_STORAGE_URL}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}

ENV NODE_OPTIONS=--max-old-space-size=4096
# Runtime secrets are injected at deploy — placeholders for `next build` module init only.
ENV SKIP_ENV_VALIDATION=true
ENV BETTER_AUTH_SECRET=docker-build-placeholder-auth-secret-32chars!
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}

RUN npm run build

# Migration-only image: full source + ALL deps (drizzle-kit, tsx).
# Always npm ci without omitting devDependencies — required for CI migrate/seed.
FROM base AS migrator
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# Force full install even if build host exports NODE_ENV=production
RUN npm ci --include=dev
COPY . .
ENV NODE_ENV=development
ENV DB_SCRIPT_MODE=true
CMD ["npm", "run", "db:migrate:prod"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat curl \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD curl -fsS -H "X-Health-Token: ${HEALTH_CHECK_TOKEN}" http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
