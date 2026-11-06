import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart } from '@/components/charts'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { RADAR_AXES } from '@/lib/metrics'
import { useAuth } from '@/lib/auth'
import { calcStreak, dayKey } from '@/lib/progress'

export function ProgressScreen() {
  const { profile, sessions } = useAuth()
  const [tab, setTab] = useState<'score' | (typeof RADAR_AXES)[number]['key']>('score')
  const series = sessions.slice(-20).map((s) => (tab === 'score' ? s.score : s.metrics ? s.metrics[tab] : null))
  const scores = series.filter((v): v is number => v !== null)
  const baseRef = tab === 'score' ? profile?.baseline?.score ?? null : profile?.baseline?.metrics?.[tab] ?? null
  const avg = sessions.length ? Math.round(sessions.reduce((a, b) => a + b.score, 0) / sessions.length) : 0
  const best = sessions.length ? Math.max(...sessions.map((s) => s.score)) : 0
  const days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { label: d.toLocaleDateString('ru', { weekday: 'short' }), n: sessions.filter((s) => dayKey(s.created_at) === dayKey(d)).length }
  })
  const maxN = Math.max(1, ...days.map((d) => d.n))

  const stats: [string, string][] = [
    [String(sessions.length), 'занятий'],
    [String(calcStreak(sessions)), 'дней подряд'],
    [avg ? String(avg) : '—', 'средний балл'],
    [best ? String(best) : '—', 'лучший балл'],
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Прогресс</h1>
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(([v, l]) => (
          <Card key={l} className="gap-1 py-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{v}</div>
            <div className="text-muted-foreground text-xs">{l}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика</CardTitle>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {([{ key: 'score', label: 'Баллы' }, ...RADAR_AXES] as { key: typeof tab; label: string }[]).map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn('cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors', tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{t.label}</button>
            ))}
          </div>
          {baseRef !== null && <CardDescription>Пунктир — результат стартового теста ({baseRef}).</CardDescription>}
        </CardHeader>
        <CardContent>
          {scores.length ? (
            <LineChart values={scores} reference={baseRef} />
          ) : (
            <p className="text-muted-foreground text-sm">Пока нет данных. Выполни упражнение — здесь появится график.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Активность за неделю</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-end gap-2">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={d.n ? 'bg-primary w-full rounded-md' : 'bg-secondary w-full rounded-md'}
                  style={{ height: Math.max(6, (d.n / maxN) * 64) }}
                />
                <span className="text-muted-foreground text-[11px]">{d.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
