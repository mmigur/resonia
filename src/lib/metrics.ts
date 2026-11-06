import type { FocusKey, Metrics, VibratoKind } from './types'
import { midiName } from './dsp'

export type Status = 'good' | 'ok' | 'work' | 'info'
export type MetricCard = {
  key: string
  icon: string // имя иконки (см. icons.ts)
  title: string
  value: string // главное значение крупно
  score: number | null // 0..100 для полоски, null — без полоски
  status: Status
  note: string // что это значит + что делать
}

const st = (v: number): Status => (v >= 80 ? 'good' : v >= 55 ? 'ok' : 'work')

export const FOCUS_TITLE: Record<FocusKey, string> = {
  accuracy: 'Точность нот',
  stability: 'Ровность звука',
  intervals: 'Интервалы и прыжки',
  attack: 'Быстрое попадание в ноту',
  endurance: 'Долгие ноты и дыхание',
}

export const RADAR_AXES: { key: FocusKey; label: string }[] = [
  { key: 'accuracy', label: 'Точность' },
  { key: 'stability', label: 'Ровность' },
  { key: 'intervals', label: 'Интервалы' },
  { key: 'attack', label: 'Вступление' },
  { key: 'endurance', label: 'Дыхание' },
]

export const metricValue = (m: Metrics, k: FocusKey): number | null => m[k]

const VIB_TEXT: Record<VibratoKind, [string, string]> = {
  steady: ['Ровный звук', 'Звук прямой, без вибрато. Для начала это хорошо: сначала точность, потом украшения.'],
  vibrato: ['Естественное вибрато', 'Лёгкие колебания высоты в нормальном темпе — признак свободного голоса. Это не ошибка.'],
  fast: ['Частое дрожание', 'Колебания слишком частые: обычно это напряжение. Расслабь горло и челюсть, дыши глубже.'],
  slow: ['Медленное покачивание', 'Тон «качается» медленно: следи, чтобы воздух шёл ровно, без волн.'],
  wide: ['Слишком широкое', 'Колебания слишком широкие и мешают попаданию. Старайся держать тон ровнее.'],
}

// Подробный разбор: от самых полезных метрик к справочным
export function describeMetrics(m: Metrics): MetricCard[] {
  const cards: MetricCard[] = []

  cards.push({
    key: 'accuracy', icon: 'Target', title: 'Точность нот', value: `${m.accuracy}`, score: m.accuracy, status: st(m.accuracy),
    note:
      m.accuracy >= 80 ? 'Ты попадаешь в большинство нот точно (допуск ±25 центов, четверть полутона).'
      : m.accuracy >= 55 ? 'Часть нот чуть мимо. Слушай эталон и «подстраивай» звук, пока он не совпадёт.'
      : 'Многие ноты мимо. Начни с коротких упражнений и пой медленнее, прислушиваясь к эталону.',
  })

  const c = m.meanCents
  cards.push({
    key: 'bias', icon: 'ArrowUpDown', title: 'Уход вверх или вниз', value: Math.abs(c) <= 15 ? 'в норме' : `${c > 0 ? '+' : '−'}${Math.abs(c)}¢`,
    score: Math.round(Math.max(0, 100 - Math.abs(c) * 1.6)), status: Math.abs(c) <= 15 ? 'good' : Math.abs(c) <= 35 ? 'ok' : 'work',
    note:
      Math.abs(c) <= 15 ? 'Ты не уходишь систематически ни вверх, ни вниз.'
      : c > 0 ? `Ты чаще поёшь выше нот (в среднем на ${c}¢). Расслабь горло и челюсть, не «тяни» голос вверх.`
      : `Ты чаще поёшь ниже нот (в среднем на ${Math.abs(c)}¢). Добавь опору дыханием и мысленно «подними» нёбо.`,
  })

  cards.push({
    key: 'stability', icon: 'Activity', title: 'Ровность звука', value: `${m.stability}`, score: m.stability, status: st(m.stability),
    note:
      m.stability >= 80 ? 'Внутри ноты высота почти не «плавает».'
      : m.stability >= 55 ? 'Тон слегка плавает внутри ноты. Выдыхай ровнее, без толчков.'
      : 'Тон заметно плавает. Потяни ноту на «м-м-м» и следи за ровным выдохом.',
  })

  if (m.intervals !== null) {
    const parts = [m.leaps !== null ? `прыжки ${m.leaps}` : null, m.steps !== null ? `шаги ${m.steps}` : null].filter(Boolean).join(' · ')
    cards.push({
      key: 'intervals', icon: 'Ruler', title: 'Точность интервалов', value: `${m.intervals}`, score: m.intervals, status: st(m.intervals),
      note:
        m.leapBias !== null && m.leapBias < -20 ? `Большие прыжки получаются «узкими»: в среднем на ${Math.abs(m.leapBias)}¢ меньше нужного. Заранее представляй верхнюю ноту, прежде чем прыгнуть.`
        : m.leapBias !== null && m.leapBias > 20 ? `Прыжки получаются «широкими»: в среднем на ${m.leapBias}¢ больше нужного. Прыгай мягче, без нажима.`
        : m.intervals >= 80 ? `Расстояния между нотами выдерживаешь хорошо${parts ? ` (${parts})` : ''}.`
        : `Расстояния между нотами пока неточные${parts ? ` (${parts})` : ''}. Попрактикуйся на терциях и квинтах.`,
    })
  }

  if (m.attack !== null && m.attackMs !== null) {
    cards.push({
      key: 'attack', icon: 'Zap', title: 'Скорость вступления', value: `${(m.attackMs / 1000).toFixed(2).replace('.', ',')} с`, score: m.attack, status: st(m.attack),
      note:
        m.attack >= 80 ? 'Ты быстро находишь ноту и сразу попадаешь в неё.'
        : m.attack >= 55 ? 'Нота находится не сразу. Мысленно пропевай её за долю секунды до вступления.'
        : 'Ты «подъезжаешь» к нотам снизу или вступаешь поздно. Заранее услышь ноту внутри и бери её сразу.',
    })
  }

  if (m.endurance !== null && m.driftCents !== null) {
    const d = m.driftCents
    cards.push({
      key: 'endurance', icon: 'Wind', title: 'Длинные ноты', value: Math.abs(d) <= 8 ? 'ровно' : `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d))}¢/с`, score: m.endurance, status: st(m.endurance),
      note:
        Math.abs(d) <= 8 ? 'Длинные ноты держишь ровно, тон не уходит.'
        : d < 0 ? `К концу долгой ноты тон «проседает» на ~${Math.abs(Math.round(d))}¢ в секунду. Не трать весь воздух сразу, держи опору до конца.`
        : `К концу долгой ноты тон «ползёт» вверх на ~${Math.round(d)}¢ в секунду. Расслабь горло, не напрягайся к концу.`,
    })
  }

  if (m.vibrato) {
    const [name, text] = VIB_TEXT[m.vibrato.kind]
    cards.push({
      key: 'vibrato', icon: 'AudioWaveform', title: 'Вибрато', value: m.vibrato.kind === 'steady' ? name : `${name} · ${m.vibrato.rate.toFixed(1).replace('.', ',')} Гц`, score: null,
      status: m.vibrato.kind === 'steady' || m.vibrato.kind === 'vibrato' ? 'info' : 'work', note: text,
    })
  }

  if (m.spanSemis !== null) {
    cards.push({
      key: 'range', icon: 'MoveVertical', title: 'Диапазон попытки', value: `${m.spanSemis} полутонов`, score: null, status: 'info',
      note: `${m.centerMidi !== null ? `Центр голоса в этой попытке — около ${midiName(m.centerMidi)}. ` : ''}Диапазон растёт с практикой; не тянись выше комфортной высоты.`,
    })
  }

  cards.push({
    key: 'coverage', icon: 'Mic', title: 'Распознано нот', value: `${m.coverage}%`, score: m.coverage, status: m.coverage >= 90 ? 'good' : m.coverage >= 70 ? 'ok' : 'work',
    note: m.coverage >= 90 ? 'Голос хорошо слышен на протяжении всей записи.' : 'Часть нот не распознана. Пой громче и увереннее, ближе к микрофону, в тишине.',
  })

  return cards
}

// Самая слабая из «тренируемых» метрик; null — всё хорошо (≥ 85)
export function weakestFocus(m: Metrics): FocusKey | null {
  let best: { k: FocusKey; v: number } | null = null
  for (const { key } of RADAR_AXES) {
    const v = m[key]
    if (v === null) continue
    if (!best || v < best.v) best = { k: key, v }
  }
  return best && best.v < 85 ? best.k : null
}

// Среднее по нескольким попыткам (по каждой метрике — только непустые значения)
export function averageMetrics(list: Metrics[]): Metrics | null {
  if (!list.length) return null
  const avg = (get: (m: Metrics) => number | null): number | null => {
    const v = list.map(get).filter((x): x is number => x !== null)
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
  }
  const last = list[list.length - 1]
  return {
    accuracy: avg((m) => m.accuracy) ?? 0,
    stability: avg((m) => m.stability) ?? 0,
    intervals: avg((m) => m.intervals),
    leaps: avg((m) => m.leaps),
    steps: avg((m) => m.steps),
    leapBias: avg((m) => m.leapBias),
    attack: avg((m) => m.attack),
    attackMs: avg((m) => m.attackMs),
    endurance: avg((m) => m.endurance),
    driftCents: avg((m) => m.driftCents),
    vibrato: last.vibrato,
    coverage: avg((m) => m.coverage) ?? 0,
    meanCents: avg((m) => m.meanCents) ?? 0,
    spanSemis: avg((m) => m.spanSemis),
    centerMidi: avg((m) => m.centerMidi),
  }
}
