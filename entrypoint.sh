#!/bin/sh

# Use the PORT environment variable if set, default to 80
PORT=${PORT:-80}
echo "Настройка Nginx на порт $PORT..."
sed -i "s/listen 80;/listen ${PORT};/g" /etc/nginx/sites-available/default

echo "Запуск Django API бэкенда на 127.0.0.1:8000..."
python /app/backend/manage.py runserver 127.0.0.1:8000 &

echo "Запуск Nginx..."
nginx -g "daemon off;"
