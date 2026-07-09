FROM oven/bun:1.3.14-slim AS base

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY packages/opencode/package.json ./packages/opencode/
COPY packages/core/package.json ./packages/core/
COPY packages/server/package.json ./packages/server/
COPY packages/protocol/package.json ./packages/protocol/
COPY packages/schema/package.json ./packages/schema/
COPY packages/llm/package.json ./packages/llm/
COPY packages/plugin/package.json ./packages/plugin/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/codemode/package.json ./packages/codemode/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN cd packages/opencode && bun run build

# Production stage
FROM oven/bun:1.3.14-slim AS production

WORKDIR /app

COPY --from=base /app /app

EXPOSE 8080

CMD ["bun", "run", "--conditions=browser", "./packages/opencode/src/index.ts", "web", "--hostname", "0.0.0.0", "--port", "8080"]
