# ---- Stage 1: build client ----
FROM node:22-alpine AS client-builder
WORKDIR /build
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:22-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=client-builder /build/dist ./client/dist
EXPOSE 10000
CMD ["node", "server/index.js"]
