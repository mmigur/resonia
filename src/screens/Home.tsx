import { Flame, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Roadmap } from '@/components/Roadmap'
import { useAuth } from '@/lib/auth'
import { calcStreak } from '@/lib/progress'
import { avatarIcon } from '@/lib/icons'
import { midiName } from '@/lib/attempt'
import { computePath } from '@/lib/path'
import { PASS_SCORE } from '@/lib/content'
import type { Go } from './types'

export function HomeScreen({ go }: { go: Go }) {
  const { profile, sessions } = useAuth()
  if (!profile) return null
  const Avatar = avatarIcon(profile.avatar)
  const streak = calcStreak(sessions)
  const base = profile.baseline?.levelIdx ?? 1
  const { units, current } = computePath(sessions, Math.max(1, Math.min(3, base)))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-primary/15 text-primary grid size-12 place-items-center rounded-full">
          <Avatar className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">Привет,</p>
          <h1 className="truncate text-xl font-bold tracking-tight">{profile.displayName}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="warning"><Flame /> {streak} дн.</Badge>
          <Badge variant="secondary"><Zap /> {profile.xp} XP</Badge>
        </div>
      </div>

      {profile.baseline ? (
        <Card className="py-4">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Твой уровень</p>
              <p className="font-semibold">{profile.baseline.level}</p>
            </div>
            <Badge variant="outline">Старт: {midiName(profile.baseline.startMidi)}</Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-4">
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm">Ты ещё не проходил вокальный тест.</p>
            <Button size="sm" onClick={() => go({ name: 'test' })}>Пройти тест</Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <h2 className="text-lg font-semibold">Путь голоса</h2>
        <p className="text-muted-foreground text-xs">Набери {PASS_SCORE}+, чтобы открыть следующий урок</p>
      </div>

      <Roadmap
        units={units}
        currentId={current?.id ?? null}
        onOpen={(l, status) => (status === 'locked' ? toast('Сначала сдай предыдущий урок', { description: `Нужно набрать ${PASS_SCORE}+ баллов` }) : go({ name: 'exercise', id: l.id }))}
      />
    </div>
  )
}
