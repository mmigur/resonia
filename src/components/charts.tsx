import { useEffect, useRef } from 'react'
import { hzToMidi, median } from '@/lib/dsp'
import type { Analysis, Frame, LaidNote } from '@/lib/types'

const COL = { grid: 'rgba(255,255,255,.07)', voice: '#f472b6', good: 'rgba(52,211,153,.4)', warn: 'rgba(251,191,36,.4)', miss: 'rgba(139,92,246,.4)', line: '#a78bfa', dash: 'rgba(167,139,250,.7)' }

function setup(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  const g = canvas.getContext('2d')!
  g.scale(dpr, dpr)
  g.clearRect(0, 0, w, h)
  return { g, w, h }
}

function useRedraw(draw: (c: HTMLCanvasElement) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    draw(c)
    const ro = new ResizeObserver(() => draw(c))
    ro.observe(c)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

export function PitchChart({ lay, frames, res }: { lay: LaidNote[]; frames: Frame[]; res: Analysis }) {
  const ref = useRedraw(
    (canvas) => {
      const { g, w, h } = setup(canvas)
      const semis = lay.map((n) => n.semi)
      const lo = Math.min(...semis) - 2
      const hi = Math.max(...semis) + 2
      const last = lay[lay.length - 1]
      const tmax = last.start + last.dur + 0.4
      const X = (t: number) => 12 + (t / tmax) * (w - 24)
      const Y = (s: number) => h - 14 - ((s - lo) / (hi - lo)) * (h - 28)

      g.strokeStyle = COL.grid
      g.lineWidth = 1
      for (let s = Math.ceil(lo); s <= hi; s++) {
        g.beginPath()
        g.moveTo(12, Y(s))
        g.lineTo(w - 12, Y(s))
        g.stroke()
      }
      lay.forEach((n, i) => {
        const p = res.perNote[i]
        g.fillStyle = p && p.hit ? ((p.score ?? 0) > 0.7 ? COL.good : COL.warn) : COL.miss
        const x0 = X(n.start + 0.03)
        const x1 = X(n.start + n.dur - 0.03)
        const half = (Y(n.semi - 0.25) - Y(n.semi + 0.25)) / 2
        g.beginPath()
        g.roundRect(x0, Y(n.semi) - half, x1 - x0, half * 2, 6)
        g.fill()
      })
      const medSemi = median(semis)
      g.fillStyle = COL.voice
      frames.forEach((fr) => {
        if (fr.conf < 0.6 || fr.f < 60 || fr.f > 1200) return
        let m = hzToMidi(fr.f) - res.tonicMidi
        m -= 12 * Math.round((m - medSemi) / 12)
        if (m < lo - 1 || m > hi + 1) return
        g.beginPath()
        g.arc(X(fr.t), Y(m), 2.4, 0, Math.PI * 2)
        g.fill()
      })
    },
    [lay, frames, res]
  )
  return <canvas ref={ref} className="bg-secondary/50 block h-48 w-full rounded-lg" />
}

export function LineChart({ values, reference }: { values: number[]; reference?: number | null }) {
  const ref = useRedraw(
    (canvas) => {
      const { g, w, h } = setup(canvas)
      const X = (i: number) => 16 + (values.length === 1 ? (w - 32) / 2 : (i / (values.length - 1)) * (w - 32))
      const Y = (v: number) => h - 16 - (v / 100) * (h - 32)
      g.strokeStyle = COL.grid
      ;[0, 25, 50, 75, 100].forEach((v) => {
        g.beginPath()
        g.moveTo(16, Y(v))
        g.lineTo(w - 16, Y(v))
        g.stroke()
      })
      if (reference != null) {
        g.setLineDash([5, 5])
        g.strokeStyle = COL.dash
        g.beginPath()
        g.moveTo(16, Y(reference))
        g.lineTo(w - 16, Y(reference))
        g.stroke()
        g.setLineDash([])
      }
      g.strokeStyle = COL.line
      g.lineWidth = 2.5
      g.lineJoin = 'round'
      g.beginPath()
      values.forEach((v, i) => (i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))))
      g.stroke()
      g.fillStyle = '#fff'
      values.forEach((v, i) => {
        g.beginPath()
        g.arc(X(i), Y(v), 3.5, 0, Math.PI * 2)
        g.fill()
      })
    },
    [values, reference]
  )
  return <canvas ref={ref} className="bg-secondary/50 block h-44 w-full rounded-lg" />
}
