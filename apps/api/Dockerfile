FROM node:24-bookworm-slim AS prune
WORKDIR /app
COPY package.json package-lock.json ./
RUN node -e 'const {execFileSync}=require("node:child_process"); const npm=require("./package.json").packageManager; const turbo=require("./package-lock.json").packages["node_modules/turbo"].version; if(!/^npm@\d+\.\d+\.\d+$/.test(npm)||!/^\d+\.\d+\.\d+$/.test(turbo))throw Error("Invalid locked tool versions"); execFileSync("npm",["install","--global",npm,"turbo@"+turbo,"--ignore-scripts"],{stdio:"inherit"})'
COPY . .
RUN turbo prune @weave/api --docker
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=prune /app/out/json/ ./
RUN node -e 'const {execFileSync}=require("node:child_process"); const npm=require("./package.json").packageManager; if(!/^npm@\d+\.\d+\.\d+$/.test(npm))throw Error("Invalid packageManager"); execFileSync("npm",["install","--global",npm,"--ignore-scripts"],{stdio:"inherit"})'
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
