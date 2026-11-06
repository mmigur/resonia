export type Note = { semi: number; beats: number; syl: string }
export type LaidNote = Note & { start: number; dur: number }
export type Frame = { t: number; f: number; conf: number }
export type Range = { lo: number; hi: number }

export type VibratoKind = 'steady' | 'vibrato' | 'fast' | 'slow' | 'wide'
export type Vibrato = { rate: number; extent: number; kind: VibratoKind }

// Все оценки 0..100 (больше = лучше); null — по этой записи метрику посчитать нельзя
export type Metrics = {
  accuracy: number
  stability: number
  intervals: number | null
  leaps: number | null
  steps: number | null
  leapBias: number | null // центы; < 0 — прыжки «узкие», > 0 — «широкие»
  attack: number | null
  attackMs: number | null
  endurance: number | null
  driftCents: number | null // центы в секунду; < 0 — тон «проседает»
  vibrato: Vibrato | null
  coverage: number
  meanCents: number
  spanSemis: number | null
  centerMidi: number | null
}

export type PerNote = {
  semi: number
  hit: boolean
  midi?: number
  stdCents?: number
  cents?: number | null
  score?: number
  target?: number
}
export type Analysis = {
  ok: boolean
  score: number
  stability: number
  meanCents: number
  tonicMidi: number
  range: Range
  perNote: PerNote[]
  hitRatio: number
  voicedRatio: number
  metrics: Metrics
}
export type Baseline = {
  ts: number
  score: number
  stability: number
  level: string
  levelIdx: number
  startMidi: number
  range: Range
  metrics?: Metrics
}

export type FocusKey = 'accuracy' | 'stability' | 'intervals' | 'attack' | 'endurance'
export type Lesson = {
  id: string
  unit: string
  level: number
  kind: 'drill' | 'song' | 'boss'
  focus: FocusKey
  icon: string
  title: string
  desc: string
  credit?: string
  beat: number
  notes: Note[]
}
export type Unit = { id: string; title: string; subtitle: string; color: string; level: number; lessons: Lesson[] }
export type Song = { id: string; title: string; credit: string; beat: number; notes: Note[] }

export type Achievement = {
  id: string
  icon: string
  title: string
  desc: string
  check: (d: { baseline: Baseline | null; sessions: { id: string; score: number }[]; xp: number }, c: { streak: number }) => boolean
}
export type AttemptResult = { lay: LaidNote[]; frames: Frame[]; res: Analysis }
