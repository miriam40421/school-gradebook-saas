FROM node:20-slim

# Install system Chromium (for Playwright PDF generation) + dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto \
    fonts-noto-cjk \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Playwright to use system Chromium instead of downloading its own
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config first (for layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json pnpm.yaml pnpm.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/certificate-layout/package.json ./packages/certificate-layout/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build shared packages then API
RUN pnpm --filter @school/shared build
RUN pnpm --filter @school/certificate-layout build
RUN pnpm --filter @school/api build
RUN pnpm --filter @school/api prisma:generate

EXPOSE 3001

# On startup: run DB migrations then start server
CMD ["sh", "-c", "cd apps/api && pnpm prisma migrate deploy && node dist/main"]
