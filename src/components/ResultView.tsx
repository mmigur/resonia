import { Lightbulb, MicOff, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreRing } from '@/components/ScoreRing'
import { PitchChart } from '@/components/charts'
import { MetricList } from '@/components/MetricList'
import { levelFor } from '@/lib/dsp'
import { describeMetrics, FOCUS_TITLE, weakestFocus } from '@/lib/metrics'
import { lessonForFocus } from '@/lib/path'
import { cn } from '@/lib/utils'
import type { AttemptResult } from '@/lib/types'

type Props = { result: AttemptResult; showLevel?: boolean; sessions?: { exercise_id: string; score: number }[] }

export function ResultView({ result, showLevel, sessions = [] }: Props) {
  const { res, lay, frames } = result
  if (!res.ok) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MicOff className="text-muted-foreground size-8" />
          <CardTitle>Голос не распознан</CardTitle>
          <CardDescription>Пой громче и ближе к микрофону, в тишине. Лучше в наушниках, чтобы эталон не попадал в запись.</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  const lvl = levelFor(res.score, res.stability) as { name: string }
  const m = res.metrics
  const focus = weakestFocus(m)
  const focusLesson = focus ? lessonForFocus(focus, sessions) : null

  return (
    <div className="space-y-3 text-center">
      <Card className="items-center">
        <CardContent className="space-y-2">
          <ScoreRing score={res.score} />
          {showLevel && <h2 className="text-xl font-semibold">{lvl.name}</h2>}
          <p className="text-muted-foreground text-sm">Общая точность попадания в ноты</p>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Разбор по нотам</CardTitle>
          <CardDescription>Отклонение каждой ноты в центах (100¢ = полутон)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-1.5">
            {lay.map((n, i) => {
              const p = res.perNote[i]
              const c = p?.hit ? Math.round(p.cents ?? 0) : null
              const tone = c === null ? 'bg-secondary text-muted-foreground' : Math.abs(c) <= 25 ? 'bg-success/15 text-success' : Math.abs(c) <= 60 ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive'
              return (
                <div key={i} className={cn('min-w-12 rounded-lg px-2 py-1.5 text-center', tone)}>
                  <div className="text-sm font-semibold">{n.syl}</div>
                  <div className="text-[11px] tabular-nums opacity-80">{c === null ? 'нет' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c)}¢`}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardContent className="space-y-2">
          <PitchChart lay={lay} frames={frames} res={res} />
          <p className="text-muted-foreground text-xs">Полосы — эталонные ноты (зелёная — попал, жёлтая — мимо), розовые точки — твой голос.</p>
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5 gap-2">
        <CardHeader className="items-center">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" /> Главный фокус
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {focus ? (
            <>
              <p className="font-semibold">Слабое место: {FOCUS_TITLE[focus].toLowerCase()}</p>
              {focusLesson && (
                <p className="text-muted-foreground flex items-start justify-center gap-2">
                  <Lightbulb className="text-warning mt-0.5 size-4 shrink-0" />
                  <span>Рекомендуем урок «{focusLesson.title}» — он тренирует именно это.</span>
                </p>
              )}
            </>
          ) : (
            <p>Все ключевые метрики в норме. Двигайся по карте и усложняй задачи.</p>
          )}
        </CardContent>
      </Card>

      <div className="pt-1 text-left">
        <h3 className="mb-2.5 text-center text-lg font-semibold">Подробный разбор голоса</h3>
        <MetricList cards={describeMetrics(m)} />
      </div>
    </div>
  )
}
