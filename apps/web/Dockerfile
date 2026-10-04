FROM node:24-bookworm-slim AS prune
WORKDIR /app
COPY . .
RUN node -e 'const {execFileSync}=require("node:child_process"); const pm=require("./package.json").packageManager; if(!/^pnpm@\d+\.\d+\.\d+$/.test(pm))throw Error("Invalid packageManager"); execFileSync("npm",["install","--global",pm,"--ignore-scripts"],{stdio:"inherit"})'
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm exec turbo prune @weave/web --docker
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=prune /app/out/json/ ./
RUN node -e 'const {execFileSync}=require("node:child_process"); const pm=require("./package.json").packageManager; if(!/^pnpm@\d+\.\d+\.\d+$/.test(pm))throw Error("Invalid packageManager"); execFileSync("npm",["install","--global",pm,"--ignore-scripts"],{stdio:"inherit"})'
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=prune /app/out/full/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @weave/web run build
FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
