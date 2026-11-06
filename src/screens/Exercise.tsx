import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Star, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EngineBadge } from '@/components/EngineBadge'
import { AnalyzingView } from '@/components/AnalyzingView'
import { ResultView } from '@/components/ResultView'
import { SingStage } from '@/components/SingStage'
import { MicButton } from '@/components/MicButton'
import { midiName, useAttempt } from '@/lib/attempt'
import { layout } from '@/lib/dsp'
import { PASS_SCORE } from '@/lib/content'
import { lessonById, nextLesson, starsFor } from '@/lib/path'
import { iconByName } from '@/lib/icons'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import type { AttemptResult, LaidNote } from '@/lib/types'
import type { Go, Screen } from './types'

export function ExerciseScreen({ go, screen }: { go: Go; screen: Extract<Screen, { name: 'exercise' }> }) {
  const ex = lessonById(screen.id)!
  const { profile, sessions, recordSession } = useAuth()
  const maxSemi = Math.max(...ex.notes.map((n) => n.semi))
  const clamp = (m: number) => Math.min(74 - maxSemi, Math.max(40, m))
  const [startMidi, setStartMidi] = useState(clamp(profile?.baseline?.startMidi ?? 55))
  const [result, setResult] = useState<AttemptResult | null>(null)
  const a = useAttempt()
  const Icon = iconByName(ex.icon)
  const lay = useMemo(() => layout(ex.notes, ex.beat) as LaidNote[], [ex])
  const labels = useMemo(() => ex.notes.map((n) => midiName(startMidi + n.semi)), [ex, startMidi])
  const next = nextLesson(ex.id)

  const start = async () => {
    setResult(null)
    const r = await a.run({ notes: ex.notes, mode: 'absolute', baseMidi: startMidi, beat: ex.beat })
    if (!r) return
    setResult(r)
    if (r.res.ok) {
      try {
        const { xpGain, fresh } = await recordSession(ex.id, r.res, startMidi)
        toast.success(`+${xpGain} XP`)
        if (fresh.length) setTimeout(() => toast.success(`Новая награда: ${fresh.map((f) => f.title).join(', ')}`), 900)
      } catch (e) {
        toast.error('Результат не сохранился: ' + (e as Error).message)
      }
    }
  }

  const running = a.phase !== 'idle'
  const passed = !!result?.res.ok && result.res.score >= PASS_SCORE
  const stars = result?.res.ok ? starsFor(result.res.score) : 0

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => go({ name: 'home' })} disabled={running}>
          <ArrowLeft /> Карта
        </Button>
        <EngineBadge />
      </div>

      {a.phase === 'analyze' ? (
        <AnalyzingView stage={a.stage} />
      ) : (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-primary/15 text-primary grid size-14 place-items-center rounded-2xl">
              <Icon className="size-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{ex.title}</h1>
            <Badge variant="secondary">{ex.kind === 'drill' ? 'Упражнение' : ex.kind === 'song' ? 'Песня' : 'Финал раздела'}</Badge>
            <p className="text-muted-foreground max-w-xs text-sm">{ex.desc}</p>
            {ex.credit && <p className="text-muted-foreground text-[11px]">{ex.credit}</p>}
          </div>

          <Card className="gap-3 py-4">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setStartMidi((m) => clamp(m - 1))} disabled={running} aria-label="Ниже"><Minus /></Button>
                <div>
                  <div className="text-muted-foreground text-[11px]">Стартовая нота</div>
                  <div className="text-2xl font-bold tabular-nums">{midiName(startMidi)}</div>
                </div>
                <Button variant="outline" size="icon" onClick={() => setStartMidi((m) => clamp(m + 1))} disabled={running} aria-label="Выше"><Plus /></Button>
              </div>
              <SingStage lay={lay} live={a.live} labels={labels} />
              <div className="text-sm font-medium" style={{ minHeight: 20 }}>{a.status}</div>
            </CardContent>
          </Card>

          {a.error && (
            <Alert variant="destructive" className="text-left">
              <TriangleAlert />
              <AlertDescription>{a.error}</AlertDescription>
            </Alert>
          )}

          <MicButton phase={a.phase} count={a.count} live={a.live} onClick={start} disabled={running} label={result ? 'Ещё раз' : 'Начать'} />
          <p className="text-muted-foreground -mt-3 text-xs">Зачёт — от {PASS_SCORE} баллов. Лучше в наушниках.</p>

          {result?.res.ok && (
            <Card className={cn('py-4', passed ? 'border-success/50 bg-success/5' : 'border-warning/40 bg-warning/5')}>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <Star key={s} className={cn('size-7', s <= stars ? 'fill-amber-400 text-amber-400' : 'text-zinc-600')} />
                  ))}
                </div>
                <p className="font-semibold">{passed ? 'Урок сдан!' : `Нужно ${PASS_SCORE}+, чтобы пройти дальше`}</p>
                {passed && next && (
                  <Button className="w-full" onClick={() => go({ name: 'exercise', id: next.id })}>
                    <Check /> Следующий: {next.title} <ArrowRight />
                  </Button>
                )}
                {passed && !next && <Button className="w-full" onClick={() => go({ name: 'home' })}>К карте</Button>}
              </CardContent>
            </Card>
          )}

          {result && <ResultView result={result} sessions={sessions.map((s) => ({ exercise_id: s.exercise_id, score: s.score }))} />}
        </>
      )}
    </div>
  )
}
