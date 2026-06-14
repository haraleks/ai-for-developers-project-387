"""
Настройки Django для Calendar Booking Service.

Учебный проект: без базы данных (хранилище в памяти процесса),
без аутентификации. Запускать одним процессом: python manage.py runserver.
"""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-calendar-booking-service-dev-key"

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

# Отдельная база данных не используется: хранилище в памяти (api/store.py)
DATABASES = {}

LANGUAGE_CODE = "ru-ru"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    "EXCEPTION_HANDLER": "api.exceptions.api_exception_handler",
}

# CORS: API предназначен для отдельного фронтенд-клиента (Vite dev-сервер)
CORS_ALLOW_ALL_ORIGINS = True
