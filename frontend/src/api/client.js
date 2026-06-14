/**
 * Клиент API Calendar Booking Service.
 * Контракт: main.tsp (в корне репозитория).
 * Базовый URL задаётся переменной окружения VITE_API_BASE_URL.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

/** Ошибка API по модели Error { code, message } из контракта. */
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function request(path, options = {}) {
  if (!BASE_URL) {
    throw new ApiError(0, 'VITE_API_BASE_URL не задан. Укажите адрес API в .env')
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к API. Проверьте, что бэкенд запущен')
  }

  if (!response.ok) {
    let body = null
    try {
      body = await response.json()
    } catch {
      // тело ошибки не в формате JSON — используем статус ответа
    }
    throw new ApiError(body?.code ?? response.status, body?.message ?? response.statusText)
  }

  if (response.status === 204) return null
  return response.json()
}

// ==========================================
// LOCAL STORAGE FALLBACK LOGIC
// ==========================================

const DEFAULT_EVENT_TYPES = [
  { id: 1, name: "Вводная встреча", description: "Знакомство, обсуждение целей и задач.", durationMinutes: 30 },
  { id: 2, name: "Техническое интервью", description: "Проверка технических навыков, лайвкодинг.", durationMinutes: 60 }
]

const DEFAULT_TIMEZONE = "Europe/Moscow"

const DEFAULT_SCHEDULE = {
  timezone: DEFAULT_TIMEZONE,
  schedule: [
    { dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 2, isWorking: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 3, isWorking: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 4, isWorking: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 5, isWorking: true, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 6, isWorking: false, startTime: "10:00", endTime: "16:00" },
    { dayOfWeek: 7, isWorking: false, startTime: "10:00", endTime: "16:00" }
  ]
}

function getLocalData(key, defaultVal) {
  const data = localStorage.getItem(`cal_booking_${key}`)
  if (!data) {
    localStorage.setItem(`cal_booking_${key}`, JSON.stringify(defaultVal))
    return defaultVal
  }
  return JSON.parse(data)
}

function setLocalData(key, value) {
  localStorage.setItem(`cal_booking_${key}`, JSON.stringify(value))
}

function getDefaultOwner() {
  return {
    id: 1,
    name: "Владелец календаря",
    email: "owner@example.com",
    timezone: DEFAULT_TIMEZONE
  }
}

function generateLocalSlots(eventTypeId) {
  const eventTypes = getLocalData('event_types', DEFAULT_EVENT_TYPES)
  const eventType = eventTypes.find(e => e.id === Number(eventTypeId))
  if (!eventType) return []

  const scheduleData = getLocalData('schedule', DEFAULT_SCHEDULE)
  const schedule = scheduleData.schedule || scheduleData // backward compatibility
  const bookings = getLocalData('bookings', [])

  const slots = []
  const duration = eventType.durationMinutes

  // Use owner's timezone for "today"
  const ownerTimezone = scheduleData.timezone || DEFAULT_TIMEZONE
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: ownerTimezone }))

  for (let i = 0; i < 30; i++) {
    const currentDay = new Date(today)
    currentDay.setDate(today.getDate() + i)
    
    // JS Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
    // Our DayOfWeek: 1 = Mon, ..., 7 = Sun
    const jsDay = currentDay.getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay

    const daySetting = schedule.find(s => s.dayOfWeek === dayOfWeek)
    if (!daySetting || !daySetting.isWorking) {
      continue
    }

    const [startH, startM] = daySetting.startTime.split(':').map(Number)
    const [endH, endM] = daySetting.endTime.split(':').map(Number)

    const slotStart = new Date(currentDay)
    slotStart.setHours(startH, startM, 0, 0)

    const dayEnd = new Date(currentDay)
    dayEnd.setHours(endH, endM, 0, 0)

    while (true) {
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)
      if (slotEnd > dayEnd) {
        break
      }

      const slotStartISO = slotStart.toISOString()
      
      // Check if slot overlaps with any booking's startTime
      const isBooked = bookings.some(b => {
        const bTime = new Date(b.startTime).toISOString()
        return bTime === slotStartISO
      })

      slots.push({
        startTime: slotStartISO,
        isAvailable: !isBooked
      })

      // Next slot
      slotStart.setTime(slotStart.getTime() + duration * 60 * 1000)
    }
  }

  return slots
}

/**
 * Определяет, нужно ли переключиться на эмуляцию в localStorage.
 * Срабатывает при потере сети (0), отсутствии ресурса на сервере (404),
 * или внутренних сбоях сервера (500).
 */
function shouldFallback(err) {
  return err.code === 0 || err.code === 404 || err.code === 500
}

// ==========================================
// API CLIENT FUNCTIONS WITH AUTONOMOUS FALLBACK
// ==========================================

/** GET /event-types — список типов событий */
export async function listEventTypes() {
  try {
    return await request('/event-types')
  } catch (err) {
    if (shouldFallback(err)) {
      return getLocalData('event_types', DEFAULT_EVENT_TYPES)
    }
    throw err
  }
}

/** GET /event-types/{id} — тип события по идентификатору */
export async function getEventType(id) {
  try {
    return await request(`/event-types/${id}`)
  } catch (err) {
    if (shouldFallback(err)) {
      const list = getLocalData('event_types', DEFAULT_EVENT_TYPES)
      const found = list.find(e => e.id === Number(id))
      if (!found) {
        throw new ApiError(404, 'Тип события не найден')
      }
      return found
    }
    throw err
  }
}

/**
 * GET /event-types/{id}/slots — слоты для типа события
 * на ближайшие 30 дней, начиная с текущей даты.
 */
export async function listSlots(id) {
  try {
    return await request(`/event-types/${id}/slots`)
  } catch (err) {
    if (shouldFallback(err)) {
      return generateLocalSlots(id)
    }
    throw err
  }
}

/**
 * POST /bookings — создать бронирование на свободный слот.
 * При конфликте времени API возвращает 409 (ApiError.code === 409).
 */
export async function createBooking(booking) {
  try {
    return await request('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    })
  } catch (err) {
    if (shouldFallback(err)) {
      const bookings = getLocalData('bookings', [])
      const bookingStartISO = new Date(booking.startTime).toISOString()
      
      const conflict = bookings.some(b => new Date(b.startTime).toISOString() === bookingStartISO)
      if (conflict) {
        throw new ApiError(409, 'Время начала встречи уже занято.')
      }

      const newBooking = {
        id: bookings.length > 0 ? Math.max(...bookings.map(b => b.id)) + 1 : 1,
        eventTypeId: Number(booking.eventTypeId),
        startTime: bookingStartISO,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        comment: booking.comment,
        createdAt: new Date().toISOString()
      }

      bookings.push(newBooking)
      setLocalData('bookings', bookings)
      return newBooking
    }
    throw err
  }
}

/** GET /owner/schedule — получить текущие настройки доступности владельца (включая таймзону) */
export async function getSchedule() {
  try {
    return await request('/owner/schedule')
  } catch (err) {
    if (shouldFallback(err)) {
      return getLocalData('schedule', DEFAULT_SCHEDULE)
    }
    throw err
  }
}

/** PUT /owner/schedule — обновить настройки доступности владельца (включая таймзону) */
export async function saveSchedule(scheduleData) {
  try {
    return await request('/owner/schedule', {
      method: 'PUT',
      body: JSON.stringify(scheduleData)
    })
  } catch (err) {
    if (shouldFallback(err)) {
      setLocalData('schedule', scheduleData)
      return scheduleData
    }
    throw err
  }
}

/** GET /owner — получить информацию о владельце (включая таймзону) */
export async function getOwner() {
  try {
    return await request('/owner')
  } catch (err) {
    if (shouldFallback(err)) {
      return getDefaultOwner()
    }
    throw err
  }
}

/** GET /owner/bookings — получить список всех бронирований для владельца */
export async function listOwnerBookings() {
  try {
    return await request('/owner/bookings')
  } catch (err) {
    if (shouldFallback(err)) {
      return getLocalData('bookings', [])
    }
    throw err
  }
}

/** POST /event-types — создать новый тип события */
export async function createEventType(eventType) {
  try {
    return await request('/event-types', {
      method: 'POST',
      body: JSON.stringify(eventType)
    })
  } catch (err) {
    if (shouldFallback(err)) {
      const list = getLocalData('event_types', DEFAULT_EVENT_TYPES)
      const newType = {
        id: list.length > 0 ? Math.max(...list.map(e => e.id)) + 1 : 1,
        name: eventType.name,
        description: eventType.description,
        durationMinutes: Number(eventType.durationMinutes)
      }
      list.push(newType)
      setLocalData('event_types', list)
      return newType
    }
    throw err
  }
}

/** PATCH /event-types/{id} — обновить тип события */
export async function updateEventType(id, eventType) {
  try {
    return await request(`/event-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(eventType)
    })
  } catch (err) {
    if (shouldFallback(err)) {
      const list = getLocalData('event_types', DEFAULT_EVENT_TYPES)
      const index = list.findIndex(e => e.id === Number(id))
      if (index === -1) {
        throw new ApiError(404, 'Тип события не найден')
      }
      list[index] = {
        ...list[index],
        name: eventType.name,
        description: eventType.description,
        durationMinutes: Number(eventType.durationMinutes)
      }
      setLocalData('event_types', list)
      return list[index]
    }
    throw err
  }
}

/** DELETE /event-types/{id} — удалить тип события */
export async function deleteEventType(id) {
  try {
    return await request(`/event-types/${id}`, {
      method: 'DELETE'
    })
  } catch (err) {
    if (shouldFallback(err)) {
      const list = getLocalData('event_types', DEFAULT_EVENT_TYPES)
      const filtered = list.filter(e => e.id !== Number(id))
      setLocalData('event_types', filtered)
      return null
    }
    throw err
  }
}
