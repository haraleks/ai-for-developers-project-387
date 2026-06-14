import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Clock, Calendar as CalendarIcon, 
  AlertCircle, RefreshCw, BookOpen, Lock, Users,
  CheckCircle2, User, Mail, MessageSquare, Globe, Info
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
  const navigate = useNavigate()

  // State
  const [eventTypes, setEventTypes] = useState([])
  const [selectedEventType, setSelectedEventType] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [slots, setSlots] = useState([])
  const [ownerTimezone, setOwnerTimezone] = useState("Europe/Moscow")
  
  const [selectedDate, setSelectedDate] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Booking dialog states
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formComment, setFormComment] = useState("")
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success state
  const [isSuccess, setIsSuccess] = useState(false)
  const [newBooking, setNewBooking] = useState(null)

  // Load list of all event types on initial mount
  const loadEventTypes = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedEventTypes, fetchedOwner] = await Promise.all([
        client.listEventTypes(),
        client.getOwner()
      ])
      setEventTypes(fetchedEventTypes)
      setOwnerTimezone(fetchedOwner.timezone || "Europe/Moscow")
    } catch (err) {
      console.error(err)
      setError(err.message || 'Ошибка загрузки доступных типов встреч')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [fetchedEventTypes, fetchedOwner] = await Promise.all([
          client.listEventTypes(),
          client.getOwner()
        ])
        if (isMounted) {
          setEventTypes(fetchedEventTypes)
          setOwnerTimezone(fetchedOwner.timezone || "Europe/Moscow")
          setIsLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError(err.message || 'Ошибка загрузки доступных типов встреч')
          setIsLoading(false)
        }
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [])

  // Handle Event Type selection and load its calendar slots
  const handleSelectEventType = async (type) => {
    setSelectedEventType(type)
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedScheduleData, fetchedSlots] = await Promise.all([
        client.getSchedule(),
        client.listSlots(type.id)
      ])
      // Handle both old format (array) and new format (object with timezone + schedule)
      const fetchedSchedule = fetchedScheduleData.schedule || fetchedScheduleData
      const fetchedTimezone = fetchedScheduleData.timezone || "Europe/Moscow"
      setSchedule(fetchedSchedule)
      setOwnerTimezone(fetchedTimezone)
      setSlots(fetchedSlots)

      // Automatically select the first working day within the 30-day window (in owner's timezone)
      const today = getTodayInTimezone(fetchedTimezone)
      let foundDate = null
      for (let i = 0; i < 30; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        
        const jsDay = d.getDay()
        const dayOfWeek = jsDay === 0 ? 7 : jsDay
        const daySetting = fetchedSchedule.find(s => s.dayOfWeek === dayOfWeek)
        if (daySetting && daySetting.isWorking) {
          foundDate = d
          break
        }
      }
      setSelectedDate(foundDate || today)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Ошибка загрузки данных расписания и доступных слотов')
    } finally {
      setIsLoading(false)
    }
  }

  // Get today's date in a specific timezone
  const getTodayInTimezone = (timezone) => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }))
  }

  // Reload slots for current event type
  const handleRefreshSlots = async () => {
    if (!selectedEventType) return
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedScheduleData, fetchedSlots] = await Promise.all([
        client.getSchedule(),
        client.listSlots(selectedEventType.id)
      ])
      // Handle both old format (array) and new format (object with timezone + schedule)
      const fetchedSchedule = fetchedScheduleData.schedule || fetchedScheduleData
      const fetchedTimezone = fetchedScheduleData.timezone || "Europe/Moscow"
      setSchedule(fetchedSchedule)
      setOwnerTimezone(fetchedTimezone)
      setSlots(fetchedSlots)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Ошибка обновления данных')
    } finally {
      setIsLoading(false)
    }
  }

  // Get today at midnight in owner's timezone
  const getTodayMidnightInOwnerTz = () => {
    const today = getTodayInTimezone(ownerTimezone)
    today.setHours(0, 0, 0, 0)
    return today
  }

  // Convert a date to owner's timezone for day-of-week calculation
  const getDateInOwnerTz = (date) => {
    if (!date) return null
    // Create a new date at midnight in owner's timezone
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    return new Date(dateStr + 'T00:00:00')
  }

  const isWorkingDay = (date) => {
    if (!date) return false
    
    // Check if day is within the 30-day window (using owner's timezone)
    const todayMidnight = getTodayMidnightInOwnerTz()
    const dateInOwnerTz = getDateInOwnerTz(date)
    if (!dateInOwnerTz) return false
    
    const diffDays = Math.round((dateInOwnerTz - todayMidnight) / (24 * 60 * 60 * 1000))
    if (diffDays < 0 || diffDays >= 30) return false

    // Check if day is working in owner schedule (using owner's timezone day of week)
    const jsDay = dateInOwnerTz.getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay
    const daySetting = schedule.find(s => s.dayOfWeek === dayOfWeek)
    return !!(daySetting && daySetting.isWorking)
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
    if (!date) return ""
    return date.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const formatDateTimeForDialog = (isoString) => {
    if (!isoString) return ""
    const d = new Date(isoString)
    const datePart = d.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    const timePart = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return `${datePart}, в ${timePart}`
  }

  // Handle slot clicked - opens dialog
  const handleSlotClick = (slot) => {
    setSelectedSlot(slot)
    setFormName("")
    setFormEmail("")
    setFormComment("")
    setFormError(null)
    setIsBookingDialogOpen(true)
  }

  // Handle booking form submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError("Имя гостя обязательно")
      return
    }
    if (!formEmail.trim()) {
      setFormError("Email гостя обязателен")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        eventTypeId: Number(selectedEventType.id),
        startTime: selectedSlot.startTime,
        guestName: formName.trim(),
        guestEmail: formEmail.trim(),
        comment: formComment.trim() || undefined
      }

      const createdBooking = await client.createBooking(payload)
      setNewBooking(createdBooking)
      setIsSuccess(true)
      setIsBookingDialogOpen(false)
    } catch (err) {
      setFormError(err.message || "Ошибка при сохранении бронирования")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset to initial page state
  const handleBackToEventTypes = () => {
    setSelectedEventType(null)
    setSelectedDate(undefined)
    setSlots([])
    setError(null)
    setIsSuccess(false)
    setNewBooking(null)
  }

  const selectedDaySlots = getSlotsForDate(selectedDate)

  // 1. SUCCESS VIEW
  if (isSuccess && newBooking) {
    return (
      <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8 flex items-center justify-center">
        <Card className="w-full max-w-xl shadow-lg border-t-4 border-t-emerald-500">
          <CardContent className="pt-8 pb-6 px-6 sm:px-8 text-center space-y-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="size-8" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground">Запись успешно создана!</CardTitle>
              <CardDescription className="text-sm">
                Вы забронировали время встречи у владельца календаря. Подтверждение отправлено на ваш email.
              </CardDescription>
            </div>

            <div className="border border-border/80 rounded-lg bg-card/50 p-5 text-left space-y-4">
              <div className="border-b pb-3">
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block">Тип встречи</span>
                <span className="font-bold text-foreground text-lg">{selectedEventType?.name}</span>
                <span className="text-xs text-muted-foreground block mt-1 flex items-center gap-1">
                  <Clock className="size-3.5" /> {selectedEventType?.durationMinutes} мин
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block">Дата и время</span>
                  <span className="font-semibold text-foreground">{formatDateTimeForDialog(newBooking.startTime)}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Globe className="size-3 text-primary" /> Часовой пояс владельца: <strong className="font-mono">{ownerTimezone}</strong>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block">Ваши контакты</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
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
                  <p className="text-xs text-muted-foreground italic leading-relaxed bg-muted p-2 rounded-md border border-border/40">
                    {newBooking.comment}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button onClick={handleBackToEventTypes} className="sm:flex-1">
                Записаться на другую встречу
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="sm:flex-1">
                На главную
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // 2. MAIN WORKFLOW
  return (
    <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          {selectedEventType ? (
            <Button variant="ghost" onClick={handleBackToEventTypes} className="pl-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 size-4" /> Назад к выбору встреч
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => navigate('/')} className="pl-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 size-4" /> На главную
            </Button>
          )}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">
            <Users className="size-3.5 text-primary" /> Страница записи гостя
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <Button size="sm" variant="ghost" onClick={selectedEventType ? handleRefreshSlots : loadEventTypes} className="hover:bg-destructive/20 text-destructive">
              <RefreshCw className="mr-1 size-4" /> Обновить
            </Button>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Загрузка информации...</p>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW A: SELECT EVENT TYPE */}
            {!selectedEventType && (
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto space-y-2 py-4">
                  <h2 className="text-3xl font-bold tracking-tight text-foreground">Запись на встречу</h2>
                  <p className="text-muted-foreground text-sm">
                    Выберите тип встречи ниже, чтобы открыть календарь свободных слотов и забронировать время.
                  </p>
                </div>

                {eventTypes.length === 0 ? (
                  <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted p-3 mb-3">
                      <Clock className="size-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">Нет доступных типов встреч</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Владелец календаря ещё не создал ни одного типа встречи. Пожалуйста, зайдите позже.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
                    {eventTypes.map((type) => (
                      <Card 
                        key={type.id} 
                        className="flex flex-col justify-between transition-all hover:shadow-md hover:border-primary/40 cursor-pointer"
                        onClick={() => handleSelectEventType(type)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-lg font-bold text-foreground line-clamp-2">
                              {type.name}
                            </CardTitle>
                            <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                              <Clock className="size-3" /> {type.durationMinutes} мин
                            </Badge>
                          </div>
                          <CardDescription className="text-sm text-muted-foreground line-clamp-3 mt-2 leading-relaxed">
                            {type.description || "Описание отсутствует."}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 border-t border-border/40 mt-auto py-3">
                          <Button className="w-full" variant="outline">
                            Выбрать время
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW B: DATE & SLOT SELECTION */}
            {selectedEventType && (
              <div className="space-y-6">
                {/* Event Attributes Card */}
                <Card className="overflow-hidden border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5 font-semibold text-primary bg-primary/5">
                            <BookOpen className="size-3" /> Окно записи
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5 font-mono">
                            <Clock className="size-3" /> {selectedEventType.durationMinutes} мин
                          </Badge>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedEventType.name}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                          {selectedEventType.description || "Описание встречи не заполнено владельцем."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid: Calendar & Slots */}
                <div className="grid gap-6 md:grid-cols-5">
                  {/* Left: Calendar Selection */}
                  <Card className="md:col-span-3 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="size-5 text-primary" />
                        Выбор даты встречи
                      </CardTitle>
                      <CardDescription>
                        Выберите один из доступных дней в окне записи на ближайшие 30 дней.
                      </CardDescription>
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
                          const t = getTodayMidnightInOwnerTz()
                          const diff = Math.round((d - t) / (24 * 60 * 60 * 1000))
                          if (diff < 0 || diff >= 30) return true
                          return !isWorkingDay(date)
                        }}
                        modifiers={{
                          working: (date) => isWorkingDay(date)
                        }}
                        modifiersClassNames={{
                          working: "bg-primary/5 text-primary font-bold border border-primary/20 rounded-md hover:bg-primary/10"
                        }}
                        className="rounded-md border p-3 w-fit"
                      />
                      
                      {/* Legend */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 border-t pt-3 w-full justify-center">
                        <div className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-sm bg-primary/10 border border-primary/20" />
                          <span>Доступный день</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-sm bg-muted border" />
                          <span>Выходной / Прошедший</span>
                        </div>
                      </div>
                      {/* Timezone info */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 w-full justify-center">
                        <Info className="size-3.5 text-primary" />
                        <span>Дни недели и рабочие часы отображаются по часовому поясу владельца (<strong className="text-foreground">{ownerTimezone}</strong>). Выбранное время автоматически конвертируется в ваше локальное время.</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right: Available Slots */}
                  <Card className="md:col-span-2 flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg font-bold">
                            Доступное время
                          </CardTitle>
                          <CardDescription className="capitalize">
                            {selectedDate ? formatSelectedDateFull(selectedDate) : "Выберите дату в календаре"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full border">
                          <Globe className="size-3 text-primary" />
                          <span>Часовой пояс владельца: <strong className="text-foreground font-mono">{ownerTimezone}</strong></span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-4">
                      {!selectedDate ? (
                        <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-muted-foreground p-4">
                          Выберите активный рабочий день на календаре слева, чтобы увидеть доступные слоты.
                        </div>
                      ) : selectedDaySlots.length === 0 ? (
                        <div className="flex flex-col h-full min-h-48 items-center justify-center text-center p-4">
                          <Clock className="size-8 text-muted-foreground/60 mb-2" />
                          <p className="font-semibold text-sm">Слотов нет</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                            Все доступные часы на этот день уже прошли или заняты другими записями.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {selectedDaySlots.map((slot, index) => (
                              <div key={index}>
                                {slot.isAvailable ? (
                                  <button 
                                    type="button"
                                    onClick={() => handleSlotClick(slot)}
                                    className="w-full flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 py-2.5 px-3 text-center text-sm font-semibold text-primary transition-all hover:bg-primary/15 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                                  >
                                    {formatTime(slot.startTime)}
                                  </button>
                                ) : (
                                  <div 
                                    className="w-full flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted py-1.5 px-3 text-center text-xs text-muted-foreground line-through opacity-60 relative"
                                    title="Встреча забронирована"
                                  >
                                    <span className="font-mono text-sm">{formatTime(slot.startTime)}</span>
                                    <span className="text-[9px] font-semibold tracking-wide uppercase mt-0.5 no-underline flex items-center gap-0.5 text-destructive/70">
                                      <Lock className="size-2" /> Занято
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground italic text-center mt-2">
                            * Выберите любое свободное время выше для перехода к оформлению записи.
                          </p>
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

      {/* BOOKING DIALOG */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleBookingSubmit}>
            <DialogHeader>
              <DialogTitle>Подтверждение записи</DialogTitle>
              <DialogDescription>
                Заполните форму ниже для резервирования времени встречи.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="my-3 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4 py-4">
              {/* Slot Details Summary */}
              <div className="rounded-lg bg-muted p-3.5 space-y-1.5 border border-border/60">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Выбранное время</div>
                <div className="text-sm font-bold text-foreground">
                  {selectedSlot && formatDateTimeForDialog(selectedSlot.startTime)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" /> {selectedEventType?.name} ({selectedEventType?.durationMinutes} минут)
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Globe className="size-3.5 text-primary" />
                  <span>Время показано в вашем местном часовом поясе. Часовой пояс владельца: <strong className="text-foreground font-mono">{ownerTimezone}</strong></span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-name" className="text-sm font-semibold">Ваше имя *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                  <Input
                    id="guest-name"
                    placeholder="Иван Иванов"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    maxLength={100}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-email" className="text-sm font-semibold">Электронная почта *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="ivan@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-comment" className="text-sm font-semibold">Комментарий или пожелания</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                  <textarea
                    id="guest-comment"
                    placeholder="Напишите вопросы, которые хотите обсудить на встрече..."
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    maxLength={500}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-1.5 size-4 animate-spin" /> Бронирование...
                  </>
                ) : (
                  "Подтвердить запись"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default GuestPage