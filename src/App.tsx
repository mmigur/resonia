import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { BottomNav, type NavKey } from '@/components/BottomNav'
import { useAuth } from '@/lib/auth'
import { loadSpice } from '@/lib/spice'
import type { Go, Screen } from '@/screens/types'
import { SplashScreen } from '@/screens/Splash'
import { TestScreen } from '@/screens/Test'
import { ResultsScreen } from '@/screens/Results'
import { AuthScreen } from '@/screens/Auth'
import { HomeScreen } from '@/screens/Home'
import { ExerciseScreen } from '@/screens/Exercise'
import { ProgressScreen } from '@/screens/Progress'
import { AwardsScreen } from '@/screens/Awards'
import { ProfileScreen } from '@/screens/Profile'

const PROTECTED = ['home', 'exercise', 'progress', 'awards', 'profile']
const NAV_SCREENS: NavKey[] = ['home', 'progress', 'awards', 'profile']

export default function App() {
  const { ready, userId, profile } = useAuth()
  const [screen, setScreen] = useState<Screen>({ name: 'splash' })
  const [minSplash, setMinSplash] = useState(false)

  // Грузим SPICE в фоне, пока показывается сплэш
  useEffect(() => {
    loadSpice().catch(() => {})
    const t = setTimeout(() => setMinSplash(true), 1800)
    return () => clearTimeout(t)
  }, [])

  // Выход со сплэша: когда прошло минимум времени и известно, есть ли сессия
  useEffect(() => {
    if (screen.name === 'splash' && minSplash && ready) {
      setScreen(userId && profile ? { name: 'home' } : { name: 'test' })
    }
  }, [screen.name, minSplash, ready, userId, profile])

  const go: Go = (s) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  // защищённые экраны без входа → тест
  const effective: Screen = PROTECTED.includes(screen.name) && ready && !userId ? { name: 'test' } : screen
  const navActive = NAV_SCREENS.includes(effective.name as NavKey) ? (effective.name as NavKey) : effective.name === 'exercise' ? 'home' : null

  let body
  switch (effective.name) {
    case 'splash': body = <SplashScreen />; break
    case 'test': body = <TestScreen go={go} />; break
    case 'results': body = <ResultsScreen go={go} screen={effective} />; break
    case 'auth': body = <AuthScreen go={go} screen={effective} />; break
    case 'home': body = <HomeScreen go={go} />; break
    case 'exercise': body = <ExerciseScreen key={effective.id} go={go} screen={effective} />; break
    case 'progress': body = <ProgressScreen />; break
    case 'awards': body = <AwardsScreen />; break
    case 'profile': body = <ProfileScreen go={go} />; break
  }

  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-28">{body}</main>
      {navActive && <BottomNav active={navActive} onNavigate={(k) => go({ name: k })} />}
      <Toaster theme="dark" position="top-center" richColors />
    </>
  )
}
