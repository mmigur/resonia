import { cn } from '@/lib/utils'
import type { Note } from '@/lib/types'

export function NoteStrip({ notes, active, labels }: { notes: Note[]; active: number; labels?: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {notes.map((n, i) => (
        <div
          key={i}
          className={cn(
            'bg-secondary text-secondary-foreground min-w-11 flex-1 rounded-lg px-1.5 py-2 text-center text-xs transition-all',
            active === i && 'bg-primary text-primary-foreground -translate-y-0.5 shadow-md'
          )}
        >
          <div className="text-sm font-semibold">{n.syl}</div>
          <div className="opacity-70">{labels ? labels[i] : n.beats > 1 ? '—' : '·'}</div>
        </div>
      ))}
    </div>
  )
}
