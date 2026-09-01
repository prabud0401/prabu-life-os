FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/mcp/package.json packages/mcp/
COPY config ./config

RUN npm ci

COPY packages ./packages
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV MCP_MODE=http
ENV PORT=3000

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/mcp/package.json packages/mcp/
COPY config ./config

RUN npm ci --omit=dev

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/mcp/dist packages/mcp/dist

EXPOSE 3000
CMD ["node", "packages/mcp/dist/index.js"]
