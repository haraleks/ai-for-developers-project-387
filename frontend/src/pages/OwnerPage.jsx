import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Clock, Plus, Edit, Trash2, 
  Save, FileText, Check, AlertCircle, RefreshCw, CalendarDays, Eye,
  LogOut, Layout
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import * as client from '@/api/client'

const DAY_NAMES = {
  1: "Понедельник", 2: "Вторник", 3: "Среда", 4: "Четверг",
  5: "Пятница", 6: "Суббота", 7: "Воскресенье"
}

function OwnerPage() {
  const navigate = useNavigate()
  const [calendars, setCalendars] = useState([])
  const [selectedCalendarId, setSelectedCalendarId] = useState(null)
  const [eventTypes, setEventTypes] = useState([])
  const [schedule, setSchedule] = useState([])
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Calendar dialog
  const [isCalDialogOpen, setIsCalDialogOpen] = useState(false)
  const [editingCalendar, setEditingCalendar] = useState(null)
  const [calFormName, setCalFormName] = useState('')
  const [calFormDesc, setCalFormDesc] = useState('')
  const [calFormError, setCalFormError] = useState(null)
  const [isSavingCal, setIsSavingCal] = useState(false)

  // Event type dialog
  const [isEtDialogOpen, setIsEtDialogOpen] = useState(false)
  const [editingEventType, setEditingEventType] = useState(null)
  const [etFormName, setEtFormName] = useState('')
  const [etFormDesc, setEtFormDesc] = useState('')
  const [etFormDuration, setEtFormDuration] = useState(30)
  const [etFormError, setEtFormError] = useState(null)
  const [isSavingEt, setIsSavingEt] = useState(false)

  // Schedule state
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)

  // Delete calendar confirmation
  const [calToDelete, setCalToDelete] = useState(null)

  const loadCalendars = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetched = await client.listCalendars()
      setCalendars(fetched)
      if (fetched.length > 0 && !selectedCalendarId) {
        setSelectedCalendarId(fetched[0].id)
      }
    } catch (err) {
      setError(err.message || 'Ошибка загрузки календарей')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCalendarId])

  const loadCalendarData = useCallback(async (calendarId) => {
    setEventTypes([])
    setSchedule([])
    setBookings([])
    setError(null)
    try {
      const [ets, sched, books] = await Promise.all([
        client.listOwnerEventTypes(calendarId),
        client.getOwnerSchedule(calendarId),
        client.listOwnerBookings(calendarId),
      ])
      setEventTypes(ets)
      setSchedule([...sched].sort((a, b) => a.dayOfWeek - b.dayOfWeek))
      setBookings(books)
    } catch (err) {
      setError(err.message || 'Ошибка загрузки данных календаря')
    }
  }, [])

  useEffect(() => {
    if (!client.isAuthenticated()) {
      navigate('/login')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendars()
  }, [loadCalendars, navigate])

  useEffect(() => {
    if (selectedCalendarId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadCalendarData(selectedCalendarId)
    }
  }, [selectedCalendarId, loadCalendarData])

  const handleRefresh = async () => {
    await loadCalendars()
  }

  // Calendar CRUD
  const openCalCreate = () => {
    setEditingCalendar(null)
    setCalFormName('')
    setCalFormDesc('')
    setCalFormError(null)
    setIsCalDialogOpen(true)
  }

  const openCalEdit = (cal) => {
    setEditingCalendar(cal)
    setCalFormName(cal.name)
    setCalFormDesc(cal.description || '')
    setCalFormError(null)
    setIsCalDialogOpen(true)
  }

  const handleCalSubmit = async (e) => {
    e.preventDefault()
    setCalFormError(null)
    if (!calFormName.trim()) {
      setCalFormError('Название календаря обязательно')
      return
    }
    setIsSavingCal(true)
    try {
      const payload = { name: calFormName.trim(), description: calFormDesc.trim() }
      if (editingCalendar) {
        await client.updateCalendar(editingCalendar.id, payload)
      } else {
        const created = await client.createCalendar(payload)
        setSelectedCalendarId(created.id)
      }
      setIsCalDialogOpen(false)
      await loadCalendars()
    } catch (err) {
      setCalFormError(err.message || 'Ошибка сохранения календаря')
    } finally {
      setIsSavingCal(false)
    }
  }

  const confirmDeleteCalendar = async () => {
    if (!calToDelete) return
    try {
      await client.deleteCalendar(calToDelete.id)
      setCalToDelete(null)
      if (selectedCalendarId === calToDelete.id) {
        setSelectedCalendarId(null)
      }
      await loadCalendars()
    } catch (err) {
      alert(err.message || 'Ошибка при удалении календаря')
    }
  }

  // Event type CRUD
  const openEtCreate = () => {
    setEditingEventType(null)
    setEtFormName('')
    setEtFormDesc('')
    setEtFormDuration(30)
    setEtFormError(null)
    setIsEtDialogOpen(true)
  }

  const openEtEdit = (et) => {
    setEditingEventType(et)
    setEtFormName(et.name)
    setEtFormDesc(et.description)
    setEtFormDuration(et.durationMinutes)
    setEtFormError(null)
    setIsEtDialogOpen(true)
  }

  const handleEtSubmit = async (e) => {
    e.preventDefault()
    setEtFormError(null)
    if (!etFormName.trim()) {
      setEtFormError('Название встречи обязательно')
      return
    }
    if (etFormDuration < 1) {
      setEtFormError('Длительность должна быть не менее 1 минуты')
      return
    }
    setIsSavingEt(true)
    try {
      const payload = {
        name: etFormName.trim(),
        description: etFormDesc.trim(),
        durationMinutes: Number(etFormDuration),
      }
      if (editingEventType) {
        await client.updateOwnerEventType(selectedCalendarId, editingEventType.id, payload)
      } else {
        await client.createOwnerEventType(selectedCalendarId, payload)
      }
      setIsEtDialogOpen(false)
      await loadCalendarData(selectedCalendarId)
    } catch (err) {
      setEtFormError(err.message || 'Ошибка сохранения типа встречи')
    } finally {
      setIsSavingEt(false)
    }
  }

  const handleDeleteEventType = async (id, name) => {
    if (window.confirm(`Вы уверены, что хотите удалить тип встречи "${name}"?`)) {
      try {
        await client.deleteOwnerEventType(selectedCalendarId, id)
        setEventTypes(prev => prev.filter(e => e.id !== id))
      } catch (err) {
        alert(err.message || 'Ошибка при удалении')
      }
    }
  }

  // Schedule
  const handleScheduleChange = (dayOfWeek, field, value) => {
    setSchedule(prev => prev.map(day =>
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    ))
  }

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true)
    setScheduleSuccess(false)
    try {
      for (const day of schedule) {
        if (day.isWorking) {
          const [sh, sm] = day.startTime.split(':').map(Number)
          const [eh, em] = day.endTime.split(':').map(Number)
          if (sh > eh || (sh === eh && sm >= em)) {
            throw new Error(`Для дня "${DAY_NAMES[day.dayOfWeek]}" время начала должно быть раньше времени окончания.`)
          }
        }
      }
      await client.saveOwnerSchedule(selectedCalendarId, schedule)
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 3000)
    } catch (err) {
      alert(err.message || 'Ошибка при сохранении расписания')
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const formatDateTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const handleLogout = () => {
    client.logout()
    navigate('/')
  }

  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId)

  return (
    <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="size-8 text-primary" />
              Кабинет владельца
            </h1>
            <p className="text-muted-foreground">
              Управляйте календарями, типами встреч, расписанием и записями клиентов.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1 size-4" /> Выйти
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/"><ArrowLeft className="mr-1 size-4" /> На главную</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <Button size="sm" variant="ghost" onClick={handleRefresh}>
              <RefreshCw className="mr-1 size-4" /> Обновить
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Загрузка календарей...</p>
            </div>
          </div>
        ) : calendars.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Layout className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Нет календарей</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Создайте первый календарь, чтобы начать управлять типами встреч и расписанием.
            </p>
            <Button onClick={openCalCreate}>
              <Plus className="mr-1.5 size-4" /> Создать календарь
            </Button>
          </Card>
        ) : (
          <>
            {/* Calendar selector */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Layout className="size-5 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-muted-foreground">Календарь:</span>
                  <select
                    value={selectedCalendarId || ''}
                    onChange={(e) => setSelectedCalendarId(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium"
                  >
                    {calendars.map(cal => (
                      <option key={cal.id} value={cal.id}>{cal.name}</option>
                    ))}
                  </select>
                  {selectedCalendar && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {selectedCalendar.description}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedCalendar && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openCalEdit(selectedCalendar)}>
                        <Edit className="mr-1 size-3.5" /> Изменить
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCalToDelete(selectedCalendar)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="mr-1 size-3.5" /> Удалить
                      </Button>
                    </>
                  )}
                  <Button size="sm" onClick={openCalCreate}>
                    <Plus className="mr-1 size-3.5" /> Добавить
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Calendar tabs */}
            {selectedCalendarId && (
              <Tabs defaultValue="event-types" className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-3 md:w-auto md:inline-flex">
                  <TabsTrigger value="event-types" className="flex items-center gap-2">
                    <Clock className="size-4" /> Типы встреч
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className="flex items-center gap-2">
                    <Calendar className="size-4" /> Расписание
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex items-center gap-2">
                    <FileText className="size-4" /> Записи
                    {bookings.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
                        {bookings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="event-types" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold">Типы событий</h2>
                      <p className="text-sm text-muted-foreground">Эти типы встреч будут доступны гостям для бронирования в этом календаре.</p>
                    </div>
                    <Button onClick={openEtCreate}>
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
                        Добавьте первый вариант встречи в этот календарь.
                      </p>
                      <Button onClick={openEtCreate}>
                        <Plus className="mr-1.5 size-4" /> Создать первый тип
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {eventTypes.map((type) => (
                        <Card key={type.id} className="flex flex-col justify-between">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-lg font-bold line-clamp-1">{type.name}</CardTitle>
                              <Badge variant="outline" className="shrink-0 flex items-center gap-1">
                                <Clock className="size-3" /> {type.durationMinutes} мин
                              </Badge>
                            </div>
                            <CardDescription className="text-sm line-clamp-2 mt-1">
                              {type.description || 'Описание отсутствует.'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0 flex flex-wrap gap-2 justify-end border-t border-border/40 mt-auto py-3">
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/event-types/${selectedCalendarId}/${type.id}/preview`}>
                                <Eye className="mr-1 size-3.5" /> Предпросмотр
                              </Link>
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEtEdit(type)}>
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

                <TabsContent value="schedule" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle>Рабочие часы и доступность</CardTitle>
                          <CardDescription>
                            Укажите дни и временные интервалы для этого календаря.
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {scheduleSuccess && (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <Check className="size-4" /> Сохранено!
                            </span>
                          )}
                          <Button onClick={handleSaveSchedule} disabled={isSavingSchedule}>
                            {isSavingSchedule ? (
                              <><RefreshCw className="mr-1.5 size-4 animate-spin" /> Сохранение...</>
                            ) : (
                              <><Save className="mr-1.5 size-4" /> Сохранить</>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
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
                                <Input type="time" value={day.startTime}
                                  onChange={(e) => handleScheduleChange(day.dayOfWeek, 'startTime', e.target.value)}
                                  className="w-24 text-center font-mono h-9" />
                                <span className="text-muted-foreground">—</span>
                                <Input type="time" value={day.endTime}
                                  onChange={(e) => handleScheduleChange(day.dayOfWeek, 'endTime', e.target.value)}
                                  className="w-24 text-center font-mono h-9" />
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

                <TabsContent value="bookings" className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">Записи на встречи</h2>
                    <p className="text-sm text-muted-foreground">Все запланированные встречи в этом календаре.</p>
                  </div>
                  {bookings.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <FileText className="size-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg">Записей нет</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Пока никто не забронировал встречу в этом календаре.
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
                                    <Badge className="font-semibold">{matchedType ? matchedType.name : 'Встреча'}</Badge>
                                    <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1 font-mono">
                                      <Clock className="size-3.5" />
                                      {matchedType ? `${matchedType.durationMinutes} мин` : ''}
                                    </span>
                                  </div>
                                  <h3 className="font-bold text-lg">{formatDateTime(booking.startTime)}</h3>
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
          </>
        )}
      </div>

      {/* Calendar dialog */}
      <Dialog open={isCalDialogOpen} onOpenChange={setIsCalDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCalSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCalendar ? 'Редактирование календаря' : 'Создание календаря'}</DialogTitle>
              <DialogDescription>Календарь группирует типы встреч и имеет собственное расписание.</DialogDescription>
            </DialogHeader>
            {calFormError && (
              <div className="my-3 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{calFormError}</span>
              </div>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cal-name">Название календаря *</Label>
                <Input id="cal-name" placeholder="например, Рабочие встречи" value={calFormName}
                  onChange={(e) => setCalFormName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-desc">Описание</Label>
                <textarea id="cal-desc" placeholder="Для каких встреч предназначен этот календарь..."
                  value={calFormDesc} onChange={(e) => setCalFormDesc(e.target.value)}
                  className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={500} />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCalDialogOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={isSavingCal}>{isSavingCal ? 'Сохранение...' : 'Сохранить'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event type dialog */}
      <Dialog open={isEtDialogOpen} onOpenChange={setIsEtDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEtSubmit}>
            <DialogHeader>
              <DialogTitle>{editingEventType ? 'Редактирование типа встречи' : 'Создание типа встречи'}</DialogTitle>
              <DialogDescription>Укажите параметры встречи, которые будут видны гостям.</DialogDescription>
            </DialogHeader>
            {etFormError && (
              <div className="my-3 flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{etFormError}</span>
              </div>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="et-name">Название встречи *</Label>
                <Input id="et-name" placeholder="Техническое интервью" value={etFormName}
                  onChange={(e) => setEtFormName(e.target.value)} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="et-duration">Длительность (минут) *</Label>
                <Input id="et-duration" type="number" placeholder="30" min="1" value={etFormDuration}
                  onChange={(e) => setEtFormDuration(Math.max(1, Number(e.target.value)))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="et-desc">Описание</Label>
                <textarea id="et-desc" placeholder="Краткое описание, повестка встречи..."
                  value={etFormDesc} onChange={(e) => setEtFormDesc(e.target.value)}
                  className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  maxLength={500} />
              </div>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEtDialogOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={isSavingEt}>{isSavingEt ? 'Сохранение...' : 'Сохранить'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete calendar confirmation */}
      <Dialog open={!!calToDelete} onOpenChange={() => setCalToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Удалить календарь?</DialogTitle>
            <DialogDescription>
              Все типы встреч, расписание и записи в этом календаре будут безвозвратно удалены.
              {calToDelete && <span className="block mt-1 font-semibold text-foreground">«{calToDelete.name}»</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCalToDelete(null)}>Отмена</Button>
            <Button variant="destructive" onClick={confirmDeleteCalendar}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default OwnerPage
