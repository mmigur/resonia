import { useEffect, useRef } from 'react'
import { Ear, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LiveState, Phase } from '@/lib/attempt'

/**
 * Круглая кнопка записи. В покое «дышит» кольцами, при прослушивании показывает ухо,
 * на отсчёте — число, а пока ты поёшь, кольца расходятся в такт громкости голоса.
 */
export function MicButton({
  phase, count, live, onClick, disabled, label = 'Начать',
}: { phase: Phase; count: number; live: { current: LiveState }; onClick: () => void; disabled?: boolean; label?: string }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    let v = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const target = live.current.phase === 'sing' ? live.current.level : 0
      v += (target - v) * 0.3
      root.current?.style.setProperty('--lvl', v.toFixed(3))
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [live])

  const singing = phase === 'sing'
  return (
    <div ref={root} className="relative mx-auto grid size-44 place-items-center" style={{ ['--lvl' as string]: 0 }}>
      {phase === 'idle' && (
        <>
          <span className="ring-pulse border-primary absolute size-24 rounded-full border-2" />
          <span className="ring-pulse border-primary absolute size-24 rounded-full border-2" style={{ animationDelay: '1s' }} />
        </>
      )}
      {phase === 'listen' && <span className="ring-pulse border-violet-400 absolute size-24 rounded-full border-2" />}
      {singing &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute size-24 rounded-full border-2 border-pink-400"
            style={{
              transform: `scale(calc(1.1 + var(--lvl) * ${0.3 + i * 0.18}))`,
              opacity: `calc(${0.6 - i * 0.16} + var(--lvl) * 0.3)`,
            }}
          />
        ))}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'relative z-10 grid size-24 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg transition-transform active:scale-95 disabled:cursor-default',
          singing && 'shadow-[0_0_44px_rgba(244,114,182,.65)]'
        )}
        style={singing ? { transform: 'scale(calc(1 + var(--lvl) * 0.14))' } : undefined}
      >
        {phase === 'countin' && count > 0 ? (
          <span className="text-4xl leading-none font-extrabold tabular-nums">{count}</span>
        ) : phase === 'listen' ? (
          <Ear className="size-9 animate-pulse" />
        ) : (
          <Mic className={cn('size-10', singing && 'animate-pulse')} />
        )}
      </button>
    </div>
  )
}
