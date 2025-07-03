FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY .npmrc package.json package-lock.json* ./
RUN npm ci --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 peter
RUN adduser --system --uid 1001 peter

COPY --from=builder --chown=peter:peter /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown peter:peter .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=peter:peter /app/.next/standalone ./
COPY --from=builder --chown=peter:peter /app/.next/static ./.next/static

USER peter

# Sets the port on which the Next.js server should be running, which differs for staging and prod.
ARG PORT=4001

EXPOSE $PORT

ENV PORT=$PORT
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
