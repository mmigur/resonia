import { useCallback, useRef, useState } from 'react'
import { layout, totalDur, analyze, levelFor, midiName, hzToMidi } from './dsp'
import { getCtx, getMic, playMelody, countIn, recordFor } from './audio'
import { pitchFrames } from './spice'
import { BEAT } from './content'
import type { Analysis, AttemptResult, Baseline, LaidNote, Note, Range } from './types'

export type Phase = 'idle' | 'listen' | 'countin' | 'sing' | 'analyze'

// «Живое» состояние попытки: меняется очень часто, поэтому лежит в ref, а не в React-state.
// Его читает canvas-сцена (SingStage) и круглая кнопка (MicButton) в requestAnimationFrame.
export type LivePoint = { t: number; midi: number; conf: number }
export type LiveState = {
  phase: Phase
  t0: number // performance.now(), когда t = 0 для текущей фазы (listen или sing)
  count: number // 3, 2, 1 во время отсчёта, иначе 0
  countAt: number // performance.now() последнего «тика» отсчёта
  level: number // громкость 0..1
  pts: LivePoint[] // история высоты тона за время пения
  mode: 'relative' | 'absolute'
  baseMidi: number
}
export const makeLive = (): LiveState => ({
  phase: 'idle', t0: 0, count: 0, countAt: 0, level: 0, pts: [], mode: 'relative', baseMidi: 60,
})

// Этапы экрана загрузки после пения
export const ANALYZE_STEPS = [
  'Обрабатываем запись',
  'Определяем высоту тона (SPICE)',
  'Сравниваем с эталоном',
  'Считаем метрики голоса',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Opts = { notes: Note[]; mode: 'relative' | 'absolute'; baseMidi: number; beat?: number }

export function micError(e: unknown): string {
  const err = e as { name?: string; message?: string }
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError')
    return 'Нет доступа к микрофону. Разреши его в настройках браузера и попробуй снова.'
  if (err?.name === 'NotFoundError') return 'Микрофон не найден.'
  return 'Не удалось записать: ' + (err?.message ?? String(e))
}

export function useAttempt() {
  const live = useRef<LiveState>(makeLive())
  const [phase, setPhaseState] = useState<Phase>('idle')
  const [status, setStatus] = useState('')
  const [count, setCount] = useState(0)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')
  const busy = useRef(false)

  const setPhase = (p: Phase) => {
    live.current.phase = p
    setPhaseState(p)
  }

  const run = useCallback(async ({ notes, mode, baseMidi, beat = BEAT }: Opts): Promise<AttemptResult | null> => {
    if (busy.current) return null
    busy.current = true
    setError('')
    setStage(0)
    const L = live.current
    L.pts = []
    L.level = 0
    L.mode = mode
    L.baseMidi = baseMidi
    try {
      const lay = layout(notes, beat) as LaidNote[]
      getCtx() // разблокировать аудио по жесту пользователя
      setStatus('Разреши доступ к микрофону…')
      await getMic()

      setPhase('listen')
      setStatus('Слушай эталон')
      await playMelody(lay, baseMidi, undefined, (perfMs: number) => {
        L.t0 = perfMs
      })

      setPhase('countin')
      setStatus('Приготовься…')
      await countIn(3, beat, (n: number) => {
        L.count = 4 - n
        L.countAt = performance.now()
        setCount(4 - n)
      })
      L.count = 0
      setCount(0)

      setPhase('sing')
      setStatus('Пой!')
      const samples: Float32Array = await recordFor(totalDur(lay) + 0.5, {
        onStart: (perfMs: number) => {
          L.t0 = perfMs
        },
        onLevel: (rms: number) => {
          // сглаживание: быстро растёт, медленно спадает
          const v = Math.min(1, rms * 6)
          L.level = v > L.level ? v : L.level * 0.8 + v * 0.2
        },
        onPitch: (p: { t: number; f: number; conf: number }) => {
          if (p.f > 0 && p.conf >= 0.6 && p.f >= 60 && p.f <= 1200) L.pts.push({ t: p.t, midi: hzToMidi(p.f), conf: p.conf })
        },
      })
      L.level = 0

      // ---- экран загрузки: реальные этапы + минимальная длительность, чтобы анимация читалась ----
      setPhase('analyze')
      setStatus('')
      setStage(0)
      await sleep(700)
      setStage(1)
      const [frames] = await Promise.all([pitchFrames(samples), sleep(1500)])
      setStage(2)
      await sleep(700)
      const res = analyze({ frames, lay, mode, startMidi: baseMidi }) as unknown as Analysis
      setStage(3)
      await sleep(700)
      setStage(4)
      await sleep(250)
      return { lay, frames, res }
    } catch (e) {
      setError(micError(e))
      return null
    } finally {
      busy.current = false
      L.count = 0
      L.level = 0
      setCount(0)
      setPhase('idle')
      setStatus('')
    }
  }, [])

  return { live, phase, status, count, stage, error, setError, run }
}

export function makeBaseline(res: Analysis): Baseline {
  const lvl = levelFor(res.score, res.stability)
  return {
    ts: Date.now(),
    score: res.score,
    stability: res.stability,
    level: lvl.name,
    levelIdx: lvl.idx,
    startMidi: Math.round(res.tonicMidi),
    range: res.range,
    metrics: res.metrics,
  }
}

export function rangeText(range?: Range | null): string {
  if (!range || !isFinite(range.lo) || !isFinite(range.hi)) return '—'
  return `${midiName(range.lo)}–${midiName(range.hi)}`
}

export { midiName }
