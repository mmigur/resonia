import { Check, LoaderCircle, Circle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Logo } from '@/components/Logo'
import { ANALYZE_STEPS } from '@/lib/attempt'
import { cn } from '@/lib/utils'

const PROGRESS = [8, 30, 65, 90, 100]
const BARS = [0.5, 0.9, 0.65, 1, 0.7, 0.95, 0.55, 0.8, 0.45]

// Экран загрузки после пения: пульсирующий логотип, «эквалайзер», шаги анализа.
export function AnalyzingView({ stage }: { stage: number }) {
  return (
    <Card className="items-center overflow-hidden text-center">
      <CardContent className="flex w-full flex-col items-center gap-6 py-4">
        <div className="relative mt-2 grid size-28 place-items-center">
          <span className="ring-pulse border-primary absolute inset-0 rounded-full border-2" />
          <span className="ring-pulse border-primary absolute inset-0 rounded-full border-2" style={{ animationDelay: '1s' }} />
          <Logo size={72} />
        </div>

        <div className="flex h-12 items-center gap-1.5" aria-hidden>
          {BARS.map((h, i) => (
            <span
              key={i}
              className="eq-bar bg-primary/80 w-1.5 rounded-full"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Анализируем твой голос</h2>
          <p className="text-muted-foreground text-sm">Это займёт несколько секунд</p>
        </div>

        <Progress value={PROGRESS[Math.min(stage, PROGRESS.length - 1)]} className="w-full" />

        <ul className="w-full space-y-2.5 text-left text-sm">
          {ANALYZE_STEPS.map((label, i) => {
            const done = stage > i
            const active = stage === i
            return (
              <li key={label} className={cn('flex items-center gap-3 transition-opacity', !done && !active && 'opacity-40')}>
                {done ? (
                  <Check className="text-success size-4" />
                ) : active ? (
                  <LoaderCircle className="text-primary size-4 animate-spin" />
                ) : (
                  <Circle className="size-4" />
                )}
                <span className={cn(active && 'font-medium')}>{label}</span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
