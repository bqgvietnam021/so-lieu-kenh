import { useLayoutEffect, useRef, useState } from 'react'

export interface Series {
  /** Giá trị theo chỉ số x (null = không vẽ điểm này). */
  values: (number | null)[]
  color: string
  dashed?: boolean
  label: string
  width?: number
}

interface Props {
  series: Series[]
  xLabels: { i: number; text: string }[]
  height?: number
  formatY: (v: number) => string
  /** Nhãn cho từng điểm khi rê chuột. */
  pointLabel?: (i: number) => string
  yMin?: number
  yMax?: number
}

function niceStep(max: number, ticks: number) {
  const raw = max / ticks
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  return step * mag
}

export function LineChart({ series, xLabels, height = 380, formatY, pointLabel, yMin = 0, yMax }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(Math.max(280, el.clientWidth))
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = Math.max(...series.map((s) => s.values.length))
  const dataMax = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v != null)))
  const step = niceStep((yMax ?? dataMax) - yMin, 3)
  const top = yMax ?? Math.ceil(dataMax / step) * step
  const ticks: number[] = []
  for (let v = yMin + step; v <= top + 1e-9; v += step) ticks.push(v)

  const padL = 70, padR = 16, padT = 16, padB = 40
  const w = width - padL - padR
  const h = height - padT - padB
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * w)
  const y = (v: number) => padT + h - ((v - yMin) / (top - yMin || 1)) * h

  const pathOf = (vals: (number | null)[]) => {
    let d = ''
    let pen = false
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(Math.min(v, top * 1.15)).toFixed(1)}`
      pen = true
    })
    return d
  }

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))))
  }

  const hoverVals = hover == null ? [] : series.map((s) => ({ s, v: s.values[hover] })).filter((o) => o.v != null)

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" style={{ maxWidth: '100%' }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={padL + w} y1={y(t)} y2={y(t)} stroke="#e8eaee" />
            <text x={padL - 14} y={y(t) + 4} textAnchor="end">{formatY(t)}</text>
          </g>
        ))}
        <line x1={padL} x2={padL + w} y1={y(yMin)} y2={y(yMin)} stroke="#d3d7de" />
        {xLabels.map((l, k) => (
          <text key={k} x={x(l.i)} y={height - 12} textAnchor={k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle'}>{l.text}</text>
        ))}
        {series.map((s, k) => (
          <path key={k} d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth={s.width ?? (s.dashed ? 2.5 : 3.5)}
            strokeDasharray={s.dashed ? '8 7' : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + h} stroke="#c9ced6" strokeDasharray="3 3" />
            {hoverVals.map(({ s, v }, k) => (
              <circle key={k} cx={x(hover)} cy={y(v!)} r={4.5} fill="#fff" stroke={s.color} strokeWidth={2.5} />
            ))}
          </g>
        )}
        <rect x={padL} y={padT} width={w} height={h} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover != null && hoverVals.length > 0 && (
        <div className="chart-tip" style={{ left: x(hover), top: y(Math.max(...hoverVals.map((o) => o.v!))) }}>
          {pointLabel && <div style={{ opacity: 0.7 }}>{pointLabel(hover)}</div>}
          {hoverVals.map(({ s, v }, k) => <div key={k}>{s.label}: <b>{formatY(v!)}</b></div>)}
        </div>
      )}
    </div>
  )
}
