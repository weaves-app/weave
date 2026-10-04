FROM node:24-bookworm-slim AS prune
WORKDIR /app
COPY package.json package-lock.json ./
RUN node -e 'const {execFileSync}=require("node:child_process"); const npm=require("./package.json").packageManager; const turbo=require("./package-lock.json").packages["node_modules/turbo"].version; if(!/^npm@\d+\.\d+\.\d+$/.test(npm)||!/^\d+\.\d+\.\d+$/.test(turbo))throw Error("Invalid locked tool versions"); execFileSync("npm",["install","--global",npm,"turbo@"+turbo,"--ignore-scripts"],{stdio:"inherit"})'
COPY . .
RUN turbo prune @weave/web --docker
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=prune /app/out/json/ ./
RUN node -e 'const {execFileSync}=require("node:child_process"); const npm=require("./package.json").packageManager; if(!/^npm@\d+\.\d+\.\d+$/.test(npm))throw Error("Invalid packageManager"); execFileSync("npm",["install","--global",npm,"--ignore-scripts"],{stdio:"inherit"})'
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
