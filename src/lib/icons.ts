import {
  AudioLines, TrendingUp, TrendingDown, ArrowUpDown, ListMusic, Piano, Mountain, Mic, Sprout, Medal, Target, Gem, Flame, Zap, Compass, Star,
  Headphones, Guitar, Drum, Music, Waves, Rocket, Wind, Timer, Crown, Flag, Route, Milestone, Ruler, Activity, AudioWaveform, MoveVertical,
  type LucideIcon,
} from 'lucide-react'

// Иконки уроков, наград и метрик (имена приходят из exercises.js и metrics.ts)
const ICONS: Record<string, LucideIcon> = {
  AudioLines, TrendingUp, TrendingDown, ArrowUpDown, ListMusic, Piano, Mountain, Mic, Sprout, Medal, Target, Gem, Flame, Zap, Compass, Star,
  Waves, Rocket, Wind, Timer, Crown, Flag, Route, Milestone, Ruler, Activity, AudioWaveform, MoveVertical, Music,
}
export const iconByName = (name: string): LucideIcon => ICONS[name] ?? Music

// Аватары профиля (ключ хранится в БД)
export const AVATARS: Record<string, LucideIcon> = {
  mic: Mic, headphones: Headphones, guitar: Guitar, piano: Piano, drum: Drum, music: Music, star: Star, flame: Flame,
}
export const avatarIcon = (key: string): LucideIcon => AVATARS[key] ?? Mic
