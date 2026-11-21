FROM node:24-bookworm-slim AS node-base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
    && install -d -m 0700 -o node -g node /run/planner

FROM node-base AS backend-build
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci && npm run db:generate
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

FROM backend-build AS setup
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*
COPY deploy/database-access.sql deploy/setup-db.sh ./
USER node
CMD ["sh", "setup-db.sh"]

FROM node-base AS api
COPY backend/package*.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["sh", "-ec", "export DATABASE_URL=\"postgresql://planner_app:$(cat /run/planner/db-password)@db:5432/doomsday_ready?schema=public\"; exec node dist/main.js"]

FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:stable-alpine AS web
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend-build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
