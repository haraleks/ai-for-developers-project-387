import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Clock, Calendar as CalendarIcon, 
  AlertCircle, RefreshCw, Eye, BookOpen, Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import * as client from '@/api/client'
import { ru } from 'date-fns/locale'

function EventTypePreviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [eventType, setEventType] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [slots, setSlots] = useState([])
  
  const [selectedDate, setSelectedDate] = useState(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedType, fetchedSchedule, fetchedSlots] = await Promise.all([
        client.getEventType(id),
        client.getSchedule(),
        client.listSlots(id)
      ])

      setEventType(fetchedType)
      setSchedule(fetchedSchedule)
      setSlots(fetchedSlots)

      // Automatically select the first working day within the 14-day window
      const today = new Date()
      let foundDate = null
      for (let i = 0; i < 14; i++) {
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
      setError(err.message || 'Ошибка загрузки данных предварительного просмотра')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [fetchedType, fetchedSchedule, fetchedSlots] = await Promise.all([
          client.getEventType(id),
          client.getSchedule(),
          client.listSlots(id)
        ])
        if (isMounted) {
          setEventType(fetchedType)
          setSchedule(fetchedSchedule)
          setSlots(fetchedSlots)

          // Select first working day
          const today = new Date()
          let foundDate = null
          for (let i = 0; i < 14; i++) {
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
    init()
    return () => {
      isMounted = false
    }
  }, [id])

  // Helpers to define calendar rules
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
    
    // Check if day is within the 14-day window
    if (diffDays < 0 || diffDays >= 14) return false

    // Check if day is working in owner schedule
    const jsDay = date.getDay()
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

  const selectedDaySlots = getSlotsForDate(selectedDate)

  return (
    <main className="min-h-svh bg-muted/40 p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header navigation */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <Button variant="ghost" onClick={() => navigate('/owner')} className="pl-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 size-4" /> Назад к панели владельца
          </Button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">
            <Eye className="size-3.5 text-primary" /> Предпросмотр страницы записи
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <Button size="sm" variant="ghost" onClick={loadData} className="hover:bg-destructive/20 text-destructive">
              <RefreshCw className="mr-1 size-4" /> Обновить
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-80 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Загрузка макета страницы записи...</p>
            </div>
          </div>
        ) : eventType && (
          <div className="space-y-6">
            {/* Top row: Event Attributes Card */}
            <Card className="overflow-hidden border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-0.5 font-semibold text-primary bg-primary/5">
                        <BookOpen className="size-3" /> Шаблон записи
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs px-2 py-0.5 font-mono">
                        <Clock className="size-3" /> {eventType.durationMinutes} мин
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{eventType.name}</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                      {eventType.description || "Описание встречи не заполнено владельцем."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom row: Columns of Calendar and Slots */}
            <div className="grid gap-6 md:grid-cols-5">
              {/* Left Column: Calendar Selection (spanning 3 columns) */}
              <Card className="md:col-span-3 flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <CalendarIcon className="size-5 text-primary" />
                    Выбор даты встречи
                  </CardTitle>
                  <CardDescription>
                    Выберите один из доступных дней в окне записи на ближайшие 14 дней.
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
                      const t = todayMidnight()
                      const diff = Math.round((d - t) / (24 * 60 * 60 * 1000))
                      // Disable days outside 14 days window or if non-working
                      if (diff < 0 || diff >= 14) return true
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
                      <span>Рабочий день</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-sm bg-muted border" />
                      <span>Выходной / Прошедший</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Time Slots Selection (spanning 2 columns) */}
              <Card className="md:col-span-2 flex flex-col">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-lg font-bold">
                    Доступное время
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {selectedDate ? formatSelectedDateFull(selectedDate) : "Выберите дату в календаре"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                  {!selectedDate ? (
                    <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-muted-foreground p-4">
                      Выберите активный рабочий день на календаре слева, чтобы увидеть слоты времени.
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
                                className="w-full flex items-center justify-center rounded-lg border border-primary/20 bg-primary/5 py-2.5 px-3 text-center text-sm font-semibold text-primary transition-all hover:bg-primary/15 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                        * Клиенты будут выбирать свободное время из этого списка для мгновенной записи.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default EventTypePreviewPage
