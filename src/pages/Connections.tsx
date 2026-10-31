import { useState } from 'react'
import { BusyButton, ConnectionStatusBadge, NoAccess, PageHead, Select } from '../components/ui'
import { relTime } from '../lib/format'
import { useStore, type AddConnectionInput } from '../lib/store'
import type { ConnectionKind } from '../lib/types'

const KIND_LABEL: Record<ConnectionKind, string> = {
  fb_bm: 'Facebook BM',
  google_oauth: 'Google OAuth',
  tiktok_business: 'TikTok',
}

export function Connections() {
  const { connections, channels, checkConnection, syncConnection, can, audit } = useStore()
  if (!can('connections')) return <NoAccess />
  const tracked = channels.filter((c) => c.status !== 'hidden').length

  return (
    <>
      <PageHead title="Kết nối" sub={`Mỗi Business Manager dùng một System User token · ${tracked} kênh đang theo dõi`} />
      <div className="split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 20, alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Kết nối</th>
                    <th>Loại</th>
                    <th className="num">Số kênh</th>
                    <th>Trạng thái</th>
                    <th>Kiểm tra lần cuối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, minWidth: 150 }}>
                        {c.name}
                        <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--subtle)' }}>ID {c.externalId}</div>
                      </td>
                      <td>{KIND_LABEL[c.kind]}</td>
                      <td className="num">{channels.filter((ch) => ch.connectionId === c.id).length}</td>
                      <td><ConnectionStatusBadge conn={c} /></td>
                      <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {relTime(c.lastCheckedAt)}
                        {c.tokenExpiresAt && <div style={{ fontSize: 12 }}>Token hết hạn {relTime(c.tokenExpiresAt).replace(' 00:00', '').replace(/^00:00 /, '')}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <BusyButton onClick={() => checkConnection(c.id)}>Kiểm tra</BusyButton>
                          <BusyButton onClick={() => syncConnection(c.id)}>Đồng bộ kênh</BusyButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card card-pad">
            <div className="card-title">Lịch sử thao tác trên kết nối</div>
            {audit.slice(0, 8).map((e, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--border)' : 0, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--muted)', minWidth: 120 }}>{relTime(e.at)}</span>
                <span><b>{e.userName}</b> · {e.action}</span>
              </div>
            ))}
          </div>
        </div>
        <AddConnection />
      </div>
    </>
  )
}

function AddConnection() {
  const { addConnection } = useStore()
  const empty: AddConnectionInput = { kind: 'fb_bm', name: '', externalId: '', token: '' }
  const [form, setForm] = useState(empty)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof AddConnectionInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  const fb = form.kind === 'fb_bm'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await addConnection(form)
    setBusy(false)
    setErr(res ?? '')
    // Xoá token khỏi bộ nhớ form ngay sau khi gửi, dù thành công hay không.
    setForm(res ? { ...form, token: '' } : empty)
  }

  return (
    <form className="card card-pad" onSubmit={submit}>
      <div className="card-title" style={{ fontSize: 18 }}>Thêm kết nối</div>
      <div className="form-grid">
        <label className="field"><span>Loại</span>
          <Select<ConnectionKind> value={form.kind} onChange={(kind) => setForm({ ...form, kind })} options={[
            { value: 'fb_bm', label: 'Facebook – Business Manager' },
            { value: 'google_oauth', label: 'YouTube – Google OAuth' },
            { value: 'tiktok_business', label: 'TikTok Business (thử nghiệm)' },
          ]} />
        </label>
        <label className="field"><span>Tên gợi nhớ</span>
          <input className="input" placeholder="VD: BM Chăn nuôi 04" value={form.name} onChange={set('name')} />
        </label>
        <label className="field"><span>{fb ? 'Business ID' : form.kind === 'google_oauth' ? 'Channel owner ID' : 'Advertiser / Business ID'}</span>
          <input className="input" placeholder={fb ? '[BUSINESS ID]' : '[ID TÀI KHOẢN]'} value={form.externalId} onChange={set('externalId')} inputMode={fb ? 'numeric' : undefined} />
        </label>
        <label className="field"><span>{fb ? 'System User token' : form.kind === 'google_oauth' ? 'Refresh token' : 'Access token'}</span>
          <input className="input" type="password" autoComplete="off" placeholder="Dán token vào đây" value={form.token} onChange={set('token')} />
          <span className="hint">Token được mã hóa khi lưu, không hiển thị lại.</span>
        </label>
        {err && <div className="error-text">{err}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ height: 44 }}>
          {busy && <span className="spin" />} Kiểm tra &amp; lưu
        </button>
      </div>
    </form>
  )
}
