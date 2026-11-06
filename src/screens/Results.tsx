import { useState } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResultView } from '@/components/ResultView'
import { pendingBaseline, useAuth } from '@/lib/auth'
import type { Go, Screen } from './types'

export function ResultsScreen({ go, screen }: { go: Go; screen: Extract<Screen, { name: 'results' }> }) {
  const { userId, saveBaseline } = useAuth()
  const [saving, setSaving] = useState(false)

  const next = async () => {
    if (!userId) {
      pendingBaseline.set(screen.baseline)
      go({ name: 'auth', tab: 'register' })
      return
    }
    setSaving(true)
    try {
      const fresh = await saveBaseline(screen.baseline)
      if (fresh.length) toast.success(`Новая награда: ${fresh.map((f) => f.title).join(', ')}`)
      go({ name: 'home' })
    } catch (e) {
      toast.error('Не удалось сохранить результат: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Badge variant="secondary">Результат теста</Badge>
        <h1 className="text-2xl font-bold tracking-tight">Твой вокальный срез</h1>
      </div>
      <ResultView result={screen.result} showLevel />
      <div className="space-y-2 pt-1">
        <Button size="lg" className="w-full" onClick={next} disabled={saving}>
          {userId ? 'Сохранить и к тренировкам' : 'Продолжить'} <ArrowRight />
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => go({ name: 'test' })} disabled={saving}>
          <RotateCcw /> Пропеть ещё раз
        </Button>
      </div>
    </div>
  )
}
