import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import type { Channel, Connection } from '../lib/types'

export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </div>
  )
}

export function Select<T extends string>({ value, onChange, options, label, style }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label?: string
  style?: React.CSSProperties
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label} style={style}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{label ? `${label}: ${o.label}` : o.label}</option>
      ))}
    </select>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: {
  value: T
  onChange: (v: T) => void
  items: { value: T; label: string }[]
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} className={value === it.value ? 'on' : ''} onClick={() => onChange(it.value)}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Delta({ value, suffix = '', points = false }: { value: number; suffix?: string; points?: boolean }) {
  const up = value >= 0
  const txt = points
    ? `${Math.abs(value * 100).toFixed(1).replace('.', ',')} điểm`
    : `${Math.round(Math.abs(value) * 100)}%`
  return <span className={up ? 'up' : 'down'}>{up ? '▲' : '▼'} {txt}{suffix}</span>
}

export function ChannelAccessBadge({ ch }: { ch: Channel }) {
  if (ch.status === 'hidden') return <span className="badge neutral">Đã ẩn</span>
  switch (ch.access) {
    case 'ok': return <span className="badge ok">Tốt</span>
    case 'missing_permission': return <span className="badge warn">Thiếu quyền</span>
    case 'testing': return <span className="badge neutral">Đang thử API</span>
    default: return <span className="badge warn">Mất kết nối</span>
  }
}

export function ConnectionStatusBadge({ conn }: { conn: Connection }) {
  switch (conn.status) {
    case 'active': return <span className="badge ok">Hoạt động</span>
    case 'missing_permission': return <span className="badge warn">{conn.lastError?.replace(/^\(#\d+\)\s*/, '') ?? 'Thiếu quyền'}</span>
    case 'testing': return <span className="badge neutral">Đang thử nghiệm</span>
    default: return <span className="badge warn">Lỗi</span>
  }
}

export type SortDir = 'asc' | 'desc'

export function useSort<K extends string>(initial: K, dir: SortDir = 'desc') {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>({ key: initial, dir })
  const toggle = (key: K) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  return { sort, toggle }
}

export function SortTh<K extends string>({ k, sort, toggle, children, num = true }: {
  k: K
  sort: { key: K; dir: SortDir }
  toggle: (k: K) => void
  children: ReactNode
  num?: boolean
}) {
  const on = sort.key === k
  return (
    <th className={`sortable ${num ? 'num' : ''}`} onClick={() => toggle(k)} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {children} {on ? (sort.dir === 'desc' ? '▾' : '▴') : <span style={{ opacity: 0.3 }}>▾</span>}
    </th>
  )
}

export function usePaged<T>(rows: T[], pageSize: number, resetKey: string) {
  const [page, setPage] = useState(0)
  const [key, setKey] = useState(resetKey)
  if (key !== resetKey) { setKey(resetKey); setPage(0) }
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const p = Math.min(page, pages - 1)
  const slice = useMemo(() => rows.slice(p * pageSize, p * pageSize + pageSize), [rows, p, pageSize])
  return { slice, page: p, pages, setPage, from: rows.length ? p * pageSize + 1 : 0, to: Math.min(rows.length, (p + 1) * pageSize) }
}

export function Pager({ from, to, total, unit, page, pages, setPage }: {
  from: number; to: number; total: number; unit: string; page: number; pages: number; setPage: (p: number) => void
}) {
  return (
    <div className="table-foot">
      <span>Hiển thị {from}–{to} / {total} {unit}</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {pages > 1 && <span style={{ fontSize: 13 }}>Trang {page + 1}/{pages}</span>}
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button>
        <button className="btn" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Sau</button>
      </div>
    </div>
  )
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>)}
    </div>
  )
}

export function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  )
}

export function BusyButton({ onClick, children, className = 'btn btn-sm', disabled }: {
  onClick: () => Promise<unknown>
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button className={className} disabled={busy || disabled} onClick={async () => { setBusy(true); try { await onClick() } finally { setBusy(false) } }}>
      {busy && <span className="spin" />} {children}
    </button>
  )
}

export function NoAccess() {
  return <div className="card empty">Vai trò hiện tại không có quyền xem màn hình này.</div>
}
