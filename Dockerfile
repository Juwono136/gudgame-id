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

# `.dockerignore` excludes `.env*`, so set placeholders for `next build` only.
# The running container receives real values from docker-compose / GitHub Secrets.
ARG DATABASE_URL=postgresql://docker-build:docker-build@127.0.0.1:5432/docker_build
ENV DATABASE_URL=${DATABASE_URL}
ARG REDIS_URL=redis://127.0.0.1:6379
ENV REDIS_URL=${REDIS_URL}
ARG BETTER_AUTH_SECRET=docker-build-placeholder-min-32-chars-long
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ARG BETTER_AUTH_URL=https://tandingbase.portproject.my.id
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ARG HEALTH_CHECK_TOKEN=docker-build-health-token-16
ENV HEALTH_CHECK_TOKEN=${HEALTH_CHECK_TOKEN}
ARG XENDIT_STAGING_MODE=true
ENV XENDIT_STAGING_MODE=${XENDIT_STAGING_MODE}
ARG XENDIT_SECRET_KEY=xnd_development_docker_build_placeholder_key
ENV XENDIT_SECRET_KEY=${XENDIT_SECRET_KEY}
ARG XENDIT_WEBHOOK_TOKEN=docker-build-webhook-token-16
ENV XENDIT_WEBHOOK_TOKEN=${XENDIT_WEBHOOK_TOKEN}
ENV XENDIT_XENPLATFORM_ENABLED=true
ENV SMTP_USER=build@local
ENV SMTP_PASS=build
ENV USERNAME_STORAGE=build
ENV PASSWORD_STORAGE=build
ENV STORAGE_ALLOW_LOCALHOST=true
ENV STORAGE_ENDPOINT=http://127.0.0.1:8333

# Bake public URLs + Firebase client config into the bundle.
ARG NEXT_PUBLIC_APP_URL=https://tandingbase.portproject.my.id
ARG NEXT_PUBLIC_SITE_URL=https://tandingbase.portproject.my.id
ARG NEXT_PUBLIC_STORAGE_URL=
ARG NEXT_PUBLIC_FIREBASE_API_KEY=
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
ARG NEXT_PUBLIC_FIREBASE_APP_ID=
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

RUN npm run build

# Migration-only image: full source + dev deps (drizzle-kit). Not used at runtime.
FROM deps AS migrator
WORKDIR /app
COPY . .
ENV NODE_ENV=development
CMD ["npx", "drizzle-kit", "migrate", "--config", "drizzle.config.ts"]

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
