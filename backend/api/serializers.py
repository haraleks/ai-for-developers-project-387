"""
Сериализаторы по моделям контракта main.tsp.
"""

import re

from rest_framework import serializers

HHMM_PATTERN = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")


class EventTypeCreateSerializer(serializers.Serializer):
    """Данные для создания/изменения типа события (EventTypeCreate)."""

    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    durationMinutes = serializers.IntegerField(min_value=1)


class EventTypeSerializer(EventTypeCreateSerializer):
    """Тип события (EventType)."""

    id = serializers.IntegerField()


class SlotSerializer(serializers.Serializer):
    """Слот календаря (Slot)."""

    startTime = serializers.DateTimeField()
    isAvailable = serializers.BooleanField()


class BookingCreateSerializer(serializers.Serializer):
    """Данные для создания бронирования гостем (BookingCreate)."""

    eventTypeId = serializers.IntegerField()
    startTime = serializers.DateTimeField()
    guestName = serializers.CharField()
    guestEmail = serializers.EmailField()
    comment = serializers.CharField(required=False, allow_blank=True)


class BookingSerializer(serializers.Serializer):
    """Бронирование (Booking)."""

    id = serializers.IntegerField()
    eventTypeId = serializers.IntegerField()
    startTime = serializers.DateTimeField()
    guestName = serializers.CharField()
    guestEmail = serializers.EmailField()
    comment = serializers.CharField(required=False)
    createdAt = serializers.DateTimeField()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # comment — необязательное поле контракта: не отдаём null
        if instance.get("comment") is None:
            data.pop("comment", None)
        return data


class OwnerSerializer(serializers.Serializer):
    """Владелец календаря (Owner)."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    email = serializers.EmailField()
    timezone = serializers.CharField()


class ScheduleDaySerializer(serializers.Serializer):
    """Настройки доступности дня недели (ScheduleDay)."""

    dayOfWeek = serializers.IntegerField(min_value=1, max_value=7)
    isWorking = serializers.BooleanField()
    startTime = serializers.RegexField(HHMM_PATTERN)
    endTime = serializers.RegexField(HHMM_PATTERN)

    def validate(self, attrs):
        if attrs["isWorking"] and attrs["startTime"] >= attrs["endTime"]:
            raise serializers.ValidationError(
                "Время начала рабочего дня должно быть раньше времени окончания"
            )
        return attrs


class ScheduleRequestSerializer(serializers.Serializer):
    """Запрос на обновление расписания владельца (ScheduleRequest)."""

    timezone = serializers.CharField()
    schedule = ScheduleDaySerializer(many=True)


class ScheduleResponseSerializer(serializers.Serializer):
    """Ответ с расписанием владельца (ScheduleResponse)."""

    timezone = serializers.CharField()
    schedule = ScheduleDaySerializer(many=True)
