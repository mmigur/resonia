import { useState } from 'react'
import { LogOut, Mic, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/lib/auth'
import { AVATARS } from '@/lib/icons'
import { rangeText, midiName } from '@/lib/attempt'
import { RadarChart } from '@/components/RadarChart'
import { averageMetrics, RADAR_AXES, FOCUS_TITLE, weakestFocus } from '@/lib/metrics'
import { lessonForFocus } from '@/lib/path'
import { cn } from '@/lib/utils'
import type { Go } from './types'

const GOALS = ['Петь чище', 'Расширить диапазон', 'Для души', 'Выступать на сцене', 'Подготовка к кастингу']
const VOICES = ['Не знаю', 'Бас', 'Баритон', 'Тенор', 'Альт', 'Меццо-сопрано', 'Сопрано']

export function ProfileScreen({ go }: { go: Go }) {
  const { profile, email, sessions, saveProfile, signOut, removeAccount } = useAuth()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar ?? 'mic')
  const [goal, setGoal] = useState(profile?.goal ?? GOALS[0])
  const [voice, setVoice] = useState(profile?.voiceType ?? VOICES[0])
  const [saving, setSaving] = useState(false)
  if (!profile) return null
  const b = profile.baseline
  const recent = sessions.flatMap((x) => (x.metrics ? [x.metrics] : [])).slice(-5)
  const cur = averageMetrics(recent) ?? b?.metrics ?? null
  const bm = b?.metrics ?? null
  const weak = cur ? weakestFocus(cur) : null
  const weakLesson = weak ? lessonForFocus(weak, sessions.map((x) => ({ exercise_id: x.exercise_id, score: x.score }))) : null
  const delta = (k: (typeof RADAR_AXES)[number]['key']) => (cur && bm && cur[k] !== null && bm[k] !== null ? (cur[k] as number) - (bm[k] as number) : null)

  const save = async () => {
    setSaving(true)
    try {
      await saveProfile({ displayName: name.trim() || email.split('@')[0], avatar, goal, voiceType: voice })
      toast.success('Профиль сохранён')
    } catch (e) {
      toast.error('Не удалось сохранить: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground text-sm">{email}</p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Аватар</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(AVATARS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAvatar(key)}
                  aria-label={key}
                  className={cn('bg-secondary grid size-11 cursor-pointer place-items-center rounded-xl border-2 border-transparent transition-colors', avatar === key && 'border-primary text-primary')}
                >
                  <Icon className="size-5" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nm">Имя</Label>
            <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gl">Цель</Label>
            <NativeSelect id="gl" value={goal} onChange={(e) => setGoal(e.target.value)}>
              {GOALS.map((g) => <option key={g}>{g}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vc">Тип голоса</Label>
            <NativeSelect id="vc" value={voice} onChange={(e) => setVoice(e.target.value)}>
              {VOICES.map((v) => <option key={v}>{v}</option>)}
            </NativeSelect>
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
        </CardContent>
      </Card>

      {cur && (
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>Вокальный паспорт</CardTitle>
            <CardDescription>{recent.length ? `Среднее по последним ${recent.length} занятиям` : 'По стартовому тесту'}{bm && recent.length ? ' · пунктир — старт' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadarChart axes={RADAR_AXES.map((a) => ({ label: a.label, a: cur[a.key], b: recent.length && bm ? bm[a.key] : undefined }))} />
            <div className="space-y-1.5">
              {RADAR_AXES.map((a) => {
                const v = cur[a.key]
                const d = delta(a.key)
                return (
                  <div key={a.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{FOCUS_TITLE[a.key]}</span>
                    <span className="font-semibold tabular-nums">
                      {v ?? '—'}
                      {d !== null && d !== 0 && <span className={cn('ml-2 text-xs', d > 0 ? 'text-success' : 'text-destructive')}>{d > 0 ? '+' : '−'}{Math.abs(d)}</span>}
                    </span>
                  </div>
                )
              })}
              {cur.centerMidi !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Комфортный центр</span>
                  <span className="font-semibold">{midiName(Math.round(cur.centerMidi))}</span>
                </div>
              )}
              {b && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Диапазон на тесте</span>
                  <span className="font-semibold">{rangeText(b.range)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Тон в среднем</span>
                <span className="font-semibold tabular-nums">{cur.meanCents > 0 ? '+' : cur.meanCents < 0 ? '−' : ''}{Math.abs(Math.round(cur.meanCents))}¢</span>
              </div>
            </div>
            {weak && (
              <div className="bg-primary/10 rounded-xl p-3 text-center text-sm">
                <p className="font-semibold">Слабое место: {FOCUS_TITLE[weak].toLowerCase()}</p>
                {weakLesson && (
                  <Button size="sm" className="mt-2" onClick={() => go({ name: 'exercise', id: weakLesson.id })}>Потренировать: {weakLesson.title}</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {b && (
        <Card>
          <CardHeader>
            <CardTitle>Стартовый тест</CardTitle>
            <CardDescription>
              {b.level} · точность {b.score} · стабильность {b.stability} · диапазон {rangeText(b.range)}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-2">
        <Button variant="secondary" className="w-full" onClick={() => go({ name: 'test' })}><Mic /> Пройти тест заново</Button>
        <Button variant="outline" className="w-full" onClick={async () => { await signOut(); go({ name: 'test' }) }}><LogOut /> Выйти</Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:text-destructive w-full"><Trash2 /> Удалить аккаунт и данные</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
              <AlertDialogDescription>Весь прогресс, награды и профиль будут удалены без возможности восстановления.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={async () => {
                  try {
                    await removeAccount()
                    go({ name: 'test' })
                  } catch (e) {
                    toast.error('Не удалось удалить: ' + (e as Error).message)
                  }
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
