import { useEffect, useState } from 'react'
import { Cpu, TriangleAlert, LoaderCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { engine, onEngineChange } from '@/lib/spice'

export function EngineBadge() {
  const [s, setS] = useState<string>(engine.status)
  useEffect(() => onEngineChange(setS), [])
  if (s === 'ready')
    return (
      <Badge variant="success">
        <Cpu /> SPICE готова
      </Badge>
    )
  if (s === 'failed')
    return (
      <Badge variant="warning">
        <TriangleAlert /> Упрощённый режим
      </Badge>
    )
  return (
    <Badge variant="secondary">
      <LoaderCircle className="animate-spin" /> Загрузка SPICE
    </Badge>
  )
}
