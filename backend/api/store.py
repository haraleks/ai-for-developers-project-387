"""
Хранилище данных в памяти процесса.

По требованиям шага отдельная база данных не нужна: после перезапуска
сервиса данные сбрасываются. Сервис должен работать одним процессом.

Хранит:
- owner     — один заранее заданный владелец (регистрации и авторизации нет);
- event_types — типы событий, создаваемые владельцем;
- bookings  — бронирования гостей;
- schedule  — настройки доступности по дням недели (1 — понедельник, 7 — воскресенье).
"""

import threading

# Блокировка для атомарных операций (проверка конфликта + запись брони)
lock = threading.Lock()

# Один заранее заданный владелец календаря
OWNER = {
    "id": 1,
    "name": "Владелец календаря",
    "email": "owner@example.com",
    "timezone": "Europe/Moscow",
}

# Типы событий: {id: {"id", "name", "description", "durationMinutes"}}
event_types = {}
_event_type_seq = 0

# Бронирования: {id: {"id", "eventTypeId", "startTime", "guestName",
#                     "guestEmail", "comment", "createdAt"}}
# startTime и createdAt хранятся как datetime (UTC).
bookings = {}
_booking_seq = 0

# Расписание по умолчанию: пн–пт рабочие 09:00–18:00, сб–вс нерабочие
DEFAULT_SCHEDULE = [
    {"dayOfWeek": 1, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 2, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 3, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 4, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 5, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 6, "isWorking": False, "startTime": "10:00", "endTime": "16:00"},
    {"dayOfWeek": 7, "isWorking": False, "startTime": "10:00", "endTime": "16:00"},
]

schedule = [dict(day) for day in DEFAULT_SCHEDULE]


def next_event_type_id():
    global _event_type_seq
    _event_type_seq += 1
    return _event_type_seq


def next_booking_id():
    global _booking_seq
    _booking_seq += 1
    return _booking_seq


def reset():
    """Полный сброс хранилища (используется в тестах)."""
    global event_types, bookings, schedule, _event_type_seq, _booking_seq
    with lock:
        event_types = {}
        bookings = {}
        OWNER["timezone"] = "Europe/Moscow"
        schedule = [dict(day) for day in DEFAULT_SCHEDULE]
        _event_type_seq = 0
        _booking_seq = 0
