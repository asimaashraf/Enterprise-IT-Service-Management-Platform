FROM node:22-alpine AS build

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src
COPY server/scripts ./scripts
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node

EXPOSE 5000

CMD ["node", "dist/src/server.js"]
