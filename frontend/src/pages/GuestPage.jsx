import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, Calendar as CalendarIcon,
  AlertCircle, RefreshCw, BookOpen, Lock, Users,
  CheckCircle2, User, Mail, MessageSquare, Layout
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as client from '@/api/client'
import { ru } from 'date-fns/locale'

function GuestPage() {
  const { userId: urlUserId } = useParams()
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [calendars, setCalendars] = useState([])
  const [selectedCalendar, setSelectedCalendar] = useState(null)
  const [eventTypes, setEventTypes] = useState([])
  const [selectedEventType, setSelectedEventType] = useState(null)

  const [slots, setSlots] = useState([])
  const [selectedDate, setSelectedDate] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Booking dialog
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success
  const [isSuccess, setIsSuccess] = useState(false)
  const [newBooking, setNewBooking] = useState(null)

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const fetchedUsers = await client.listUsers()
        setUsers(fetchedUsers)
        if (urlUserId) {
          const user = fetchedUsers.find(u => u.id === Number(urlUserId))
          if (user) {
            setSelectedUser(user)
          }
        }
      } catch (err) {
        setError(err.message || 'Ошибка загрузки пользователей')
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [urlUserId])

  const handleSelectUser = async (user) => {
    setSelectedUser(user)
    setSelectedCalendar(null)
    setSelectedEventType(null)
    setSlots([])
    setIsLoading(true)
    setError(null)
    try {
      const fetchedCalendars = await client.listUserCalendars(user.id)
      setCalendars(fetchedCalendars)
    } catch (err) {
      setError(err.message || 'Ошибка загрузки календарей')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCalendar = async (calendar) => {
    setSelectedCalendar(calendar)
    setSelectedEventType(null)
    setSlots([])
    setIsLoading(true)
    setError(null)
    try {
      const fetchedEventTypes = await client.listCalendarEventTypes(selectedUser.id, calendar.id)
      setEventTypes(fetchedEventTypes)
    } catch (err) {
      setError(err.message || 'Ошибка загрузки типов событий')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectEventType = async (type) => {
    setSelectedEventType(type)
    setIsLoading(true)
    setError(null)
    try {
      const fetchedSlots = await client.listSlots(selectedUser.id, selectedCalendar.id, type.id)
      setSlots(fetchedSlots)
      const today = new Date()
      let foundDate = null
      for (let i = 0; i < 14; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        const slotForDay = fetchedSlots.find(s => {
          const sd = new Date(s.startTime)
          return sd.getFullYear() === d.getFullYear() &&
            sd.getMonth() === d.getMonth() &&
            sd.getDate() === d.getDate()
        })
        if (slotForDay) {
          foundDate = d
          break
        }
      }
      setSelectedDate(foundDate || today)
    } catch (err) {
      setError(err.message || 'Ошибка загрузки слотов')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshSlots = async () => {
    if (!selectedEventType) return
    handleSelectEventType(selectedEventType)
  }

  const todayMidnight = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }

  const isWorkingDay = (date) => {
    if (!date) return false
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const t = todayMidnight()
    const diffDays = Math.round((d - t) / (24 * 60 * 60 * 1000))
    if (diffDays < 0 || diffDays >= 14) return false
    return slots.some(slot => {
      const sd = new Date(slot.startTime)
      return sd.getFullYear() === d.getFullYear() &&
        sd.getMonth() === d.getMonth() &&
        sd.getDate() === d.getDate()
    })
  }

  const getSlotsForDate = (date) => {
    if (!date) return []
    const targetYear = date.getFullYear()
    const targetMonth = date.getMonth()
    const targetDay = date.getDate()
    return slots.filter(slot => {
      const slotDate = new Date(slot.startTime)
      return slotDate.getFullYear() === targetYear &&
        slotDate.getMonth() === targetMonth &&
        slotDate.getDate() === targetDay
    })
  }

  const formatTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatSelectedDateFull = (date) => {
    if (!date) return ''
    return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatDateTimeForDialog = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    const datePart = d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
    const timePart = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${datePart}, в ${timePart}`
  }

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot)
    setFormName('')
    setFormEmail('')
    setFormComment('')
    setFormError(null)
    setIsBookingDialogOpen(true)
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!formName.trim()) { setFormError('Имя гостя обязательно'); return }
    if (!formEmail.trim()) { setFormError('Email гостя обязателен'); return }
    setIsSubmitting(true)
    try {
      const payload = {
        calendarId: Number(selectedCalendar.id),
        eventTypeId: Number(selectedEventType.id),
        startTime: selectedSlot.startTime,
        guestName: formName.trim(),
        guestEmail: formEmail.trim(),
        comment: formComment.trim() || undefined,
      }
      const createdBooking = await client.createBooking(payload)
      setNewBooking(createdBooking)
      setIsSuccess(true)
      setIsBookingDialogOpen(false)
    } catch (err) {
      setFormError(err.message || 'Ошибка при сохранении бронирования')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (selectedEventType) {
      setSelectedEventType(null)
      setSlots([])
    } else if (selectedCalendar) {
      setSelectedCalendar(null)
      setEventTypes([])
    } else if (selectedUser) {
      setSelectedUser(null)
      setCalendars([])
    } else {
      navigate('/')
    }
  }

  const resetAll = () => {
    setSelectedUser(null)
    setSelectedCalendar(null)
    setSelectedEventType(null)
    setSlots([])
    setSelectedDate(undefined)
    setError(null)
    setIsSuccess(false)
    setNewBooking(null)
  }

  const selectedDaySlots = getSlotsForDate(selectedDate)

  // SUCCESS VIEW
  if (isSuccess && newBooking) {
    return (
      <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-xl shadow-lg border-t-4 border-t-emerald-500">
          <CardContent className="pt-8 pb-6 px-6 sm:px-8 text-center space-y-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="size-8" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Запись успешно создана!</CardTitle>
              <CardDescription>Вы забронировали время встречи. Подтверждение отправлено на ваш email.</CardDescription>
            </div>
            <div className="border border-border/80 rounded-lg bg-card/50 p-5 text-left space-y-4">
              <div className="border-b pb-3">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block">Тип встречи</span>
                <span className="font-bold text-lg">{selectedEventType?.name}</span>
                <span className="text-xs text-muted-foreground block mt-1 flex items-center gap-1">
                  <Clock className="size-3.5" /> {selectedEventType?.durationMinutes} мин
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block">Дата и время</span>
                  <span className="font-semibold">{formatDateTimeForDialog(newBooking.startTime)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block">Ваши контакты</span>
                  <span className="font-semibold flex items-center gap-1.5 mt-0.5">
                    <User className="size-3.5 text-muted-foreground" /> {newBooking.guestName}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="size-3.5 text-muted-foreground" /> {newBooking.guestEmail}
                  </span>
                </div>
              </div>
              {newBooking.comment && (
                <div className="border-t pt-3">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">Ваш комментарий</span>
                  <p className="text-xs text-muted-foreground italic leading-relaxed bg-muted p-2 rounded-md border">{newBooking.comment}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button onClick={resetAll} className="sm:flex-1">Записаться на другую встречу</Button>
              <Button variant="outline" onClick={() => navigate('/')} className="sm:flex-1">На главную</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <Button variant="ghost" onClick={handleBack} className="pl-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 size-4" /> Назад
          </Button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">
            <Users className="size-3.5 text-primary" /> Запись на встречу
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <Button size="sm" variant="ghost" onClick={handleRefreshSlots || (() => {})}>
              <RefreshCw className="mr-1 size-4" /> Обновить
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: Select user */}
            {!selectedUser && (
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto space-y-2 py-4">
                  <h2 className="text-3xl font-bold tracking-tight">Запись на встречу</h2>
                  <p className="text-muted-foreground text-sm">Выберите владельца календаря для записи.</p>
                </div>
                {users.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Users className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">Нет зарегистрированных пользователей</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">В системе пока нет ни одного пользователя.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
                    {users.map((user) => (
                      <Card key={user.id} className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer"
                        onClick={() => handleSelectUser(user)}>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{user.name}</CardTitle>
                              <CardDescription>{user.email}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 border-t border-border/40 mt-auto py-3">
                          <Button className="w-full" variant="outline">Выбрать</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Select calendar */}
            {selectedUser && !selectedCalendar && (
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto space-y-2 py-4">
                  <h2 className="text-3xl font-bold tracking-tight">Календари</h2>
                  <p className="text-muted-foreground text-sm">Выберите календарь пользователя {selectedUser.name}.</p>
                </div>
                {calendars.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Layout className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">Нет календарей</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">У этого пользователя пока нет календарей для записи.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
                    {calendars.map((cal) => (
                      <Card key={cal.id} className="transition-all hover:shadow-md hover:border-primary/40 cursor-pointer"
                        onClick={() => handleSelectCalendar(cal)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Layout className="size-5 text-primary" />
                            <CardTitle className="text-lg">{cal.name}</CardTitle>
                          </div>
                          {cal.description && (
                            <CardDescription className="text-sm mt-1">{cal.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0 border-t border-border/40 mt-auto py-3">
                          <Button className="w-full" variant="outline">Выбрать время</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Select event type */}
            {selectedCalendar && !selectedEventType && (
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto space-y-2 py-4">
                  <h2 className="text-3xl font-bold tracking-tight">{selectedCalendar.name}</h2>
                  <p className="text-muted-foreground text-sm">Выберите тип встречи для бронирования.</p>
                </div>
                {eventTypes.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Clock className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">Нет типов встреч</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">В этом календаре пока нет типов встреч.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
                    {eventTypes.map((type) => (
                      <Card key={type.id} className="flex flex-col justify-between transition-all hover:shadow-md hover:border-primary/40 cursor-pointer"
                        onClick={() => handleSelectEventType(type)}>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-lg font-bold line-clamp-2">{type.name}</CardTitle>
                            <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                              <Clock className="size-3" /> {type.durationMinutes} мин
                            </Badge>
                          </div>
                          <CardDescription className="text-sm line-clamp-3 mt-2 leading-relaxed">
                            {type.description || 'Описание отсутствует.'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 border-t border-border/40 mt-auto py-3">
                          <Button className="w-full" variant="outline">Выбрать время</Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Calendar + Slots */}
            {selectedEventType && (
              <div className="space-y-6">
                <Card className="overflow-hidden border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5 font-semibold text-primary bg-primary/5">
                            <BookOpen className="size-3" /> {selectedCalendar.name}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5 font-mono">
                            <Clock className="size-3" /> {selectedEventType.durationMinutes} мин
                          </Badge>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">{selectedEventType.name}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                          {selectedEventType.description || 'Описание не заполнено.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-5">
                  <Card className="md:col-span-3 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="size-5 text-primary" /> Выбор даты
                      </CardTitle>
                      <CardDescription>Выберите день в окне записи (14 дней).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={ru}
                        disabled={(date) => {
                          const d = new Date(date)
                          d.setHours(0, 0, 0, 0)
                          const t = todayMidnight()
                          const diff = Math.round((d - t) / (24 * 60 * 60 * 1000))
                          if (diff < 0 || diff >= 14) return true
                          return !isWorkingDay(date)
                        }}
                        modifiers={{ working: (date) => isWorkingDay(date) }}
                        modifiersClassNames={{
                          working: 'bg-primary/5 text-primary font-bold border border-primary/20 rounded-md hover:bg-primary/10'
                        }}
                        className="rounded-md border p-3 w-fit"
                      />
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 border-t pt-3 w-full justify-center">
                        <div className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-sm bg-primary/10 border border-primary/20" />
                          <span>Слоты есть</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-sm bg-muted border" />
                          <span>Нет слотов</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <CardTitle className="text-lg font-bold">Доступное время</CardTitle>
                      <CardDescription className="capitalize">
                        {selectedDate ? formatSelectedDateFull(selectedDate) : 'Выберите дату'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 p-4">
                      {!selectedDate ? (
                        <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-muted-foreground p-4">
                          Выберите день на календаре.
                        </div>
                      ) : selectedDaySlots.length === 0 ? (
                        <div className="flex flex-col h-full min-h-48 items-center justify-center text-center p-4">
                          <Clock className="size-8 text-muted-foreground/60 mb-2" />
                          <p className="font-semibold text-sm">Слотов нет</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                            На этот день нет доступных слотов.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {selectedDaySlots.map((slot, index) => (
                              <div key={index}>
                                {slot.isAvailable ? (
                                  <button type="button" onClick={() => handleSlotClick(slot)}
                                    className="w-full flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 py-2.5 px-3 text-center text-sm font-semibold text-primary transition-all hover:bg-primary/15 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer">
                                    {formatTime(slot.startTime)}
                                  </button>
                                ) : (
                                  <div className="w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted py-1.5 px-3 text-center text-xs text-muted-foreground line-through opacity-60 relative"
                                    title="Встреча забронирована">
                                    <span className="font-mono text-sm">{formatTime(slot.startTime)}</span>
                                    <span className="text-[9px] font-semibold tracking-wide uppercase mt-0.5 flex items-center gap-0.5 text-destructive/70">
                                      <Lock className="size-2" /> Занято
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleBookingSubmit}>
            <DialogHeader>
              <DialogTitle>Подтверждение записи</DialogTitle>
              <DialogDescription>Заполните форму для бронирования времени.</DialogDescription>
            </DialogHeader>
            {formError && (
              <div className="my-3 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3.5 space-y-1.5 border">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Выбранное время</div>
                <div className="text-sm font-bold">{selectedSlot && formatDateTimeForDialog(selectedSlot.startTime)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" /> {selectedEventType?.name} ({selectedEventType?.durationMinutes} мин)
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-name">Ваше имя *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                  <Input id="guest-name" placeholder="Иван Иванов" value={formName}
                    onChange={(e) => setFormName(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-email">Электронная почта *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                  <Input id="guest-email" type="email" placeholder="ivan@example.com" value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest-comment">Комментарий</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                  <textarea id="guest-comment" placeholder="Вопросы, которые хотите обсудить..."
                    value={formComment} onChange={(e) => setFormComment(e.target.value)}
                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    maxLength={500} />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBookingDialogOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Бронирование...' : 'Подтвердить запись'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default GuestPage
