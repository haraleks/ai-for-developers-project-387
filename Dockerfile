# --- Stage 1: Сборка фронтенда ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

# --- Stage 2: Финальный образ ---
FROM python:3.11-slim
WORKDIR /app

# Установка Nginx
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx && \
    rm -rf /var/lib/apt/lists/*

# Установка зависимостей бэкенда
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Копирование бэкенда
COPY backend/ ./backend/

# Копирование собранного фронтенда в Nginx
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Копирование конфигурации Nginx
COPY nginx.conf /etc/nginx/sites-available/default

# Копирование и настройка скрипта запуска
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/app/entrypoint.sh"]
