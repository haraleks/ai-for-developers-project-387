import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>404</CardTitle>
          <CardDescription>Страница не найдена.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              На главную
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export default NotFoundPage
