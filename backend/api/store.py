"""
Хранилище данных в памяти процесса.

По требованиям шага отдельная база данных не нужна: после перезапуска
сервиса данные сбрасываются. Сервис должен работать одним процессом.

Хранит:
- users       — зарегистрированные пользователи;
- tokens      — карта токен -> идентификатор пользователя;
- calendars   — календари пользователей;
- event_types — типы событий внутри календарей;
- schedules   — расписание доступности для каждого календаря;
- bookings    — бронирования гостей для каждого календаря.
"""
import threading
import uuid

lock = threading.Lock()

users = {}
_user_seq = 0

tokens = {}

calendars = {}
_calendar_seq = 0

event_types = {}
_event_type_seq = 0

schedules = {}

bookings = {}
_booking_seq = 0

DEFAULT_SCHEDULE = [
    {"dayOfWeek": 1, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 2, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 3, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 4, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 5, "isWorking": True, "startTime": "09:00", "endTime": "18:00"},
    {"dayOfWeek": 6, "isWorking": False, "startTime": "10:00", "endTime": "16:00"},
    {"dayOfWeek": 7, "isWorking": False, "startTime": "10:00", "endTime": "16:00"},
]


def next_user_id():
    global _user_seq
    _user_seq += 1
    return _user_seq


def next_calendar_id():
    global _calendar_seq
    _calendar_seq += 1
    return _calendar_seq


def next_event_type_id():
    global _event_type_seq
    _event_type_seq += 1
    return _event_type_seq


def next_booking_id():
    global _booking_seq
    _booking_seq += 1
    return _booking_seq


def generate_token():
    return str(uuid.uuid4())


def reset():
    """Полный сброс хранилища (используется в тестах)."""
    global users, tokens, calendars, event_types, schedules, bookings
    global _user_seq, _calendar_seq, _event_type_seq, _booking_seq
    with lock:
        users = {}
        tokens = {}
        calendars = {}
        event_types = {}
        schedules = {}
        bookings = {}
        _user_seq = 0
        _calendar_seq = 0
        _event_type_seq = 0
        _booking_seq = 0
