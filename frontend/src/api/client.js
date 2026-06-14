const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

function getToken() {
  return localStorage.getItem('cal_booking_token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('cal_booking_token', token)
  } else {
    localStorage.removeItem('cal_booking_token')
  }
}

export function getCurrentUser() {
  const raw = localStorage.getItem('cal_booking_user')
  return raw ? JSON.parse(raw) : null
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('cal_booking_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('cal_booking_user')
  }
}

export function isAuthenticated() {
  return !!getToken()
}

export function logout() {
  setToken(null)
  setCurrentUser(null)
}

async function request(path, options = {}) {
  if (!BASE_URL) {
    throw new ApiError(0, 'VITE_API_BASE_URL не задан. Укажите адрес API в .env')
  }

  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers, ...options })
  } catch {
    throw new ApiError(0, 'Не удалось подключиться к API. Проверьте, что бэкенд запущен')
  }

  if (!response.ok) {
    let body = null
    try {
      body = await response.json()
    } catch {
      // response body is not JSON
    }
    throw new ApiError(body?.code ?? response.status, body?.message ?? response.statusText)
  }

  if (response.status === 204) return null
  return response.json()
}

// ==========================================
// AUTH
// ==========================================

export async function register(name, email, password) {
  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  setToken(result.token)
  setCurrentUser(result.user)
  return result
}

export async function login(email, password) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(result.token)
  setCurrentUser(result.user)
  return result
}

// ==========================================
// PUBLIC (Guest)
// ==========================================

export async function listUsers() {
  return request('/users')
}

export async function listUserCalendars(userId) {
  return request(`/users/${userId}/calendars`)
}

export async function listCalendarEventTypes(userId, calendarId) {
  return request(`/users/${userId}/calendars/${calendarId}/event-types`)
}

export async function getCalendarEventType(userId, calendarId, id) {
  return request(`/users/${userId}/calendars/${calendarId}/event-types/${id}`)
}

export async function listSlots(userId, calendarId, eventTypeId) {
  return request(`/users/${userId}/calendars/${calendarId}/event-types/${eventTypeId}/slots`)
}

export async function createBooking(booking) {
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  })
}

// ==========================================
// OWNER (Authenticated)
// ==========================================

export async function listCalendars() {
  return request('/owner/calendars')
}

export async function getCalendar(id) {
  return request(`/owner/calendars/${id}`)
}

export async function createCalendar(data) {
  return request('/owner/calendars', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCalendar(id, data) {
  return request(`/owner/calendars/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCalendar(id) {
  return request(`/owner/calendars/${id}`, { method: 'DELETE' })
}

export async function listOwnerEventTypes(calendarId) {
  return request(`/owner/calendars/${calendarId}/event-types`)
}

export async function createOwnerEventType(calendarId, eventType) {
  return request(`/owner/calendars/${calendarId}/event-types`, {
    method: 'POST',
    body: JSON.stringify(eventType),
  })
}

export async function updateOwnerEventType(calendarId, id, eventType) {
  return request(`/owner/calendars/${calendarId}/event-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(eventType),
  })
}

export async function deleteOwnerEventType(calendarId, id) {
  return request(`/owner/calendars/${calendarId}/event-types/${id}`, { method: 'DELETE' })
}

export async function getOwnerSchedule(calendarId) {
  return request(`/owner/calendars/${calendarId}/schedule`)
}

export async function saveOwnerSchedule(calendarId, schedule) {
  return request(`/owner/calendars/${calendarId}/schedule`, {
    method: 'PUT',
    body: JSON.stringify(schedule),
  })
}

export async function listOwnerBookings(calendarId) {
  return request(`/owner/calendars/${calendarId}/bookings`)
}
