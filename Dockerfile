# LegitAfrica Studio — runs at studio.legitafrica.com behind Caddy.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
# ffmpeg: /api/convert-to-mp4 shells out to it for the social-media MP4 export.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
# The server bundle is built with --packages=external, so it needs node_modules at runtime.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Scene video clips live here, on a Docker volume. Created before USER node so the volume is
# initialised owned by the runtime user; otherwise it arrives owned by root and uploads fail.
RUN mkdir -p /data/media && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
