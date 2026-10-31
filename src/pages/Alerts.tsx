import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHead, Select, Tabs } from '../components/ui'
import { ALERT_LABEL } from '../lib/alerts'
import { relTime } from '../lib/format'
import { useStore } from '../lib/store'
import type { Alert, AlertStatus } from '../lib/types'

const HOT: Alert['type'][] = ['view_drop', 'token_error', 'token_expiring']

export function Alerts() {
  const { alerts, channelById, userName, setAlertStatus, can } = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<AlertStatus>('new')
  const [type, setType] = useState('all')

  const count = (s: AlertStatus) => alerts.filter((a) => a.status === s).length
  const rows = alerts.filter((a) => a.status === tab && (type === 'all' || a.type === type))

  const go = (a: Alert) => {
    if (a.status === 'new') setAlertStatus(a, 'seen')
    if (a.channelId) nav(`/kenh/${a.channelId}`)
    else if (a.connectionId) nav(can('connections') ? '/ket-noi' : '/canh-bao')
    else nav(can('logs') ? '/nhat-ky' : '/canh-bao')
  }

  return (
    <>
      <PageHead title="Cảnh báo" sub={`${count('new')} cảnh báo mới chưa xử lý`} />
      <div className="filters" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
        <Tabs value={tab} onChange={setTab} items={[
          { value: 'new', label: `Mới (${count('new')})` },
          { value: 'seen', label: `Đã xem (${count('seen')})` },
          { value: 'resolved', label: `Đã xử lý${count('resolved') ? ` (${count('resolved')})` : ''}` },
        ]} />
        <Select label="Loại" value={type} onChange={setType} options={[
          { value: 'all', label: 'Tất cả' }, ...Object.entries(ALERT_LABEL).map(([value, label]) => ({ value, label })),
        ]} />
      </div>
      <div className="card">
        {rows.length === 0 && <div className="empty">Không có cảnh báo trong mục này</div>}
        {rows.map((a) => {
          const ch = a.channelId ? channelById[a.channelId] : undefined
          return (
            <div className="alert-row" key={a.id}>
              <span className={`badge ${HOT.includes(a.type) ? 'warn' : 'neutral'}`}>{ALERT_LABEL[a.type]}</span>
              <div>
                <div className="msg">{a.message}</div>
                <div className="meta">
                  {ch && <>Phụ trách: {userName(ch.ownerUserId)} · </>}
                  {relTime(a.createdAt)}
                  {a.status === 'resolved' && a.resolvedBy && <> · Đã xử lý bởi {a.resolvedBy}{a.resolvedAt && ` lúc ${relTime(a.resolvedAt)}`}</>}
                </div>
              </div>
              <div className="acts">
                <button className="btn" onClick={() => go(a)}>{a.channelId ? 'Xem kênh' : a.connectionId ? 'Xem kết nối' : 'Xem nhật ký'}</button>
                {a.status !== 'resolved'
                  ? <button className="btn btn-soft" onClick={() => setAlertStatus(a, 'resolved')}>Đánh dấu đã xử lý</button>
                  : <button className="btn" onClick={() => setAlertStatus(a, 'new')}>Mở lại</button>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
