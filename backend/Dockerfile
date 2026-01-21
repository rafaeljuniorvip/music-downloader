# Backend Dockerfile - Music Downloader
FROM node:20-alpine

# Instala dependencias do sistema (yt-dlp, ffmpeg, python)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

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
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp

# Expoe porta
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8765/api/health || exit 1

# Comando de inicializacao
CMD ["node", "src/app.js"]
