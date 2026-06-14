import { Link } from 'react-router-dom'
import { CalendarDays, UserRound, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CalendarDays className="size-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Calendar Booking</CardTitle>
          <CardDescription>
            Онлайн-запись на встречи. Выберите, как продолжить.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="sm:flex-1">
            <Link to="/owner">
              <UserRound aria-hidden="true" />
              Владелец
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="sm:flex-1">
            <Link to="/guest">
              <Users aria-hidden="true" />
              Гость
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default HomePage
