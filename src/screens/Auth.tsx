import { useState } from 'react'
import { Database, MailCheck, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth, pendingBaseline } from '@/lib/auth'
import { humanizeError } from '@/lib/api'
import type { Go, Screen } from './types'

export function AuthScreen({ go, screen }: { go: Go; screen: Extract<Screen, { name: 'auth' }> }) {
  const { configured, signUp, signIn } = useAuth()
  const [tab, setTab] = useState<'register' | 'login'>(screen.tab ?? 'register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const hasPending = !!pendingBaseline.get()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (tab === 'register') {
        const r = await signUp(email, password, name || email.split('@')[0])
        if (r.needsConfirm) {
          setConfirmSent(true)
          setTab('login')
          return
        }
      } else {
        await signIn(email, password)
      }
      go({ name: 'home' })
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <Badge variant="secondary">{hasPending ? 'Шаг 2 из 2' : 'Аккаунт'}</Badge>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{tab === 'register' ? 'Создай аккаунт' : 'С возвращением'}</h1>
        <p className="text-muted-foreground text-sm">
          {tab === 'register' ? 'Сохраним твой результат и будем отслеживать прогресс.' : 'Войди, чтобы продолжить занятия.'}
        </p>
      </div>

      {!configured && (
        <Alert variant="warning">
          <Database />
          <AlertTitle>Supabase ещё не подключён</AlertTitle>
          <AlertDescription>
            <p>Создай файл .env рядом с package.json и вставь адрес проекта и публичный ключ (см. README, шаг 3). Затем перезапусти npm run dev.</p>
          </AlertDescription>
        </Alert>
      )}

      {confirmSent && (
        <Alert>
          <MailCheck />
          <AlertTitle>Проверь почту</AlertTitle>
          <AlertDescription>
            <p>Мы отправили письмо со ссылкой подтверждения. Подтверди e-mail и войди — результат теста сохранится.</p>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'register' | 'login'); setError('') }}>
        <TabsList>
          <TabsTrigger value="register">Регистрация</TabsTrigger>
          <TabsTrigger value="login">Вход</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={submit} className="space-y-4" autoComplete="on">
        {tab === 'register' && (
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={30} placeholder="Как тебя называть" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Пароль</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === 'register' ? 'new-password' : 'current-password'} placeholder="Минимум 6 символов" />
        </div>
        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !configured}>
          {busy ? 'Подождите…' : tab === 'register' ? 'Начать тренировки' : 'Войти'}
        </Button>
      </form>
    </div>
  )
}
