import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from './supabase'
import * as api from './api'
import type { Profile, SessionRow } from './api'
import { freshAchievements, xpFor } from './progress'
import type { Achievement, Analysis, Baseline } from './types'

const PENDING_KEY = 'resonia_pending_baseline'
export const pendingBaseline = {
  get(): Baseline | null {
    try {
      return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null')
    } catch {
      return null
    }
  },
  set(b: Baseline) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(b))
  },
  clear() {
    localStorage.removeItem(PENDING_KEY)
  },
}

type AuthState = {
  ready: boolean
  configured: boolean
  userId: string | null
  email: string
  profile: Profile | null
  sessions: SessionRow[]
  unlocked: Set<string>
  signUp: (email: string, password: string, name: string) => Promise<{ needsConfirm: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  saveProfile: (patch: Partial<{ displayName: string; avatar: string; goal: string; voiceType: string }>) => Promise<void>
  saveBaseline: (b: Baseline) => Promise<Achievement[]>
  recordSession: (exerciseId: string, res: Analysis, startMidi: number) => Promise<{ xpGain: number; fresh: Achievement[] }>
  removeAccount: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth вне AuthProvider')
  return v
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabaseConfigured)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())

  const reset = useCallback(() => {
    setUserId(null)
    setEmail('')
    setProfile(null)
    setSessions([])
    setUnlocked(new Set())
  }, [])

  // Загружает данные пользователя; если есть отложенный тест (пройден до регистрации) — сохраняет его.
  const load = useCallback(async (uid: string) => {
    const d = await api.loadAll(uid)
    let prof = d.profile
    let ach = new Set(d.achievements)
    const pending = pendingBaseline.get()
    if (prof && !prof.baseline && pending) {
      await api.updateProfile(uid, { baseline: pending })
      prof = { ...prof, baseline: pending }
      pendingBaseline.clear()
      const fresh = freshAchievements({ baseline: pending, sessions: d.sessions.map((s) => ({ id: s.exercise_id, score: s.score, created_at: s.created_at })), xp: prof.xp }, ach)
      if (fresh.length) {
        await api.unlockAchievements(uid, fresh.map((a) => a.id))
        ach = new Set([...ach, ...fresh.map((a) => a.id)])
      }
    }
    setProfile(prof)
    setSessions(d.sessions)
    setUnlocked(ach)
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session
      if (s && alive) {
        setUserId(s.user.id)
        setEmail(s.user.email ?? '')
        await load(s.user.id).catch((e) => console.error('load:', e))
      }
      if (alive) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') reset()
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [load, reset])

  const signUp: AuthState['signUp'] = useCallback(
    async (em, pw, name) => {
      const r = await api.signUp(em.trim(), pw, name.trim())
      if (!r.hasSession || !r.userId) return { needsConfirm: true }
      setUserId(r.userId)
      setEmail(em.trim())
      await load(r.userId)
      return { needsConfirm: false }
    },
    [load]
  )

  const signIn: AuthState['signIn'] = useCallback(
    async (em, pw) => {
      const u = await api.signIn(em.trim(), pw)
      setUserId(u.id)
      setEmail(u.email ?? em.trim())
      await load(u.id)
    },
    [load]
  )

  const signOut = useCallback(async () => {
    await api.signOut()
    reset()
  }, [reset])

  const saveProfile: AuthState['saveProfile'] = useCallback(
    async (patch) => {
      if (!userId || !profile) return
      await api.updateProfile(userId, patch)
      setProfile({ ...profile, ...patch })
    },
    [userId, profile]
  )

  const lite = (list: SessionRow[]) => list.map((s) => ({ id: s.exercise_id, score: s.score, created_at: s.created_at }))

  const saveBaseline: AuthState['saveBaseline'] = useCallback(
    async (b) => {
      if (!userId || !profile) return []
      await api.updateProfile(userId, { baseline: b })
      const next = { ...profile, baseline: b }
      const fresh = freshAchievements({ baseline: b, sessions: lite(sessions), xp: profile.xp }, unlocked)
      if (fresh.length) await api.unlockAchievements(userId, fresh.map((a) => a.id))
      setProfile(next)
      setUnlocked(new Set([...unlocked, ...fresh.map((a) => a.id)]))
      return fresh
    },
    [userId, profile, sessions, unlocked]
  )

  const recordSession: AuthState['recordSession'] = useCallback(
    async (exerciseId, res, startMidi) => {
      if (!userId || !profile) return { xpGain: 0, fresh: [] }
      const row = await api.addSession(userId, { exerciseId, score: res.score, stability: res.stability, startMidi, metrics: res.metrics })
      const xpGain = xpFor(res.score)
      const xp = profile.xp + xpGain
      await api.updateProfile(userId, { xp })
      const all = [...sessions, row]
      const fresh = freshAchievements({ baseline: profile.baseline, sessions: lite(all), xp }, unlocked)
      if (fresh.length) await api.unlockAchievements(userId, fresh.map((a) => a.id))
      setSessions(all)
      setProfile({ ...profile, xp })
      setUnlocked(new Set([...unlocked, ...fresh.map((a) => a.id)]))
      return { xpGain, fresh }
    },
    [userId, profile, sessions, unlocked]
  )

  const removeAccount = useCallback(async () => {
    await api.deleteAccount()
    reset()
  }, [reset])

  const value = useMemo<AuthState>(
    () => ({ ready, configured: supabaseConfigured, userId, email, profile, sessions, unlocked, signUp, signIn, signOut, saveProfile, saveBaseline, recordSession, removeAccount }),
    [ready, userId, email, profile, sessions, unlocked, signUp, signIn, signOut, saveProfile, saveBaseline, recordSession, removeAccount]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
