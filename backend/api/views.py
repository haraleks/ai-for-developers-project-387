"""
Эндпоинты API по контракту main.tsp.

Публичный сценарий гостя (tag Guest): типы событий, слоты, создание брони.
Административный сценарий владельца (tag Owner): типы событий, расписание,
список бронирований. Авторизации нет — один заранее заданный владелец.
"""

from datetime import datetime, timezone

from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import store
from .serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    EventTypeCreateSerializer,
    EventTypeSerializer,
    OwnerSerializer,
    ScheduleDaySerializer,
    ScheduleRequestSerializer,
    ScheduleResponseSerializer,
    SlotSerializer,
)
from .slots import generate_slots


def _get_event_type_or_404(event_type_id):
    event_type = store.event_types.get(event_type_id)
    if event_type is None:
        raise NotFound("Тип события не найден")
    return event_type


class EventTypeListView(APIView):
    """GET /event-types — список типов событий.
    POST /event-types — создать новый тип события (владелец)."""

    def get(self, request):
        items = sorted(store.event_types.values(), key=lambda item: item["id"])
        return Response(EventTypeSerializer(items, many=True).data)

    def post(self, request):
        serializer = EventTypeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with store.lock:
            event_type = {"id": store.next_event_type_id(), **serializer.validated_data}
            store.event_types[event_type["id"]] = event_type

        return Response(
            EventTypeSerializer(event_type).data, status=status.HTTP_201_CREATED
        )


class EventTypeDetailView(APIView):
    """GET /event-types/{id} — тип события по идентификатору.
    PATCH /event-types/{id} — изменить тип события (владелец).
    DELETE /event-types/{id} — удалить тип события (владелец)."""

    def get(self, request, id):
        event_type = _get_event_type_or_404(id)
        return Response(EventTypeSerializer(event_type).data)

    def patch(self, request, id):
        event_type = _get_event_type_or_404(id)
        serializer = EventTypeCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with store.lock:
            event_type.update(serializer.validated_data)

        return Response(EventTypeSerializer(event_type).data)

    def delete(self, request, id):
        _get_event_type_or_404(id)
        with store.lock:
            del store.event_types[id]
        return Response(status=status.HTTP_204_NO_CONTENT)


class SlotListView(APIView):
    """GET /event-types/{id}/slots — слоты на ближайшие 30 дней,
    начиная с текущей даты. Слот занят, если на его время уже есть
    бронирование любого типа события."""

    def get(self, request, id):
        event_type = _get_event_type_or_404(id)
        slots = generate_slots(event_type, store.schedule, store.bookings, store.OWNER["timezone"])
        return Response(SlotSerializer(slots, many=True).data)


class BookingCreateView(APIView):
    """POST /bookings — создать бронирование на выбранный свободный слот.

    Бизнес-правила:
    - время должно совпадать со слотом в окне записи (30 дней) — иначе 400;
    - на одно и то же время нельзя создать две записи, даже если это
      разные типы событий — при конфликте возвращается 409.
    """

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        event_type = store.event_types.get(data["eventTypeId"])
        if event_type is None:
            raise ValidationError("Тип события не найден")

        start_time = data["startTime"].astimezone(timezone.utc)

        # Проверка конфликта и запись атомарны
        with store.lock:
            slots = generate_slots(event_type, store.schedule, store.bookings)
            slot = next((s for s in slots if s["startTime"] == start_time), None)
            if slot is None:
                raise ValidationError(
                    "Время начала не совпадает ни с одним слотом в окне записи (30 дней)"
                )
            if not slot["isAvailable"]:
                return Response(
                    {"code": 409, "message": "Это время уже занято"},
                    status=status.HTTP_409_CONFLICT,
                )

            booking = {
                "id": store.next_booking_id(),
                "eventTypeId": data["eventTypeId"],
                "startTime": start_time,
                "guestName": data["guestName"],
                "guestEmail": data["guestEmail"],
                "comment": data.get("comment"),
                "createdAt": datetime.now(timezone.utc),
            }
            store.bookings[booking["id"]] = booking

        return Response(
            BookingSerializer(booking).data, status=status.HTTP_201_CREATED
        )


class OwnerScheduleView(APIView):
    """GET /owner/schedule — текущие настройки доступности владельца (включая таймзону).
    PUT /owner/schedule — обновить настройки доступности (включая таймзону)."""

    def get(self, request):
        data = {"timezone": store.OWNER["timezone"], "schedule": store.schedule}
        return Response(ScheduleResponseSerializer(data).data)

    def put(self, request):
        serializer = ScheduleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        day_numbers = [day["dayOfWeek"] for day in data["schedule"]]
        if len(day_numbers) != len(set(day_numbers)):
            raise ValidationError("Дни недели в расписании не должны повторяться")

        with store.lock:
            store.OWNER["timezone"] = data["timezone"]
            store.schedule = sorted(data["schedule"], key=lambda day: day["dayOfWeek"])

        response_data = {"timezone": store.OWNER["timezone"], "schedule": store.schedule}
        return Response(ScheduleResponseSerializer(response_data).data)


class OwnerView(APIView):
    """GET /owner — информация о владельце (включая таймзону)."""

    def get(self, request):
        return Response(OwnerSerializer(store.OWNER).data)


class OwnerBookingListView(APIView):
    """GET /owner/bookings — список всех бронирований для владельца."""

    def get(self, request):
        items = sorted(store.bookings.values(), key=lambda item: item["id"])
        return Response(BookingSerializer(items, many=True).data)
