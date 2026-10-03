FROM node:24-bookworm-slim AS prune
WORKDIR /app
RUN npm install --global npm@11.19.0 turbo@2.11.7 --ignore-scripts
COPY . .
RUN turbo prune @weave/api --docker
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@11.19.0 --ignore-scripts
COPY --from=prune /app/out/json/ ./
RUN npm ci --ignore-scripts
COPY --from=prune /app/out/full/ ./
RUN DATABASE_URL=postgresql://build:build@localhost/build npm run build --workspace=@weave/api
RUN npm prune --omit=dev --ignore-scripts
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
