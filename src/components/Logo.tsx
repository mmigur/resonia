import { useId } from 'react'

// Логотип Resonia: волна голоса с маркером высоты тона внутри колец резонанса.
// Геометрия совпадает с public/logo.svg и PNG-иконками PWA.
export function Logo({ size = 96, className }: { size?: number; className?: string }) {
  const id = 'lg' + useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="Resonia">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#e0449a" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="32" fill={`url(#${id})`} />
      <circle cx="60" cy="60" r="40" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="3" />
      <circle cx="60" cy="60" r="27" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="3" />
      <path d="M20 62 C32 30 46 30 60 62 S88 94 100 62" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <circle cx="39.25" cy="38" r="7.5" fill="#fff" />
    </svg>
  )
}
