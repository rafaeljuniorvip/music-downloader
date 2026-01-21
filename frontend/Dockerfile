# Frontend Dockerfile - Music Downloader
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia package.json primeiro para cache
COPY package*.json ./

# Instala dependencias
RUN npm ci

# Copia codigo fonte
COPY . .

# Build de producao
RUN npm run build

# Stage 2: Nginx para servir arquivos estaticos
FROM nginx:alpine

# Instala curl para healthcheck
RUN apk add --no-cache curl

# Remove configuracao padrao
RUN rm /etc/nginx/conf.d/default.conf

# Copia configuracao customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Expoe porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Comando padrao do nginx
CMD ["nginx", "-g", "daemon off;"]
