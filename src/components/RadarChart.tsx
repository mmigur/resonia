// Радар-диаграмма: a — текущие значения (заливка), b — стартовые (пунктир).
export type RadarAxis = { label: string; a: number | null; b?: number | null }

export function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const W = 300
  const H = 250
  const cx = W / 2
  const cy = 122
  const R = 78
  const n = axes.length
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const pt = (i: number, v: number) => [cx + Math.cos(ang(i)) * R * (v / 100), cy + Math.sin(ang(i)) * R * (v / 100)]
  const poly = (vals: (number | null | undefined)[]) => vals.map((v, i) => pt(i, v ?? 0).map((x) => x.toFixed(1)).join(',')).join(' ')
  const hasB = axes.some((x) => x.b !== undefined && x.b !== null)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-xs" role="img" aria-label="Радар навыков голоса">
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={axes.map((_, i) => pt(i, g).map((x) => x.toFixed(1)).join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.09)" strokeWidth="1" />
      })}
      {hasB && <polygon points={poly(axes.map((x) => x.b))} fill="none" stroke="#a78bfa" strokeOpacity=".8" strokeWidth="1.5" strokeDasharray="4 4" />}
      <polygon points={poly(axes.map((x) => x.a))} fill="rgba(244,114,182,.28)" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((x, i) => {
        const [px, py] = pt(i, x.a ?? 0)
        return <circle key={i} cx={px} cy={py} r="3.5" fill="#f472b6" />
      })}
      {axes.map((x, i) => {
        const [lx, ly] = [cx + Math.cos(ang(i)) * (R + 24), cy + Math.sin(ang(i)) * (R + 20)]
        const anchor = Math.abs(Math.cos(ang(i))) < 0.2 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end'
        return (
          <g key={x.label}>
            <text x={lx} y={ly - 2} textAnchor={anchor} fontSize="11" fontWeight="600" fill="rgba(255,255,255,.82)">{x.label}</text>
            <text x={lx} y={ly + 11} textAnchor={anchor} fontSize="11" fill="rgba(255,255,255,.5)">{x.a === null ? '—' : x.a}</text>
          </g>
        )
      })}
    </svg>
  )
}
