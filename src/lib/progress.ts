import { ACHIEVEMENTS } from './content'
import type { Achievement, Baseline } from './types'

export type SessionLite = { id: string; score: number; created_at: string }

export const dayKey = (d: Date | string | number) => new Date(d).toLocaleDateString('sv')

export function calcStreak(sessions: { created_at: string }[]): number {
  const days = new Set(sessions.map((s) => dayKey(s.created_at)))
  const cur = new Date()
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1)
  let n = 0
  while (days.has(dayKey(cur))) {
    n++
    cur.setDate(cur.getDate() - 1)
  }
  return n
}

export function freshAchievements(
  data: { baseline: Baseline | null; sessions: SessionLite[]; xp: number },
  unlocked: Set<string>
): Achievement[] {
  const ctx = { streak: calcStreak(data.sessions) }
  return (ACHIEVEMENTS as Achievement[]).filter((a) => !unlocked.has(a.id) && a.check(data, ctx))
}

export const xpFor = (score: number) => 10 + Math.round(score / 5)
