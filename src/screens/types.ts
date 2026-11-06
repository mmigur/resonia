import type { AttemptResult, Baseline } from '@/lib/types'

export type Screen =
  | { name: 'splash' }
  | { name: 'test' }
  | { name: 'results'; result: AttemptResult; baseline: Baseline }
  | { name: 'auth'; tab?: 'register' | 'login' }
  | { name: 'home' }
  | { name: 'exercise'; id: string }
  | { name: 'progress' }
  | { name: 'awards' }
  | { name: 'profile' }

export type Go = (s: Screen) => void
