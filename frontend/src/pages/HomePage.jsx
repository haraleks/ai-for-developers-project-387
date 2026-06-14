import { Link } from 'react-router-dom'
import { CalendarDays, UserRound, Users, LogIn, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { isAuthenticated, logout, getCurrentUser } from '@/api/client'
import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()
  const authed = isAuthenticated()
  const user = getCurrentUser()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

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
        <CardContent className="flex flex-col gap-3">
          {authed ? (
            <>
              <div className="text-sm text-muted-foreground mb-1">
                Вы вошли как <span className="font-semibold text-foreground">{user?.name}</span>
              </div>
              <Button asChild size="lg" className="w-full">
                <Link to="/owner">
                  <UserRound aria-hidden="true" />
                  Кабинет владельца
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleLogout}>
                Выйти
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline" className="sm:flex-1">
                <Link to="/login">
                  <LogIn aria-hidden="true" />
                  Войти
                </Link>
              </Button>
              <Button asChild size="lg" className="sm:flex-1">
                <Link to="/register">
                  <UserPlus aria-hidden="true" />
                  Регистрация
                </Link>
              </Button>
            </div>
          )}
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link to="/guest">
              <Users aria-hidden="true" />
              Записаться на встречу (гость)
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default HomePage
