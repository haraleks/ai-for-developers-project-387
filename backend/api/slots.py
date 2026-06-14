"""
Генерация слотов календаря.

Слоты вычисляются (не хранятся) на окно в 14 дней, начиная с текущей даты.
Длительность слота определяется выбранным типом события. Времена расписания
владельца трактуются в таймзоне владельца (IANA), затем конвертируются в UTC.

Слот недоступен, если на его время начала уже есть бронирование —
независимо от типа события.
"""

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

WINDOW_DAYS = 14


def _parse_hhmm(value):
    hours, minutes = value.split(":")
    return time(int(hours), int(minutes))


def generate_slots(event_type, schedule, bookings, owner_timezone="Europe/Moscow"):
    """
    Возвращает список слотов [{"startTime": datetime, "isAvailable": bool}]
    на ближайшие 14 дней, начиная с текущей даты в таймзоне владельца.
    Слоты возвращаются в UTC для хранения и сравнения.
    """
    duration = timedelta(minutes=event_type["durationMinutes"])
    schedule_by_day = {day["dayOfWeek"]: day for day in schedule}
    booked_times = {booking["startTime"] for booking in bookings.values()}

    tz = ZoneInfo(owner_timezone)
    # Сегодняшняя дата в таймзоне владельца
    today_local = datetime.now(tz).date()
    slots = []

    for offset in range(WINDOW_DAYS):
        current_date = today_local + timedelta(days=offset)
        # isoweekday: 1 — понедельник, 7 — воскресенье (совпадает с контрактом)
        day_setting = schedule_by_day.get(current_date.isoweekday())
        if not day_setting or not day_setting["isWorking"]:
            continue

        # Создаём локальное время начала и конца рабочего дня владельца
        slot_start_local = datetime.combine(
            current_date, _parse_hhmm(day_setting["startTime"])
        ).replace(tzinfo=tz)

        day_end_local = datetime.combine(
            current_date, _parse_hhmm(day_setting["endTime"])
        ).replace(tzinfo=tz)

        # Переводим в UTC для генерации слотов и сравнения с бронированиями
        slot_start = slot_start_local.astimezone(timezone.utc)
        day_end = day_end_local.astimezone(timezone.utc)

        while slot_start + duration <= day_end:
            slots.append(
                {
                    "startTime": slot_start,
                    "isAvailable": slot_start not in booked_times,
                }
            )
            slot_start += duration

    return slots
