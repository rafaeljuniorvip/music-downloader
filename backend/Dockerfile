# Backend Dockerfile - Music Downloader
FROM node:20-alpine

# Instala dependencias do sistema (yt-dlp, ffmpeg, python)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && pip3 install --break-system-packages yt-dlp \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Diretorio de trabalho
WORKDIR /app

# Copia package.json primeiro para cache de dependencias
COPY package*.json ./

# Instala dependencias Node.js
RUN npm ci --only=production

# Copia codigo fonte
COPY src ./src

# Cria diretorio de downloads
RUN mkdir -p /app/downloads && chmod 777 /app/downloads

# Variaveis de ambiente
ENV NODE_ENV=production
ENV PORT=8765
ENV YT_DLP_PATH=/usr/bin/yt-dlp
# Configura Node.js como runtime JavaScript para yt-dlp
ENV YT_DLP_JS_RUNTIME=nodejs

# Expoe porta
EXPOSE 8765

# Health check (usa curl que ja esta instalado)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8765/api/health || exit 1

# Comando de inicializacao
CMD ["node", "src/app.js"]
