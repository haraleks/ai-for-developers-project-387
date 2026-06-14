"""
Эндпоинты API по контракту main.tsp.

Публичный сценарий гостя (tag Guest): пользователи, календари, типы
событий, слоты, создание брони.
Аутентификация (tag Auth): регистрация и вход.
Административный сценарий владельца (tag Owner): управление своими
календарями, типами событий, расписанием и просмотр бронирований.
"""
from datetime import datetime, timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from . import store
from .auth import TokenAuthentication
from .serializers import (
    AuthResultSerializer,
    BookingCreateSerializer, BookingSerializer,
    CalendarCreateSerializer, CalendarSerializer,
    EventTypeCreateSerializer, EventTypeSerializer,
    UserLoginSerializer, UserRegisterSerializer, UserSerializer,
    ScheduleDaySerializer, SlotSerializer,
)
from .slots import generate_slots


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def _get_user_or_404(user_id):
    user = store.users.get(user_id)
    if user is None:
        raise NotFound("Пользователь не найден")
    return user


def _get_calendar_or_404(calendar_id):
    calendar = store.calendars.get(calendar_id)
    if calendar is None:
        raise NotFound("Календарь не найден")
    return calendar


def _get_event_type_or_404(event_type_id):
    event_type = store.event_types.get(event_type_id)
    if event_type is None:
        raise NotFound("Тип события не найден")
    return event_type


# ─────────────────────────────────────────
# PUBLIC (Guest)
# ─────────────────────────────────────────

class UserListView(APIView):
    """GET /users — список всех пользователей системы."""
    def get(self, request):
        items = sorted(store.users.values(), key=lambda u: u["id"])
        return Response(UserSerializer(items, many=True).data)


class UserCalendarListView(APIView):
    """GET /users/{userId}/calendars — календари пользователя."""
    def get(self, request, userId):
        _get_user_or_404(userId)
        items = sorted(
            (c for c in store.calendars.values() if c["userId"] == userId),
            key=lambda c: c["id"],
        )
        return Response(CalendarSerializer(items, many=True).data)


class CalendarEventTypeListView(APIView):
    """GET /users/{userId}/calendars/{calendarId}/event-types — типы событий календаря."""
    def get(self, request, userId, calendarId):
        _get_user_or_404(userId)
        calendar = _get_calendar_or_404(calendarId)
        if calendar["userId"] != userId:
            raise NotFound("Календарь не найден")
        items = sorted(
            (e for e in store.event_types.values() if e["calendarId"] == calendarId),
            key=lambda e: e["id"],
        )
        return Response(EventTypeSerializer(items, many=True).data)


class CalendarEventTypeDetailView(APIView):
    """GET /users/{userId}/calendars/{calendarId}/event-types/{id} — тип события."""
    def get(self, request, userId, calendarId, id):
        _get_user_or_404(userId)
        calendar = _get_calendar_or_404(calendarId)
        if calendar["userId"] != userId:
            raise NotFound("Календарь не найден")
        event_type = _get_event_type_or_404(id)
        if event_type["calendarId"] != calendarId:
            raise NotFound("Тип события не найден в этом календаре")
        return Response(EventTypeSerializer(event_type).data)


class SlotListView(APIView):
    """GET /users/{userId}/calendars/{calendarId}/event-types/{id}/slots."""
    def get(self, request, userId, calendarId, id):
        _get_user_or_404(userId)
        calendar = _get_calendar_or_404(calendarId)
        if calendar["userId"] != userId:
            raise NotFound("Календарь не найден")
        event_type = _get_event_type_or_404(id)
        if event_type["calendarId"] != calendarId:
            raise NotFound("Тип события не найден в этом календаре")
        schedule = store.schedules.get(calendarId, store.DEFAULT_SCHEDULE)
        calendar_bookings = {
            bid: b for bid, b in store.bookings.items()
            if b["calendarId"] == calendarId
        }
        slots = generate_slots(event_type, schedule, calendar_bookings)
        return Response(SlotSerializer(slots, many=True).data)


class BookingCreateView(APIView):
    """POST /bookings — создать бронирование."""
    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        calendar = _get_calendar_or_404(data["calendarId"])
        event_type = store.event_types.get(data["eventTypeId"])
        if event_type is None:
            raise ValidationError("Тип события не найден")
        if event_type["calendarId"] != data["calendarId"]:
            raise ValidationError("Тип события не принадлежит указанному календарю")
        start_time = data["startTime"].astimezone(timezone.utc)
        with store.lock:
            schedule = store.schedules.get(data["calendarId"], store.DEFAULT_SCHEDULE)
            calendar_bookings = {
                bid: b for bid, b in store.bookings.items()
                if b["calendarId"] == data["calendarId"]
            }
            slots = generate_slots(event_type, schedule, calendar_bookings)
            slot = next((s for s in slots if s["startTime"] == start_time), None)
            if slot is None:
                raise ValidationError(
                    "Время начала не совпадает ни с одним слотом в окне записи (14 дней)"
                )
            if not slot["isAvailable"]:
                return Response(
                    {"code": 409, "message": "Это время уже занято"},
                    status=status.HTTP_409_CONFLICT,
                )
            booking = {
                "id": store.next_booking_id(),
                "calendarId": data["calendarId"],
                "eventTypeId": data["eventTypeId"],
                "startTime": start_time,
                "guestName": data["guestName"],
                "guestEmail": data["guestEmail"],
                "comment": data.get("comment"),
                "createdAt": datetime.now(timezone.utc),
            }
            store.bookings[booking["id"]] = booking
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────

class RegisterView(APIView):
    """POST /auth/register — регистрация нового пользователя."""
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with store.lock:
            for u in store.users.values():
                if u["email"] == data["email"]:
                    return Response(
                        {"code": 409, "message": "Пользователь с таким email уже зарегистрирован"},
                        status=status.HTTP_409_CONFLICT,
                    )
            user = {
                "id": store.next_user_id(),
                "name": data["name"],
                "email": data["email"],
                "password": data["password"],
            }
            store.users[user["id"]] = user
            token = store.generate_token()
            store.tokens[token] = user["id"]
        result = {"user": {"id": user["id"], "name": user["name"], "email": user["email"]}, "token": token}
        return Response(AuthResultSerializer(result).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /auth/login — вход в существующий аккаунт."""
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with store.lock:
            user = next(
                (u for u in store.users.values()
                 if u["email"] == data["email"] and u["password"] == data["password"]),
                None,
            )
            if user is None:
                return Response(
                    {"code": 401, "message": "Неверный email или пароль"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            token = store.generate_token()
            store.tokens[token] = user["id"]
        result = {"user": {"id": user["id"], "name": user["name"], "email": user["email"]}, "token": token}
        return Response(AuthResultSerializer(result).data)


# ─────────────────────────────────────────
# OWNER (Authenticated)
# ─────────────────────────────────────────

class OwnerCalendarListView(APIView):
    """GET /owner/calendars — список календарей текущего пользователя.
    POST /owner/calendars — создать новый календарь."""
    authentication_classes = [TokenAuthentication]

    def get(self, request):
        items = sorted(
            (c for c in store.calendars.values() if c["userId"] == request.user["id"]),
            key=lambda c: c["id"],
        )
        return Response(CalendarSerializer(items, many=True).data)

    def post(self, request):
        serializer = CalendarCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with store.lock:
            calendar = {
                "id": store.next_calendar_id(),
                "userId": request.user["id"],
                **serializer.validated_data,
            }
            store.calendars[calendar["id"]] = calendar
            store.schedules[calendar["id"]] = [dict(d) for d in store.DEFAULT_SCHEDULE]
        return Response(CalendarSerializer(calendar).data, status=status.HTTP_201_CREATED)


class OwnerCalendarDetailView(APIView):
    """GET/PATCH/DELETE /owner/calendars/{id}."""
    authentication_classes = [TokenAuthentication]

    def _get_own_calendar(self, user_id, calendar_id):
        calendar = _get_calendar_or_404(calendar_id)
        if calendar["userId"] != user_id:
            raise NotFound("Календарь не найден")
        return calendar

    def get(self, request, id):
        calendar = self._get_own_calendar(request.user["id"], id)
        return Response(CalendarSerializer(calendar).data)

    def patch(self, request, id):
        calendar = self._get_own_calendar(request.user["id"], id)
        serializer = CalendarCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with store.lock:
            calendar.update(serializer.validated_data)
        return Response(CalendarSerializer(calendar).data)

    def delete(self, request, id):
        self._get_own_calendar(request.user["id"], id)
        with store.lock:
            del store.calendars[id]
            store.schedules.pop(id, None)
            etype_ids = [eid for eid, e in store.event_types.items() if e["calendarId"] == id]
            for eid in etype_ids:
                del store.event_types[eid]
            bid_ids = [bid for bid, b in store.bookings.items() if b["calendarId"] == id]
            for bid in bid_ids:
                del store.bookings[bid]
        return Response(status=status.HTTP_204_NO_CONTENT)


class OwnerEventTypeListView(APIView):
    """GET /owner/calendars/{calendarId}/event-types — список типов событий.
    POST /owner/calendars/{calendarId}/event-types — создать тип события."""
    authentication_classes = [TokenAuthentication]

    def get(self, request, calendarId):
        items = sorted(
            (e for e in store.event_types.values() if e["calendarId"] == calendarId),
            key=lambda e: e["id"],
        )
        return Response(EventTypeSerializer(items, many=True).data)

    def post(self, request, calendarId):
        serializer = EventTypeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with store.lock:
            event_type = {
                "id": store.next_event_type_id(),
                "calendarId": calendarId,
                **serializer.validated_data,
            }
            store.event_types[event_type["id"]] = event_type
        return Response(EventTypeSerializer(event_type).data, status=status.HTTP_201_CREATED)


class OwnerEventTypeDetailView(APIView):
    """PATCH/DELETE /owner/calendars/{calendarId}/event-types/{id}."""
    authentication_classes = [TokenAuthentication]

    def _get_own_event_type(self, calendar_id, event_type_id):
        event_type = _get_event_type_or_404(event_type_id)
        if event_type["calendarId"] != calendar_id:
            raise NotFound("Тип события не найден в этом календаре")
        return event_type

    def patch(self, request, calendarId, id):
        event_type = self._get_own_event_type(calendarId, id)
        serializer = EventTypeCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with store.lock:
            event_type.update(serializer.validated_data)
        return Response(EventTypeSerializer(event_type).data)

    def delete(self, request, calendarId, id):
        self._get_own_event_type(calendarId, id)
        with store.lock:
            del store.event_types[id]
        return Response(status=status.HTTP_204_NO_CONTENT)


class OwnerScheduleView(APIView):
    """GET /owner/calendars/{calendarId}/schedule — расписание.
    PUT /owner/calendars/{calendarId}/schedule — обновить расписание."""
    authentication_classes = [TokenAuthentication]

    def get(self, request, calendarId):
        schedule = store.schedules.get(calendarId, store.DEFAULT_SCHEDULE)
        return Response(ScheduleDaySerializer(schedule, many=True).data)

    def put(self, request, calendarId):
        serializer = ScheduleDaySerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        days = serializer.validated_data
        day_numbers = [d["dayOfWeek"] for d in days]
        if len(day_numbers) != len(set(day_numbers)):
            raise ValidationError("Дни недели в расписании не должны повторяться")
        with store.lock:
            store.schedules[calendarId] = sorted(days, key=lambda d: d["dayOfWeek"])
        return Response(ScheduleDaySerializer(store.schedules[calendarId], many=True).data)


class OwnerBookingListView(APIView):
    """GET /owner/calendars/{calendarId}/bookings — список бронирований."""
    authentication_classes = [TokenAuthentication]

    def get(self, request, calendarId):
        items = sorted(
            (b for b in store.bookings.values() if b["calendarId"] == calendarId),
            key=lambda b: b["id"],
        )
        return Response(BookingSerializer(items, many=True).data)
