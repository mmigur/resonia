import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { ACHIEVEMENTS } from '@/lib/content'
import { iconByName } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/lib/types'

export function AwardsScreen() {
  const { unlocked } = useAuth()
  const list = ACHIEVEMENTS as Achievement[]
  const got = list.filter((a) => unlocked.has(a.id)).length
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Награды</h1>
        <p className="text-muted-foreground text-sm">Открыто {got} из {list.length}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {list.map((a) => {
          const on = unlocked.has(a.id)
          const Icon = on ? iconByName(a.icon) : Lock
          return (
            <Card key={a.id} className={cn('items-center gap-2 px-3 py-5 text-center', !on && 'opacity-50')}>
              <div className={cn('grid size-12 place-items-center rounded-full', on ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
                <Icon className="size-6" />
              </div>
              <h3 className="text-sm font-semibold leading-tight">{a.title}</h3>
              <p className="text-muted-foreground text-xs leading-snug">{a.desc}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
