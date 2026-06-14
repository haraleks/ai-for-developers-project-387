import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, AlertCircle, Mail, Lock, User, ArrowLeft, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as client from '@/api/client'

function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Заполните все поля')
      return
    }
    if (password.length < 4) {
      setError('Пароль должен быть не менее 4 символов')
      return
    }
    setIsLoading(true)
    try {
      await client.register(name.trim(), email.trim(), password)
      navigate('/owner')
    } catch (err) {
      setError(err.message || 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CalendarDays className="size-6" />
          </div>
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт для управления своими календарями встреч.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                <Input
                  id="name"
                  placeholder="Иван Иванов"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Не менее 4 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  minLength={4}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Регистрация...' : (
                <><UserPlus className="mr-2 size-4" /> Зарегистрироваться</>
              )}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button asChild variant="link" className="px-0">
              <Link to="/"><ArrowLeft className="mr-1 size-3" /> На главную</Link>
            </Button>
            <Button asChild variant="link" className="px-0">
              <Link to="/login">Уже есть аккаунт? Войти</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default RegisterPage
