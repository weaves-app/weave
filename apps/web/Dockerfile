FROM node:24-bookworm-slim AS prune
WORKDIR /app
RUN npm install --global npm@11.19.0 turbo@2.11.7 --ignore-scripts
COPY . .
RUN turbo prune @weave/web --docker
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@11.19.0 --ignore-scripts
COPY --from=prune /app/out/json/ ./
RUN npm ci --ignore-scripts
COPY --from=prune /app/out/full/ ./
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
