FROM node:24-alpine AS build-stage

WORKDIR /app

# Dependencies first: only a package.json / package-lock.json change reinstalls them.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine-slim AS production-stage

# apk needs root; the base image runs as uid 101 (nginx).
USER root
RUN apk upgrade --no-cache
USER 101

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build-stage /app/dist/spa /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
