// Типизированный доступ к контенту (данные лежат в exercises.js и songs.js, чтобы их читали и тесты Node)
import * as C from './exercises.js'
import type { Achievement, Lesson, Song, Unit } from './types'

export const BEAT: number = C.BEAT
export const TEST_BASE_MIDI: number = C.TEST_BASE_MIDI
export const PASS_SCORE: number = C.PASS_SCORE
export const STAR_SCORES: number[] = C.STAR_SCORES
export const TEST = C.TEST as unknown as Song
export const UNITS = C.UNITS as unknown as Unit[]
export const EXERCISES = C.EXERCISES as unknown as Lesson[]
export const ACHIEVEMENTS = C.ACHIEVEMENTS as unknown as Achievement[]
