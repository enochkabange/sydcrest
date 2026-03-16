FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM base AS runner
ENV NODE_ENV=production
# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S sydcrest -u 1001
COPY --from=deps --chown=sydcrest:nodejs /app/node_modules ./node_modules
COPY --chown=sydcrest:nodejs backend/src ./src
USER sydcrest
EXPOSE 5000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1
