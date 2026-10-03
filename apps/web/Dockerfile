FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/design-tokens/package.json packages/design-tokens/package.json
RUN npm ci --ignore-scripts --workspace=@weave/web --include-workspace-root
COPY apps/web apps/web
COPY packages/design-tokens packages/design-tokens
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@weave/web
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
