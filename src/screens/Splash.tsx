import { Logo } from '@/components/Logo'

export function SplashScreen() {
  return (
    <div className="animate-in fade-in zoom-in-95 flex min-h-[78dvh] flex-col items-center justify-center gap-6 duration-700">
      <div className="relative grid place-items-center">
        <span className="ring-pulse border-primary absolute size-32 rounded-full border-2" />
        <span className="ring-pulse border-primary absolute size-32 rounded-full border-2" style={{ animationDelay: '1s' }} />
        <Logo size={128} className="drop-shadow-[0_12px_40px_rgba(124,58,237,.45)]" />
      </div>
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Resonia</h1>
        <p className="text-muted-foreground text-sm">Тренировка вокала</p>
      </div>
    </div>
  )
}
