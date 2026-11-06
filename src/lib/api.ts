import { supabase } from './supabase'
import type { Baseline, Metrics } from './types'

export type Profile = {
  id: string
  displayName: string
  avatar: string
  goal: string
  voiceType: string
  baseline: Baseline | null
  xp: number
}
export type SessionRow = {
  id: number
  exercise_id: string
  score: number
  stability: number
  start_midi: number
  created_at: string
  metrics?: Metrics | null
}

function db() {
  if (!supabase) throw new Error('Supabase не настроен: заполни файл .env (см. README)')
  return supabase
}

export function humanizeError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/Invalid login credentials/i.test(m)) return 'Неверный e-mail или пароль'
  if (/already registered|already been registered/i.test(m)) return 'Этот e-mail уже зарегистрирован — войди'
  if (/Password should be at least/i.test(m)) return 'Пароль слишком короткий (минимум 6 символов)'
  if (/Unable to validate email|invalid email/i.test(m)) return 'Проверь адрес e-mail'
  if (/Email not confirmed/i.test(m)) return 'Подтверди e-mail по ссылке из письма и войди снова'
  if (/rate limit/i.test(m)) return 'Слишком много попыток. Подожди минуту.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Нет связи с сервером. Проверь интернет и адрес Supabase в .env'
  return m
}

export async function signUp(email: string, password: string, displayName: string) {
  const { data, error } = await db().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  // при включённой защите от перебора повторный e-mail возвращается без identities
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('User already registered')
  }
  return { userId: data.user?.id ?? null, hasSession: !!data.session }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await db().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await db().auth.signOut()
}

export async function loadAll(userId: string) {
  const c = db()
  const sel = (cols: string) => c.from('sessions').select(cols).eq('user_id', userId).order('created_at', { ascending: true })
  const [p, s0, a] = await Promise.all([
    c.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sel('id, exercise_id, score, stability, start_midi, created_at, metrics'),
    c.from('achievements').select('achievement_id').eq('user_id', userId),
  ])
  // если миграция с колонкой metrics ещё не выполнена — читаем без неё
  const s = s0.error && /metrics/i.test(s0.error.message) ? await sel('id, exercise_id, score, stability, start_midi, created_at') : s0
  if (p.error) throw p.error
  if (s.error) throw s.error
  if (a.error) throw a.error
  const r = p.data
  const profile: Profile | null = r
    ? {
        id: r.id,
        displayName: r.display_name,
        avatar: r.avatar,
        goal: r.goal,
        voiceType: r.voice_type,
        baseline: r.baseline as Baseline | null,
        xp: r.xp,
      }
    : null
  return { profile, sessions: (s.data ?? []) as unknown as SessionRow[], achievements: (a.data ?? []).map((x) => x.achievement_id as string) }
}

export async function updateProfile(
  userId: string,
  patch: Partial<{ displayName: string; avatar: string; goal: string; voiceType: string; baseline: Baseline; xp: number }>
) {
  const row: Record<string, unknown> = {}
  if (patch.displayName !== undefined) row.display_name = patch.displayName
  if (patch.avatar !== undefined) row.avatar = patch.avatar
  if (patch.goal !== undefined) row.goal = patch.goal
  if (patch.voiceType !== undefined) row.voice_type = patch.voiceType
  if (patch.baseline !== undefined) row.baseline = patch.baseline
  if (patch.xp !== undefined) row.xp = patch.xp
  const { error } = await db().from('profiles').update(row).eq('id', userId)
  if (error) throw error
}

export async function addSession(userId: string, s: { exerciseId: string; score: number; stability: number; startMidi: number; metrics?: Metrics }) {
  const base = { user_id: userId, exercise_id: s.exerciseId, score: s.score, stability: s.stability, start_midi: s.startMidi }
  const cols = 'id, exercise_id, score, stability, start_midi, created_at'
  let r = await db().from('sessions').insert({ ...base, metrics: s.metrics ?? null }).select(cols + ', metrics').single()
  if (r.error && /metrics/i.test(r.error.message)) {
    // колонки metrics ещё нет (не выполнена миграция) — сохраняем без неё
    r = (await db().from('sessions').insert(base).select(cols).single()) as typeof r
  }
  if (r.error) throw r.error
  return { ...(r.data as unknown as SessionRow), metrics: s.metrics ?? null }
}

export async function unlockAchievements(userId: string, ids: string[]) {
  if (!ids.length) return
  const { error } = await db()
    .from('achievements')
    .upsert(ids.map((id) => ({ user_id: userId, achievement_id: id })), { onConflict: 'user_id,achievement_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function deleteAccount() {
  const { error } = await db().rpc('delete_my_account')
  if (error) throw error
  await db().auth.signOut()
}
