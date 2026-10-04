FROM node:24-bookworm-slim AS prune
WORKDIR /app
COPY . .
RUN node -e 'const {execFileSync}=require("node:child_process"); const pm=require("./package.json").packageManager; if(!/^pnpm@\d+\.\d+\.\d+$/.test(pm))throw Error("Invalid packageManager"); execFileSync("npm",["install","--global",pm,"--ignore-scripts"],{stdio:"inherit"})'
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm exec turbo prune @weave/api --docker
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=prune /app/out/json/ ./
RUN node -e 'const {execFileSync}=require("node:child_process"); const pm=require("./package.json").packageManager; if(!/^pnpm@\d+\.\d+\.\d+$/.test(pm))throw Error("Invalid packageManager"); execFileSync("npm",["install","--global",pm,"--ignore-scripts"],{stdio:"inherit"})'
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ ./
RUN DATABASE_URL=postgresql://build:build@localhost/build pnpm --filter @weave/api run build
# Reinstall the pruned workspace for runtime without development dependencies.
RUN rm -rf node_modules apps/api/node_modules packages/*/node_modules && pnpm install --prod --frozen-lockfile --ignore-scripts
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
