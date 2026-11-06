import { UNITS, EXERCISES, PASS_SCORE, STAR_SCORES } from './content'
import type { FocusKey, Lesson, Unit } from './types'

export type NodeStatus = 'locked' | 'current' | 'open' | 'done'
export type PathLesson = { lesson: Lesson; status: NodeStatus; best: number; stars: 0 | 1 | 2 | 3 }
export type PathUnit = { unit: Unit; lessons: PathLesson[]; done: number }

export function starsFor(score: number): 0 | 1 | 2 | 3 {
  if (score >= STAR_SCORES[2]) return 3
  if (score >= STAR_SCORES[1]) return 2
  if (score >= STAR_SCORES[0]) return 1
  return 0
}

/**
 * Дорожная карта: уроки идут по порядку, урок открывается, когда сдан предыдущий (≥ PASS_SCORE).
 * Если стартовый тест показал уровень выше первого, уроки разделов ниже этого уровня открыты сразу.
 */
export function computePath(sessions: { exercise_id: string; score: number }[], baseLevel: number) {
  const best = new Map<string, number>()
  for (const s of sessions) best.set(s.exercise_id, Math.max(best.get(s.exercise_id) ?? 0, s.score))
  const passed = (l: Lesson) => (best.get(l.id) ?? 0) >= PASS_SCORE

  let current: Lesson | null = null
  let prev: Lesson | null = null
  const units: PathUnit[] = UNITS.map((unit) => {
    const lessons: PathLesson[] = unit.lessons.map((lesson) => {
      const unlocked = prev === null || passed(prev) || prev.level < baseLevel
      const done = passed(lesson)
      let status: NodeStatus = done ? 'done' : unlocked ? 'open' : 'locked'
      if (!done && unlocked && current === null) {
        status = 'current'
        current = lesson
      }
      prev = lesson
      const b = best.get(lesson.id) ?? 0
      return { lesson, status, best: b, stars: starsFor(b) }
    })
    return { unit, lessons, done: lessons.filter((l) => l.status === 'done').length }
  })
  return { units, current: current as Lesson | null }
}

export const lessonById = (id: string): Lesson | undefined => EXERCISES.find((l) => l.id === id)

export function nextLesson(id: string): Lesson | null {
  const i = EXERCISES.findIndex((l) => l.id === id)
  return i >= 0 && i < EXERCISES.length - 1 ? EXERCISES[i + 1] : null
}

// Урок под слабую метрику: первый несданный с нужным focus (иначе первый с таким focus)
export function lessonForFocus(focus: FocusKey, sessions: { exercise_id: string; score: number }[]): Lesson | null {
  const passedIds = new Set(sessions.filter((s) => s.score >= PASS_SCORE).map((s) => s.exercise_id))
  const list = EXERCISES.filter((l) => l.focus === focus)
  return list.find((l) => !passedIds.has(l.id)) ?? list[0] ?? null
}
