import { Card } from '@/components/ui/card'
import { iconByName } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { MetricCard, Status } from '@/lib/metrics'

const TONE: Record<Status, { text: string; bg: string; bar: string }> = {
  good: { text: 'text-success', bg: 'bg-success/15', bar: 'bg-success' },
  ok: { text: 'text-warning', bg: 'bg-warning/15', bar: 'bg-warning' },
  work: { text: 'text-destructive', bg: 'bg-destructive/15', bar: 'bg-destructive' },
  info: { text: 'text-primary', bg: 'bg-primary/15', bar: 'bg-primary' },
}

export function MetricList({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="space-y-2.5">
      {cards.map((c) => {
        const Icon = iconByName(c.icon)
        const tone = TONE[c.status]
        return (
          <Card key={c.key} className="gap-2.5 py-4">
            <div className="flex items-center gap-3 px-4">
              <div className={cn('grid size-9 shrink-0 place-items-center rounded-lg', tone.bg, tone.text)}>
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-sm leading-tight font-semibold">{c.title}</div>
              </div>
              <div className={cn('text-right text-base font-bold tabular-nums', tone.text)}>{c.value}</div>
            </div>
            {c.score !== null && (
              <div className="px-4">
                <div className="bg-secondary h-1.5 overflow-hidden rounded-full">
                  <div className={cn('h-full rounded-full transition-all duration-700', tone.bar)} style={{ width: `${Math.max(3, c.score)}%` }} />
                </div>
              </div>
            )}
            <p className="text-muted-foreground px-4 text-left text-[13px] leading-snug">{c.note}</p>
          </Card>
        )
      })}
    </div>
  )
}
