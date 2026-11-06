import { Dumbbell, ChartNoAxesColumn, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavKey = 'home' | 'progress' | 'awards' | 'profile'
const ITEMS = [
  { key: 'home', label: 'Тренировки', Icon: Dumbbell },
  { key: 'progress', label: 'Прогресс', Icon: ChartNoAxesColumn },
  { key: 'awards', label: 'Награды', Icon: Trophy },
  { key: 'profile', label: 'Профиль', Icon: User },
] as const

export function BottomNav({ active, onNavigate }: { active: NavKey | null; onNavigate: (k: NavKey) => void }) {
  return (
    <nav className="bg-background/90 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-md">
        {ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={cn('text-muted-foreground flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] transition-colors', active === key && 'text-primary')}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
