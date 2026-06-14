"""
Аутентификация по токену (Bearer Token).

Токены хранятся в памяти (store.tokens). Аутентификация не требуется
для публичных эндпоинтов — только для Owner (административных).
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from . import store


class TokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:]
        user_id = store.tokens.get(token)
        if user_id is None:
            raise AuthenticationFailed("Неверный или просроченный токен")
        user = store.users.get(user_id)
        if user is None:
            raise AuthenticationFailed("Пользователь не найден")
        return (user, token)
