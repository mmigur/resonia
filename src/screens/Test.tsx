import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EngineBadge } from '@/components/EngineBadge'
import { AnalyzingView } from '@/components/AnalyzingView'
import { SingStage } from '@/components/SingStage'
import { MicButton } from '@/components/MicButton'
import { makeBaseline, useAttempt } from '@/lib/attempt'
import { layout } from '@/lib/dsp'
import { TEST, TEST_BASE_MIDI } from '@/lib/content'
import { useAuth } from '@/lib/auth'
import type { LaidNote } from '@/lib/types'
import type { Go } from './types'

const LAY = layout(TEST.notes, TEST.beat) as LaidNote[]

export function TestScreen({ go }: { go: Go }) {
  const { userId } = useAuth()
  const a = useAttempt()

  const start = async () => {
    const r = await a.run({ notes: TEST.notes, mode: 'relative', baseMidi: TEST_BASE_MIDI, beat: TEST.beat })
    if (!r) return
    if (!r.res.ok) {
      a.setError('Голос не распознан. Попробуй ещё раз: громче и ближе к микрофону.')
      return
    }
    go({ name: 'results', result: r, baseline: makeBaseline(r.res) })
  }

  if (a.phase === 'analyze') return <AnalyzingView stage={a.stage} />
  const running = a.phase !== 'idle'

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-5 text-center">
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary">{userId ? 'Повторный тест' : 'Шаг 1 из 2'}</Badge>
        <EngineBadge />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{userId ? 'Вокальный тест' : 'Узнаем твой уровень'}</h1>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
          Нажми на кнопку, послушай мелодию и пропой её. Высоту выбирай удобную — подстроимся под твой голос.
        </p>
      </div>

      <Card className="w-full gap-3 py-4">
        <CardContent className="space-y-3">
          <div>
            <div className="text-lg font-semibold">«{TEST.title}»</div>
            <div className="text-muted-foreground text-[11px]">{TEST.credit}</div>
          </div>
          <SingStage lay={LAY} live={a.live} />
          <div className="text-sm font-medium" style={{ minHeight: 20 }}>{a.status}</div>
        </CardContent>
      </Card>

      {a.error && (
        <Alert variant="destructive" className="text-left">
          <TriangleAlert />
          <AlertDescription>{a.error}</AlertDescription>
        </Alert>
      )}

      <MicButton phase={a.phase} count={a.count} live={a.live} onClick={start} disabled={running} label="Петь" />
      <p className="text-muted-foreground -mt-3 text-xs">Лучше в наушниках и в тишине</p>

      {userId ? (
        <Button variant="ghost" onClick={() => go({ name: 'profile' })} disabled={running}>Назад</Button>
      ) : (
        <Button variant="ghost" onClick={() => go({ name: 'auth', tab: 'login' })} disabled={running}>Уже есть аккаунт? Войти</Button>
      )}
    </div>
  )
}
