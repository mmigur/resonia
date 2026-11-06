import { useEffect } from 'react'
import { Check, Lock, Star } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { iconByName } from '@/lib/icons'
import { cn } from '@/lib/utils'
import type { NodeStatus, PathLesson, PathUnit } from '@/lib/path'
import type { Lesson } from '@/lib/types'

const W = 300
const PITCH = 152
const OFFSETS = [0, -54, -76, -54, 0, 54, 76, 54]

const center = (i: number) => ({ x: W / 2 + OFFSETS[i % OFFSETS.length], y: i * PITCH + PITCH / 2 - 6 })

function Track({ unit, lessons }: { unit: PathUnit['unit']; lessons: PathLesson[] }) {
  const paths = lessons.slice(0, -1).map((l, i) => {
    const a = center(i)
    const b = center(i + 1)
    const d = `M${a.x} ${a.y} C${a.x} ${a.y + PITCH * 0.55}, ${b.x} ${b.y - PITCH * 0.55}, ${b.x} ${b.y}`
    return { d, done: l.status === 'done' }
  })
  return (
    <svg width={W} height={lessons.length * PITCH} className="pointer-events-none absolute inset-0" aria-hidden>
      {paths.map((p, i) => (
        <g key={i}>
          <path d={p.d} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" strokeLinecap="round" />
          {p.done && <path d={p.d} fill="none" stroke={unit.color} strokeWidth="12" strokeLinecap="round" opacity=".9" />}
        </g>
      ))}
    </svg>
  )
}

function Node({ pl, color, i, onOpen }: { pl: PathLesson; color: string; i: number; onOpen: (l: Lesson, status: NodeStatus) => void }) {
  const { lesson, status, stars } = pl
  const big = lesson.kind !== 'drill'
  const size = big ? 90 : 76
  const c = center(i)
  const Icon = iconByName(lesson.icon)
  const locked = status === 'locked'
  return (
    <div className="absolute" style={{ left: c.x - size / 2, top: c.y - size / 2, width: size }} id={`node-${lesson.id}`}>
      {status === 'current' && (
        <div className="absolute -top-11 left-1/2 z-20 -translate-x-1/2 animate-bounce">
          <div className="relative rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold tracking-wide whitespace-nowrap text-zinc-900 shadow-lg">
            НАЧАТЬ
            <span className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => onOpen(lesson, status)}
        aria-label={`${lesson.title}${locked ? ' (закрыто)' : ''}`}
        className="relative grid w-full cursor-pointer place-items-center rounded-full text-white transition-transform active:translate-y-1 active:shadow-none"
        style={{
          height: size,
          background: locked ? '#2a2644' : color,
          boxShadow: locked ? '0 6px 0 #1b1830' : `0 6px 0 rgba(0,0,0,.38)`,
        }}
      >
        {status === 'current' && <span className="ring-pulse absolute inset-0 rounded-full border-4" style={{ borderColor: color }} />}
        {locked ? <Lock className="size-7 text-zinc-500" /> : <Icon className={big ? 'size-10' : 'size-8'} />}
        {status === 'done' && (
          <span className="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full bg-emerald-400 text-zinc-900 ring-4 ring-[var(--background)]">
            <Check className="size-4" strokeWidth={3.5} />
          </span>
        )}
      </button>
      {stars > 0 && (
        <div className="absolute left-1/2 z-10 flex -translate-x-1/2 gap-0.5 rounded-full bg-[var(--background)] px-1.5 py-0.5" style={{ top: size - 8 }}>
          {[1, 2, 3].map((s) => (
            <Star key={s} className={cn('size-3.5', s <= stars ? 'fill-amber-400 text-amber-400' : 'fill-zinc-700 text-zinc-700')} />
          ))}
        </div>
      )}
      <div
        className={cn('absolute left-1/2 w-36 -translate-x-1/2 text-center text-[11px] leading-tight font-semibold', locked ? 'text-zinc-600' : 'text-foreground/85')}
        style={{ top: size + (stars > 0 ? 16 : 8) }}
      >
        {lesson.title}
      </div>
    </div>
  )
}

export function Roadmap({ units, currentId, onOpen }: { units: PathUnit[]; currentId: string | null; onOpen: (l: Lesson, status: NodeStatus) => void }) {
  useEffect(() => {
    if (!currentId) return
    const t = setTimeout(() => document.getElementById(`node-${currentId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350)
    return () => clearTimeout(t)
  }, [currentId])

  return (
    <div className="space-y-6">
      {units.map((pu, ui) => (
        <section key={pu.unit.id}>
          <div className="mb-8 overflow-hidden rounded-2xl p-4 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${pu.unit.color}, ${pu.unit.color}aa)` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <div className="text-xs font-bold tracking-wider uppercase opacity-80">Раздел {ui + 1}</div>
                <h2 className="text-xl leading-tight font-extrabold">{pu.unit.title}</h2>
                <p className="mt-0.5 text-[13px] opacity-90">{pu.unit.subtitle}</p>
              </div>
              <div className="rounded-full bg-black/25 px-2.5 py-1 text-xs font-bold tabular-nums">{pu.done}/{pu.lessons.length}</div>
            </div>
            <Progress value={(pu.done / pu.lessons.length) * 100} className="mt-3 h-1.5 bg-black/25 [&>div]:bg-white" />
          </div>
          <div className="relative mx-auto" style={{ width: W, height: pu.lessons.length * PITCH }}>
            <Track unit={pu.unit} lessons={pu.lessons} />
            {pu.lessons.map((pl, i) => (
              <Node key={pl.lesson.id} pl={pl} color={pu.unit.color} i={i} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
