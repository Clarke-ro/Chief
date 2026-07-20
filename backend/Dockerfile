# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S chief && adduser -S chief -G chief

COPY --from=build --chown=chief:chief /app/package.json ./
COPY --from=build --chown=chief:chief /app/package-lock.json ./
COPY --from=build --chown=chief:chief /app/node_modules ./node_modules
COPY --from=build --chown=chief:chief /app/dist ./dist
COPY --from=build --chown=chief:chief /app/prisma ./prisma

USER chief
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
