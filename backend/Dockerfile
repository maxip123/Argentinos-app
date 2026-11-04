# Etapa 1: instala solo las dependencias de producción
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
# Respeta el package-lock, pero deja afuera Prisma: la API no lo usa y pesa cientos de MB
RUN npm uninstall @prisma/client prisma --omit=dev --ignore-scripts

# Etapa 2: imagen final, sin npm cache ni archivos de la etapa anterior
FROM node:22-alpine
# dumb-init reenvía SIGTERM a Node para que `docker stop` no tarde 10 segundos
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=dependencias /app/node_modules ./node_modules
COPY package.json index.js ./
COPY config ./config
COPY controllers ./controllers
COPY middlewares ./middlewares
COPY routes ./routes
COPY utils ./utils

USER node
EXPOSE 4000

# /api/health también prueba la conexión con la base
HEALTHCHECK --interval=30s --timeout=15s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
