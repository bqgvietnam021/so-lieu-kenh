import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ROLE_LABEL, useStore, type Permission } from '../lib/store'
import { Toasts } from './ui'

const NAV: { to: string; label: string; perm?: Permission }[] = [
  { to: '/', label: 'Tổng quan' },
  { to: '/kenh', label: 'Kênh' },
  { to: '/video', label: 'Video' },
  { to: '/canh-bao', label: 'Cảnh báo' },
  { to: '/ket-noi', label: 'Kết nối', perm: 'connections' },
  { to: '/nhat-ky', label: 'Nhật ký thu thập', perm: 'logs' },
  { to: '/cai-dat', label: 'Cài đặt', perm: 'settings' },
]

export function Layout() {
  const { can, alerts, users, user, setUser, resetDemo } = useStore()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  const newCount = alerts.filter((a) => a.status === 'new').length

  return (
    <div className={`app ${open ? 'nav-open' : ''}`} onClick={(e) => { if (open && e.target === e.currentTarget) setOpen(false) }}>
      <aside className="sidebar">
        <div className="brand"><img src="/favicon.svg" alt="" />Số liệu kênh</div>
        <nav className="nav">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              <span>{n.label}</span>
              {n.to === '/canh-bao' && newCount > 0 && <span className="count">{newCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <label htmlFor="who">Đang dùng với tài khoản (demo)</label>
          <select id="who" className="select" value={user.id} onChange={(e) => setUser(e.target.value)}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABEL[u.role]}</option>)}
          </select>
          <button className="linkbtn" onClick={resetDemo}>Khôi phục dữ liệu demo</button>
        </div>
      </aside>
      <div className="shell">
        <div className="topbar">
          <button aria-label="Mở menu" onClick={() => setOpen(true)}>☰</button>
          Số liệu kênh
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  )
}
