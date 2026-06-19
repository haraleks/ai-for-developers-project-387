"""
Сериализаторы по моделям контракта main.tsp.
"""
import re
from rest_framework import serializers

HHMM_PATTERN = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    email = serializers.EmailField()


class UserRegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(min_length=4)


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class AuthResultSerializer(serializers.Serializer):
    user = UserSerializer()
    token = serializers.CharField()


class CalendarSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    userId = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)


class CalendarCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)


class EventTypeCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    durationMinutes = serializers.IntegerField(min_value=1)


class EventTypeSerializer(EventTypeCreateSerializer):
    id = serializers.IntegerField(read_only=True)
    calendarId = serializers.IntegerField(read_only=True)


class SlotSerializer(serializers.Serializer):
    startTime = serializers.DateTimeField()
    isAvailable = serializers.BooleanField()


class BookingCreateSerializer(serializers.Serializer):
    calendarId = serializers.IntegerField()
    eventTypeId = serializers.IntegerField()
    startTime = serializers.DateTimeField()
    guestName = serializers.CharField()
    guestEmail = serializers.EmailField()
    comment = serializers.CharField(required=False, allow_blank=True)


class BookingSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    calendarId = serializers.IntegerField()
    eventTypeId = serializers.IntegerField()
    startTime = serializers.DateTimeField()
    guestName = serializers.CharField()
    guestEmail = serializers.EmailField()
    comment = serializers.CharField(required=False, allow_null=True)
    createdAt = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.get("comment") is None:
            data.pop("comment", None)
        return data


class ScheduleDaySerializer(serializers.Serializer):
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
