import "@typespec/http";

using Http;

@service(#{ title: "Calendar Booking Service" })
namespace CalendarService;

/**
 * Пользователь системы.
 * Каждый пользователь может иметь несколько календарей с разными
 * типами событий и собственным расписанием.
 */
model User {
  id: int32;
  name: string;
  @format("email")
  email: string;
}

/**
 * Данные для регистрации нового пользователя.
 */
model UserRegister {
  name: string;
  @format("email")
  email: string;
  password: string;
}

/**
 * Данные для входа в систему.
 */
model UserLogin {
  @format("email")
  email: string;
  password: string;
}

/**
 * Результат аутентификации: пользователь и токен.
 */
model AuthResult {
  user: User;
  token: string;
}

/**
 * Календарь пользователя.
 * Группирует типы событий и имеет собственное расписание доступности.
 */
model Calendar {
  id: int32;
  userId: int32;
  name: string;
  description: string;
}

/**
 * Данные для создания или обновления календаря.
 */
model CalendarCreate {
  name: string;
  description: string;
}

/**
 * Тип события, принадлежащий календарю пользователя.
 */
model EventType {
  id: int32;
  calendarId: int32;
  name: string;
  description: string;
  @minValue(1)
  durationMinutes: int32;
}

/**
 * Данные для создания или обновления типа события.
 */
model EventTypeCreate {
  name: string;
  description: string;
  @minValue(1)
  durationMinutes: int32;
}

/**
 * Слот календаря (вычисляемый, не хранится отдельно).
 * Слоты формируются на 14 дней, начиная с текущей даты.
 * Длительность слота определяется выбранным типом события.
 */
model Slot {
  startTime: utcDateTime;
  isAvailable: boolean;
}

/**
 * Бронирование, созданное гостем на свободный слот.
 */
model Booking {
  id: int32;
  calendarId: int32;
  eventTypeId: int32;
  startTime: utcDateTime;
  guestName: string;
  @format("email")
  guestEmail: string;
  comment?: string;
  createdAt: utcDateTime;
}

/**
 * Данные для создания бронирования гостем.
 */
model BookingCreate {
  calendarId: int32;
  eventTypeId: int32;
  startTime: utcDateTime;
  guestName: string;
  @format("email")
  guestEmail: string;
  comment?: string;
}

/** Ошибка API */
@error
model Error {
  code: int32;
  message: string;
}

/**
 * Настройки доступности дня недели для календаря пользователя.
 */
model ScheduleDay {
  @minValue(1)
  @maxValue(7)
  dayOfWeek: int32;
  isWorking: boolean;
  @pattern("^([01][0-9]|2[0-3]):[0-5][0-9]$")
  startTime: string;
  @pattern("^([01][0-9]|2[0-3]):[0-5][0-9]$")
  endTime: string;
}

/**
 * Публичный сценарий гостя:
 * 1. Выбирает пользователя (владельца календаря).
 * 2. Смотрит его календари и типы событий.
 * 3. Выбирает тип события, видит слоты на 14 дней.
 * 4. Создаёт бронирование.
 */
@tag("Guest")
interface Public {
  /** Список всех пользователей системы */
  @route("/users")
  @get
  listUsers(): User[];

  /** Календари указанного пользователя */
  @route("/users/{userId}/calendars")
  @get
  listUserCalendars(@path userId: int32): Calendar[] | Error;

  /** Типы событий календаря пользователя */
  @route("/users/{userId}/calendars/{calendarId}/event-types")
  @get
  listCalendarEventTypes(
    @path userId: int32,
    @path calendarId: int32,
  ): EventType[] | Error;

  /** Тип события по идентификатору */
  @route("/users/{userId}/calendars/{calendarId}/event-types/{id}")
  @get
  getCalendarEventType(
    @path userId: int32,
    @path calendarId: int32,
    @path id: int32,
  ): EventType | Error;

  /**
   * Слоты для типа события на ближайшие 14 дней.
   */
  @route("/users/{userId}/calendars/{calendarId}/event-types/{id}/slots")
  @get
  listSlots(
    @path userId: int32,
    @path calendarId: int32,
    @path id: int32,
  ): Slot[] | Error;

  /**
   * Создать бронирование на выбранный свободный слот.
   * На одно и то же время в одном календаре нельзя создать две записи.
   */
  @route("/bookings")
  @post
  createBooking(@body booking: BookingCreate): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | {
    @statusCode statusCode: 409;
    @body body: Error;
  } | Error;
}

/**
 * Регистрация и вход в систему.
 */
@tag("Auth")
interface Auth {
  /** Регистрация нового пользователя */
  @route("/auth/register")
  @post
  register(@body data: UserRegister): AuthResult | Error;

  /** Вход в существующий аккаунт */
  @route("/auth/login")
  @post
  login(@body data: UserLogin): AuthResult | Error;
}

/**
 * Административный сценарий владельца (требуется токен):
 * 1. Управление календарями (создание, изменение, удаление).
 * 2. Настройка типов событий в каждом календаре.
 * 3. Настройка расписания для каждого календаря.
 * 4. Просмотр бронирований для каждого календаря.
 */
@tag("Owner")
interface Private {
  /** Список календарей текущего пользователя */
  @route("/owner/calendars")
  @get
  listCalendars(): Calendar[] | Error;

  /** Создать новый календарь */
  @route("/owner/calendars")
  @post
  createCalendar(@body data: CalendarCreate): {
    @statusCode statusCode: 201;
    @body body: Calendar;
  } | Error;

  /** Получить календарь по идентификатору */
  @route("/owner/calendars/{id}")
  @get
  getCalendar(@path id: int32): Calendar | Error;

  /** Обновить календарь */
  @route("/owner/calendars/{id}")
  @patch
  updateCalendar(@path id: int32, @body data: CalendarCreate): Calendar | Error;

  /** Удалить календарь */
  @route("/owner/calendars/{id}")
  @delete
  deleteCalendar(@path id: int32): {
    @statusCode statusCode: 204;
  } | Error;

  /** Типы событий календаря */
  @route("/owner/calendars/{calendarId}/event-types")
  @get
  listEventTypes(@path calendarId: int32): EventType[] | Error;

  /** Создать тип события в календаре */
  @route("/owner/calendars/{calendarId}/event-types")
  @post
  createEventType(
    @path calendarId: int32,
    @body eventType: EventTypeCreate,
  ): {
    @statusCode statusCode: 201;
    @body body: EventType;
  } | Error;

  /** Обновить тип события */
  @route("/owner/calendars/{calendarId}/event-types/{id}")
  @patch
  updateEventType(
    @path calendarId: int32,
    @path id: int32,
    @body eventType: EventTypeCreate,
  ): EventType | Error;

  /** Удалить тип события */
  @route("/owner/calendars/{calendarId}/event-types/{id}")
  @delete
  deleteEventType(
    @path calendarId: int32,
    @path id: int32,
  ): {
    @statusCode statusCode: 204;
  } | Error;

  /** Получить расписание календаря */
  @route("/owner/calendars/{calendarId}/schedule")
  @get
  getSchedule(@path calendarId: int32): ScheduleDay[] | Error;

  /** Обновить расписание календаря */
  @route("/owner/calendars/{calendarId}/schedule")
  @put
  saveSchedule(
    @path calendarId: int32,
    @body schedule: ScheduleDay[],
  ): ScheduleDay[] | Error;

  /** Список бронирований календаря */
  @route("/owner/calendars/{calendarId}/bookings")
  @get
  listBookings(@path calendarId: int32): Booking[] | Error;
}
