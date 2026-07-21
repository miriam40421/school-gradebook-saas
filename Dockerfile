FROM node:22-slim

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

RUN npm install -g pnpm@11.1.3

WORKDIR /app

# Copy all source first (postinstall builds packages — needs source present)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json pnpm.yaml pnpm.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile

# Generate Prisma client first (must be before API build — types needed at compile time)
RUN pnpm --filter @school/api prisma:generate

# Build shared packages then API
RUN pnpm --filter @school/shared build
RUN pnpm --filter @school/certificate-layout build
RUN pnpm --filter @school/api build

EXPOSE 3001

# On startup: run DB migrations then start server
CMD ["sh", "-c", "cd apps/api && pnpm prisma migrate deploy && pnpm db:seed && node dist/main"]
