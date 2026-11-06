import { useEffect, useRef } from 'react'
import { LAG } from '@/lib/dsp'
import type { LivePoint, LiveState } from '@/lib/attempt'
import type { LaidNote } from '@/lib/types'

const WINDOW = 7 // секунд мелодии на экране; длинные мелодии «едут» под неподвижной линией

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
const PARTICLE_COLORS = ['#34d399', '#fbbf24', '#f472b6', '#a78bfa']

/**
 * Живая сцена пения. Ноты — полосы, играющая нота подсвечивается, во время пения светящийся
 * шар повторяет твою высоту тона в реальном времени, оставляя след. Полоса заливается зелёным,
 * пока ты держишь ноту точно, а в конце ноты вылетают искры.
 */
export function SingStage({ lay, live, labels, height = 232 }: { lay: LaidNote[]; live: { current: LiveState }; labels?: string[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const total = lay[lay.length - 1].start + lay[lay.length - 1].dur
  const scroll = total + 0.6 > WINDOW

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let raf = 0
    const semis = lay.map((n) => n.semi)
    let lo = Math.min(...semis) - 1.5
    let hi = Math.max(...semis) + 1.5
    if (hi - lo < 7) {
      const c = (hi + lo) / 2
      lo = c - 3.5
      hi = c + 3.5
    }
    const onTime: number[] = new Array(lay.length).fill(0)
    const ended: boolean[] = new Array(lay.length).fill(false)
    let particles: Particle[] = []
    let key = ''
    let last = performance.now()
    let orbY: number | null = null

    const noteAt = (tt: number) => {
      for (let i = 0; i < lay.length; i++) if (tt >= lay[i].start && tt < lay[i].start + lay[i].dur) return i
      return -1
    }
    const nearest = (tt: number) => {
      const i = noteAt(tt)
      if (i >= 0) return i
      let b = 0
      let bd = Infinity
      lay.forEach((n, k) => {
        const d = Math.abs(tt - (n.start + n.dur / 2))
        if (d < bd) {
          bd = d
          b = k
        }
      })
      return b
    }
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth
      const h = cv.clientHeight
      if (!w || !h) return
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr)
        cv.height = Math.round(h * dpr)
      }
      const g = cv.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)

      const L = live.current
      const k = L.phase + ':' + Math.round(L.t0)
      if (k !== key) {
        key = k
        onTime.fill(0)
        ended.fill(false)
        particles = []
        orbY = null
      }
      const timed = L.phase === 'listen' || L.phase === 'sing'
      const t = timed ? (now - L.t0) / 1000 : 0

      const padX = 14
      const laneTop = 18
      const laneBot = h - 46
      const Y = (s: number) => laneBot - ((s - lo) / (hi - lo)) * (laneBot - laneTop)
      let px: number
      let x0: number
      let tcam: number
      if (scroll) {
        px = (w - 2 * padX) / WINDOW
        x0 = padX + 0.25 * (w - 2 * padX)
        tcam = clamp(t, 0, total)
      } else {
        px = (w - 2 * padX) / (total + 0.6)
        x0 = padX
        tcam = -0.3
      }
      const X = (tt: number) => x0 + (tt - tcam) * px
      const barH = Math.max(12, Math.min(26, ((laneBot - laneTop) / (hi - lo)) * 0.85))

      // линии полутонов
      g.strokeStyle = 'rgba(255,255,255,.05)'
      g.lineWidth = 1
      for (let s = Math.ceil(lo); s <= Math.floor(hi); s++) {
        g.beginPath()
        g.moveTo(0, Y(s))
        g.lineTo(w, Y(s))
        g.stroke()
      }

      // свечение от громкости
      if (L.phase === 'sing' && L.level > 0.02) {
        const gx = X(t)
        const rg = g.createRadialGradient(gx, (laneTop + laneBot) / 2, 0, gx, (laneTop + laneBot) / 2, 150)
        rg.addColorStop(0, `rgba(244,114,182,${0.28 * L.level})`)
        rg.addColorStop(1, 'rgba(244,114,182,0)')
        g.fillStyle = rg
        g.fillRect(0, 0, w, h)
      }

      // ноты-полосы
      lay.forEach((n, i) => {
        const x1 = X(n.start) + 1.5
        const x2 = X(n.start + n.dur) - 1.5
        if (x2 < -30 || x1 > w + 30) return
        const bw = Math.max(4, x2 - x1)
        const y = Y(n.semi) - barH / 2
        const active = timed && t >= n.start && t < n.start + n.dur
        const past = timed && t >= n.start + n.dur
        g.save()
        if (L.phase === 'listen' && active) {
          g.shadowColor = '#a78bfa'
          g.shadowBlur = 20
          g.fillStyle = '#a78bfa'
        } else if (L.phase === 'listen' && past) g.fillStyle = 'rgba(167,139,250,.5)'
        else g.fillStyle = 'rgba(139,92,246,.30)'
        g.beginPath()
        g.roundRect(x1, y, bw, barH, 7)
        g.fill()
        g.restore()
        if (L.phase === 'sing') {
          const frac = Math.min(1, onTime[i] / n.dur)
          if (frac > 0.01) {
            g.fillStyle = 'rgba(52,211,153,.92)'
            g.beginPath()
            g.roundRect(x1, y, Math.max(6, bw * frac), barH, 7)
            g.fill()
          }
          if (past && frac < 0.55) {
            g.strokeStyle = 'rgba(251,191,36,.85)'
            g.lineWidth = 1.5
            g.beginPath()
            g.roundRect(x1, y, bw, barH, 7)
            g.stroke()
          }
        }
      })

      // линия «сейчас»
      if (timed) {
        const x = X(t)
        g.save()
        g.strokeStyle = 'rgba(244,114,182,.9)'
        g.lineWidth = 2
        g.shadowColor = '#f472b6'
        g.shadowBlur = 12
        g.beginPath()
        g.moveTo(x, laneTop - 8)
        g.lineTo(x, laneBot + 8)
        g.stroke()
        g.restore()
      }

      // отсчёт
      if (L.phase === 'countin' && L.count > 0) {
        const age = (now - L.countAt) / 1000
        const sc = 1 + 0.35 * Math.exp(-age * 6)
        g.save()
        g.translate(w / 2, (laneTop + laneBot) / 2)
        g.scale(sc, sc)
        g.fillStyle = 'rgba(255,255,255,.95)'
        g.font = '800 76px "Geist Variable", system-ui, sans-serif'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.shadowColor = '#8b5cf6'
        g.shadowBlur = 30
        g.fillText(String(L.count), 0, 0)
        g.restore()
      }

      // шар голоса, след, искры
      if (L.phase === 'sing') {
        const recent: LivePoint[] = L.pts.slice(-90)
        let tonic: number | null = L.mode === 'absolute' ? L.baseMidi : null
        if (tonic === null) {
          const d: number[] = []
          for (const p of recent) {
            const i = noteAt(p.t - LAG)
            if (i >= 0) d.push(p.midi - lay[i].semi)
          }
          if (d.length >= 3) {
            const d0 = d[0]
            const adj = d.map((v) => v - 12 * Math.round((v - d0) / 12)).sort((a, b) => a - b)
            tonic = adj[adj.length >> 1]
          }
        }
        if (tonic !== null) {
          const tn = tonic
          const toSemi = (p: LivePoint) => {
            const idx = nearest(p.t - LAG)
            const tgt = lay[idx].semi
            let r = p.midi - tn
            r -= 12 * Math.round((r - tgt) / 12)
            return { r, tgt, idx }
          }
          // след
          const trail = recent.filter((p) => t - p.t <= 1.6 && t - p.t >= 0)
          g.save()
          g.lineCap = 'round'
          g.lineJoin = 'round'
          for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1]
            const b = trail[i]
            if (b.t - a.t > 0.2) continue
            const sa = toSemi(a)
            const sb = toSemi(b)
            const age = t - b.t
            g.strokeStyle = `rgba(244,114,182,${0.85 * (1 - age / 1.6)})`
            g.lineWidth = 3.5
            g.beginPath()
            g.moveTo(X(a.t), Y(clamp(sa.r, lo - 1, hi + 1)))
            g.lineTo(X(b.t), Y(clamp(sb.r, lo - 1, hi + 1)))
            g.stroke()
          }
          g.restore()

          // шар
          const lp = recent[recent.length - 1]
          if (lp && t - lp.t < 0.3) {
            const s = toSemi(lp)
            const ty = Y(clamp(s.r, lo - 1, hi + 1))
            orbY = orbY === null ? ty : orbY + (ty - orbY) * Math.min(1, dt * 18)
            const errC = Math.abs(s.r - s.tgt) * 100
            const col = errC <= 35 ? '52,211,153' : errC <= 100 ? '251,191,36' : '244,114,182'
            if (errC <= 35) {
              const i = noteAt(t - LAG)
              if (i >= 0 && i === s.idx) onTime[i] += dt
            }
            const ox = X(t)
            const r = 8 + L.level * 10
            const rg = g.createRadialGradient(ox, orbY, 0, ox, orbY, r * 3.4)
            rg.addColorStop(0, `rgba(${col},.55)`)
            rg.addColorStop(1, `rgba(${col},0)`)
            g.fillStyle = rg
            g.beginPath()
            g.arc(ox, orbY, r * 3.4, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = `rgb(${col})`
            g.beginPath()
            g.arc(ox, orbY, r, 0, Math.PI * 2)
            g.fill()
            g.fillStyle = 'rgba(255,255,255,.85)'
            g.beginPath()
            g.arc(ox - r * 0.25, orbY - r * 0.28, r * 0.32, 0, Math.PI * 2)
            g.fill()
          }
        }
        // искры в конце удачно взятой ноты
        lay.forEach((n, i) => {
          if (!ended[i] && t > n.start + n.dur + LAG) {
            ended[i] = true
            if (onTime[i] / n.dur >= 0.55) {
              const bx = X(n.start + n.dur)
              const by = Y(n.semi)
              for (let q = 0; q < 16; q++) {
                const a = Math.random() * Math.PI * 2
                const sp = 60 + Math.random() * 110
                particles.push({ x: bx, y: by, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.8, color: PARTICLE_COLORS[q % 4] })
              }
            }
          }
        })
      }
      particles = particles.filter((p) => p.life > 0)
      for (const p of particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 240 * dt
        p.life -= dt
        g.fillStyle = p.color
        g.globalAlpha = Math.max(0, p.life / 0.8)
        g.beginPath()
        g.arc(p.x, p.y, 2.6, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1

      // слоги (караоке) и названия нот
      g.textAlign = 'center'
      g.textBaseline = 'alphabetic'
      lay.forEach((n, i) => {
        const cx = X(n.start + n.dur / 2)
        const bw = n.dur * px
        if (cx < -30 || cx > w + 30 || bw < 11) return
        const active = timed && t >= n.start && t < n.start + n.dur
        const past = timed && t >= n.start + n.dur
        let fs = 14
        g.font = `650 ${fs}px "Geist Variable", system-ui, sans-serif`
        const tw = g.measureText(n.syl).width
        if (tw > bw - 6) {
          fs = Math.max(9, Math.floor((fs * (bw - 6)) / tw))
          g.font = `650 ${fs}px "Geist Variable", system-ui, sans-serif`
        }
        g.fillStyle = active ? '#ffffff' : past ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.72)'
        g.fillText(n.syl, cx, h - 24)
        if (labels && labels[i]) {
          g.font = '500 10px "Geist Variable", system-ui, sans-serif'
          g.fillStyle = 'rgba(255,255,255,.38)'
          g.fillText(labels[i], cx, h - 9)
        }
      })
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [lay, live, labels, scroll, total])

  return (
    <canvas
      ref={ref}
      className="bg-secondary/40 block w-full rounded-xl"
      style={{
        height,
        ...(scroll ? { maskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)' } : {}),
      }}
    />
  )
}
