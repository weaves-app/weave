FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/design-tokens/package.json packages/design-tokens/package.json
RUN npm ci --ignore-scripts --workspace=@weave/api --include-workspace-root
COPY apps/api apps/api
# Generation/build need a URL shape, never a live database or production secret.
RUN DATABASE_URL=postgresql://build:build@localhost/build npm run build --workspace=@weave/api
RUN npm prune --omit=dev --ignore-scripts --workspace=@weave/api --include-workspace-root
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
