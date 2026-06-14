import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Clock, Plus, Edit, Trash2, 
  Save, FileText, Check, AlertCircle, RefreshCw, CalendarDays, Eye, Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as client from '@/api/client'

const DAY_NAMES = {
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
  7: "Воскресенье"
}

const TIMEZONES = [
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+3)" },
  { value: "Europe/Kaliningrad", label: "Europe/Kaliningrad (UTC+2)" },
  { value: "Europe/Samara", label: "Europe/Samara (UTC+4)" },
  { value: "Asia/Yekaterinburg", label: "Asia/Yekaterinburg (UTC+5)" },
  { value: "Asia/Omsk", label: "Asia/Omsk (UTC+6)" },
  { value: "Asia/Krasnoyarsk", label: "Asia/Krasnoyarsk (UTC+7)" },
  { value: "Asia/Irkutsk", label: "Asia/Irkutsk (UTC+8)" },
  { value: "Asia/Yakutsk", label: "Asia/Yakutsk (UTC+9)" },
  { value: "Asia/Vladivostok", label: "Asia/Vladivostok (UTC+10)" },
  { value: "Asia/Magadan", label: "Asia/Magadan (UTC+11)" },
  { value: "Asia/Kamchatka", label: "Asia/Kamchatka (UTC+12)" },
  { value: "UTC", label: "UTC (UTC+0)" },
  { value: "Europe/London", label: "Europe/London (UTC+0/+1)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+1/+2)" },
  { value: "America/New_York", label: "America/New_York (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (UTC-8/-7)" },
]

function OwnerPage() {
  const [eventTypes, setEventTypes] = useState([])
  const [schedule, setSchedule] = useState([])
  const [bookings, setBookings] = useState([])
  const [timezone, setTimezone] = useState("Europe/Moscow")
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Schedule saving state
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)

  // Event Type Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEventType, setEditingEventType] = useState(null) // null for create, eventType for edit
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formDuration, setFormDuration] = useState(30)
  const [formError, setFormError] = useState(null)
  const [isSavingEventType, setIsSavingEventType] = useState(false)

  // Fetch all data for manual reload
  const handleRefresh = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedEventTypes, fetchedScheduleData, fetchedBookings] = await Promise.all([
        client.listEventTypes(),
        client.getSchedule(),
        client.listOwnerBookings()
      ])
      setEventTypes(fetchedEventTypes)
      // Handle both old format (array) and new format (object with timezone + schedule)
      const fetchedSchedule = fetchedScheduleData.schedule || fetchedScheduleData
      setSchedule([...fetchedSchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek))
      setTimezone(fetchedScheduleData.timezone || "Europe/Moscow")
      setBookings(fetchedBookings)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [fetchedEventTypes, fetchedScheduleData, fetchedBookings] = await Promise.all([
          client.listEventTypes(),
          client.getSchedule(),
          client.listOwnerBookings()
        ])
        if (isMounted) {
          setEventTypes(fetchedEventTypes)
          const fetchedSchedule = fetchedScheduleData.schedule || fetchedScheduleData
          setSchedule([...fetchedSchedule].sort((a, b) => a.dayOfWeek - b.dayOfWeek))
          setTimezone(fetchedScheduleData.timezone || "Europe/Moscow")
          setBookings(fetchedBookings)
          setIsLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setError(err.message || 'Ошибка загрузки данных')
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  // Handle Event Type submit (create/update)
  const handleEventTypeSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError("Название встречи обязательно")
      return
    }
    if (formDuration < 1) {
      setFormError("Длительность должна быть не менее 1 минуты")
      return
    }

    setIsSavingEventType(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        durationMinutes: Number(formDuration)
      }

      if (editingEventType) {
        await client.updateEventType(editingEventType.id, payload)
      } else {
        await client.createEventType(payload)
      }

      // Re-fetch event types
      const updatedList = await client.listEventTypes()
      setEventTypes(updatedList)
      
      // Close dialog
      setIsDialogOpen(false)
      resetForm()
    } catch (err) {
      setFormError(err.message || "Ошибка сохранения типа встречи")
    } finally {
      setIsSavingEventType(false)
    }
  }

  // Open dialog for create
  const handleCreateOpen = () => {
    resetForm()
    setEditingEventType(null)
    setIsDialogOpen(true)
  }

  // Open dialog for edit
  const handleEditOpen = (eventType) => {
    setEditingEventType(eventType)
    setFormName(eventType.name)
    setFormDescription(eventType.description)
    setFormDuration(eventType.durationMinutes)
    setFormError(null)
    setIsDialogOpen(true)
  }

  // Handle delete event type
  const handleDeleteEventType = async (id, name) => {
    if (window.confirm(`Вы уверены, что хотите удалить тип встречи "${name}"?`)) {
      try {
        await client.deleteEventType(id)
        // Refresh local list
        setEventTypes(prev => prev.filter(e => e.id !== id))
      } catch (err) {
        alert(err.message || "Ошибка при удалении")
      }
    }
  }

  // Reset event type form
  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormDuration(30)
    setFormError(null)
  }

  // Handle Schedule property change
  const handleScheduleChange = (dayOfWeek, field, value) => {
    setSchedule(prev => prev.map(day => {
      if (day.dayOfWeek === dayOfWeek) {
        return { ...day, [field]: value }
      }
      return day
    }))
  }

  // Save entire schedule
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true)
    setScheduleSuccess(false)
    try {
      // Validate times if working
      for (const day of schedule) {
        if (day.isWorking) {
          const [sh, sm] = day.startTime.split(':').map(Number)
          const [eh, em] = day.endTime.split(':').map(Number)
          if (sh > eh || (sh === eh && sm >= em)) {
            throw new Error(`Для дня "${DAY_NAMES[day.dayOfWeek]}" время начала должно быть раньше времени окончания.`)
          }
        }
      }

      await client.saveSchedule({ timezone, schedule })
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 3000)
    } catch (err) {
      alert(err.message || "Ошибка при сохранении расписания")
    } finally {
      setIsSavingSchedule(false)
    }
  }

  // Utility to format dateTime
  const formatDateTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="size-8 text-primary" />
              Кабинет владельца
            </h1>
            <p className="text-muted-foreground">
              Настройте типы встреч, укажите рабочие часы и просматривайте активные записи клиентов.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 size-4" />
              На главную
            </Link>
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <Button size="sm" variant="ghost" onClick={handleRefresh} className="hover:bg-destructive/20 text-destructive">
              <RefreshCw className="mr-1 size-4" /> Обновить
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Загрузка данных кабинета...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="event-types" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3 md:w-auto md:inline-flex">
              <TabsTrigger value="event-types" className="flex items-center gap-2">
                <Clock className="size-4" />
                Типы встреч
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="size-4" />
                Рабочее время
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <FileText className="size-4" />
                Записи
                {bookings.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
                    {bookings.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB: EVENT TYPES */}
            <TabsContent value="event-types" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Варианты событий для записи</h2>
                  <p className="text-sm text-muted-foreground">Эти типы встреч будут доступны гостям для бронирования.</p>
                </div>
                <Button onClick={handleCreateOpen}>
                  <Plus className="mr-1.5 size-4" /> Создать тип
                </Button>
              </div>

              {eventTypes.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <Clock className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">Нет типов встреч</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    Вы ещё не создали ни одного типа событий. Добавьте первый вариант встречи, чтобы клиенты могли записаться.
                  </p>
                  <Button onClick={handleCreateOpen}>
                    <Plus className="mr-1.5 size-4" /> Создать первый тип
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {eventTypes.map((type) => (
                    <Card key={type.id} className="flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-lg font-bold text-foreground line-clamp-1">
                            {type.name}
                          </CardTitle>
                          <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                            <Clock className="size-3" /> {type.durationMinutes} мин
                          </Badge>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {type.description || "Описание отсутствует."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex flex-wrap gap-2 justify-end border-t border-border/40 mt-auto py-3">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/event-types/${type.id}/preview`}>
                            <Eye className="mr-1 size-3.5" /> Предпросмотр
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditOpen(type)}>
                          <Edit className="mr-1 size-3.5" /> Редактировать
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteEventType(type.id, type.name)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="mr-1 size-3.5" /> Удалить
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: SCHEDULE */}
            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Рабочие часы и доступность</CardTitle>
                      <CardDescription>
                        Укажите дни и временные интервалы, когда вы доступны для проведения встреч.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {scheduleSuccess && (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
                          <Check className="size-4" /> Изменения сохранены!
                        </span>
                      )}
                      <Button onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                        {isSavingSchedule ? (
                          <>
                            <RefreshCw className="mr-1.5 size-4 animate-spin" /> Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="mr-1.5 size-4" /> Сохранить доступность
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="mb-6">
                    <Label htmlFor="timezone-select" className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Globe className="size-4" />
                      Часовой пояс владельца
                    </Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone-select" className="w-full max-w-xs">
                        <SelectValue placeholder="Выберите часовой пояс" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Рабочие часы ниже указываются в этом часовом поясе. Слоты для гостей будут автоматически пересчитаны в их локальное время.
                    </p>
                  </div>
                </CardContent>
                <CardContent className="divide-y divide-border">
                  {schedule.map((day) => (
                    <div key={day.dayOfWeek} className="flex flex-col py-4 sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 w-40">
                        <Switch 
                          checked={day.isWorking} 
                          onCheckedChange={(checked) => handleScheduleChange(day.dayOfWeek, 'isWorking', checked)}
                          id={`working-switch-${day.dayOfWeek}`}
                        />
                        <Label htmlFor={`working-switch-${day.dayOfWeek}`} className="font-semibold text-base cursor-pointer">
                          {DAY_NAMES[day.dayOfWeek]}
                        </Label>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        {day.isWorking ? (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">Рабочее время:</span>
                            <Input 
                              type="time" 
                              value={day.startTime} 
                              onChange={(e) => handleScheduleChange(day.dayOfWeek, 'startTime', e.target.value)}
                              className="w-24 text-center font-mono h-9"
                            />
                            <span className="text-muted-foreground">—</span>
                            <Input 
                              type="time" 
                              value={day.endTime} 
                              onChange={(e) => handleScheduleChange(day.dayOfWeek, 'endTime', e.target.value)}
                              className="w-24 text-center font-mono h-9"
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic bg-muted px-2 py-1 rounded">Выходной день</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: BOOKINGS */}
            <TabsContent value="bookings" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Список забронированных встреч</h2>
                <p className="text-sm text-muted-foreground">Все запланированные встречи с клиентами.</p>
              </div>

              {bookings.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <FileText className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">Записей нет</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    На данный момент никто из гостей ещё не забронировал у вас встречу. Поделитесь ссылкой на календарь!
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {[...bookings].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).map((booking) => {
                    const matchedType = eventTypes.find(e => e.id === booking.eventTypeId)
                    return (
                      <Card key={booking.id} className="overflow-hidden">
                        <div className="border-l-4 border-primary h-full">
                          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="font-semibold">
                                  {matchedType ? matchedType.name : "Встреча"}
                                </Badge>
                                <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1 font-mono">
                                  <Clock className="size-3.5" />
                                  {matchedType ? `${matchedType.durationMinutes} мин` : ""}
                                </span>
                              </div>
                              
                              <h3 className="font-bold text-lg text-foreground">
                                {formatDateTime(booking.startTime)}
                              </h3>

                              <div className="grid gap-1 sm:grid-cols-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">Гость:</span> {booking.guestName}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">Email:</span> {booking.guestEmail}
                                </div>
                              </div>

                              {booking.comment && (
                                <div className="rounded bg-muted p-2 text-xs text-muted-foreground border-l border-border mt-1">
                                  <span className="font-semibold block mb-0.5 text-foreground">Комментарий:</span>
                                  {booking.comment}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-muted-foreground self-end md:self-center font-mono shrink-0">
                              Создано: {new Date(booking.createdAt).toLocaleDateString('ru-RU')}
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* CREATE / EDIT EVENT TYPE DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEventTypeSubmit}>
            <DialogHeader>
              <DialogTitle>{editingEventType ? "Редактирование типа встречи" : "Создание типа встречи"}</DialogTitle>
              <DialogDescription>
                Укажите параметры встречи, которые будут видны гостям.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="my-3 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="event-name">Название встречи *</Label>
                <Input
                  id="event-name"
                  placeholder="например, Техническое интервью"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-duration">Длительность встречи (минут) *</Label>
                <Input
                  id="event-duration"
                  type="number"
                  placeholder="30"
                  min="1"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Math.max(1, Number(e.target.value)))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description">Описание встречи</Label>
                <textarea
                  id="event-description"
                  placeholder="Краткое описание, повестка встречи или требования..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSavingEventType}>
                {isSavingEventType ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default OwnerPage
