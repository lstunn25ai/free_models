# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --ignore-scripts

COPY client/ client/
COPY server/ server/
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma /app/prisma
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/server/prisma && chown -R appuser:appgroup /app
USER appuser
WORKDIR /app/server
EXPOSE 3000
CMD ["sh", "-c", "../node_modules/.bin/prisma db push --schema=/app/prisma/schema.prisma && node dist/index.js"]
