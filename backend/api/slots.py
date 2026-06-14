"""
Генерация слотов календаря.

Слоты вычисляются (не хранятся) на окно в 14 дней, начиная с текущей даты.
Длительность слота определяется выбранным типом события. Времена расписания
владельца трактуются как UTC.

Слот недоступен, если на его время начала уже есть бронирование —
независимо от типа события.
"""

from datetime import datetime, time, timedelta, timezone

WINDOW_DAYS = 14


def _parse_hhmm(value):
    hours, minutes = value.split(":")
    return time(int(hours), int(minutes))


def generate_slots(event_type, schedule, bookings):
    """
    Возвращает список слотов [{"startTime": datetime, "isAvailable": bool}]
    на ближайшие 14 дней, начиная с текущей даты (UTC).
    """
    duration = timedelta(minutes=event_type["durationMinutes"])
    schedule_by_day = {day["dayOfWeek"]: day for day in schedule}
    booked_times = {booking["startTime"] for booking in bookings.values()}

    today = datetime.now(timezone.utc).date()
    slots = []

    for offset in range(WINDOW_DAYS):
        current_date = today + timedelta(days=offset)
        # isoweekday: 1 — понедельник, 7 — воскресенье (совпадает с контрактом)
        day_setting = schedule_by_day.get(current_date.isoweekday())
        if not day_setting or not day_setting["isWorking"]:
            continue

        slot_start = datetime.combine(
            current_date, _parse_hhmm(day_setting["startTime"]), tzinfo=timezone.utc
        )
        day_end = datetime.combine(
            current_date, _parse_hhmm(day_setting["endTime"]), tzinfo=timezone.utc
        )

        while slot_start + duration <= day_end:
            slots.append(
                {
                    "startTime": slot_start,
                    "isAvailable": slot_start not in booked_times,
                }
            )
            slot_start += duration

    return slots
