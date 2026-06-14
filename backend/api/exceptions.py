"""
Приведение всех ошибок API к модели Error из контракта: {code, message}.
"""

from rest_framework.views import exception_handler as drf_exception_handler


def _flatten_messages(detail):
    """Собирает человекочитаемое сообщение из деталей ошибки DRF."""
    if isinstance(detail, dict):
        parts = []
        for key, value in detail.items():
            message = _flatten_messages(value)
            parts.append(f"{key}: {message}" if key != "non_field_errors" else message)
        return "; ".join(parts)
    if isinstance(detail, list):
        return "; ".join(_flatten_messages(item) for item in detail)
    return str(detail)


def api_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    response.data = {
        "code": response.status_code,
        "message": _flatten_messages(getattr(exc, "detail", str(exc))),
    }
    return response
