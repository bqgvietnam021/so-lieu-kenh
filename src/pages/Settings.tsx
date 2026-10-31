import { useState } from 'react'
import { NoAccess, Select } from '../components/ui'
import { fmtInt } from '../lib/format'
import { useStore } from '../lib/store'
import type { Settings, Topic } from '../lib/types'

const parseNum = (s: string) => Number(s.replace(/\D/g, '')) || 0

export function SettingsPage() {
  const { settings, topics, channels, saveSettings, can, toast } = useStore()
  const [s, setS] = useState<Settings>(settings)
  const [list, setList] = useState<Topic[]>(topics)
  const [newTopic, setNewTopic] = useState('')
  const [adding, setAdding] = useState(false)
  if (!can('settings')) return <NoAccess />

  const countOf = (id: string) => channels.filter((c) => c.topicId === id).length
  const dirty = JSON.stringify(s) !== JSON.stringify(settings) || JSON.stringify(list) !== JSON.stringify(topics)
  const num = (k: 'viewDropPct' | 'noPostDays' | 'tokenExpiryDays' | 'freshVideoDays', min: number, max: number) => ({
    value: s[k],
    type: 'number',
    min, max,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Math.min(max, Math.max(min, Number(e.target.value) || min)) }),
  })

  const addTopic = () => {
    const name = newTopic.trim()
    if (!name) return setAdding(false)
    if (list.some((t) => t.name.toLowerCase() === name.toLowerCase())) return toast('Chủ đề đã tồn tại', 'warn')
    setList([...list, { id: `t-${Date.now().toString(36)}`, name }])
    setNewTopic('')
    setAdding(false)
  }

  const removeTopic = (t: Topic) => {
    const n = countOf(t.id)
    if (n > 0) return toast(`Chủ đề "${t.name}" còn ${n} kênh. Chuyển các kênh sang chủ đề khác trước khi xoá.`, 'warn')
    setList(list.filter((x) => x.id !== t.id))
  }

  const save = () => {
    if (list.some((t) => !t.name.trim())) return toast('Tên chủ đề không được để trống', 'warn')
    saveSettings(s, list.map((t) => ({ ...t, name: t.name.trim() })))
  }

  return (
    <>
      <div className="page-head">
        <h1 style={{ fontSize: 30 }}>Cài đặt</h1>
        <div className="head-actions">
          {dirty && <button className="btn" onClick={() => { setS(settings); setList(topics) }}>Huỷ thay đổi</button>}
          <button className="btn btn-primary" onClick={save} disabled={!dirty} style={{ height: 44 }}>Lưu thay đổi</button>
        </div>
      </div>

      <div className="stack">
        <section className="card card-pad">
          <div className="card-title" style={{ fontSize: 18 }}>Mục tiêu</div>
          <div className="form-grid c2">
            <label className="field"><span>View mục tiêu mỗi tháng ({s.target.scopeType === 'all' ? 'tổng' : 'tổng các chủ đề'})</span>
              {s.target.scopeType === 'all' ? (
                <input className="input" inputMode="numeric" value={fmtInt(s.target.total)}
                  onChange={(e) => setS({ ...s, target: { ...s.target, total: parseNum(e.target.value) } })} />
              ) : (
                <input className="input" disabled value={fmtInt(Object.entries(s.target.byTopic).filter(([k]) => list.some((t) => t.id === k)).reduce((a, [, b]) => a + b, 0))} />
              )}
            </label>
            <label className="field"><span>Áp dụng theo</span>
              <Select value={s.target.scopeType} onChange={(scopeType) => setS({ ...s, target: { ...s.target, scopeType } })} options={[
                { value: 'all', label: 'Toàn bộ kênh' }, { value: 'topic', label: 'Theo chủ đề' },
              ]} />
            </label>
          </div>
          {s.target.scopeType === 'topic' && (
            <div className="form-grid c2" style={{ marginTop: 16 }}>
              {list.map((t) => (
                <label key={t.id} className="field"><span>Mục tiêu chủ đề {t.name}</span>
                  <input className="input" inputMode="numeric" value={fmtInt(s.target.byTopic[t.id] ?? 0)}
                    onChange={(e) => setS({ ...s, target: { ...s.target, byTopic: { ...s.target.byTopic, [t.id]: parseNum(e.target.value) } } })} />
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div className="card-title" style={{ fontSize: 18 }}>Ngưỡng cảnh báo</div>
          <div className="form-grid c3">
            <label className="field"><span>Cảnh báo khi view tuần giảm quá (%)</span><input className="input" {...num('viewDropPct', 1, 100)} /></label>
            <label className="field"><span>Cảnh báo khi không đăng video quá (ngày)</span><input className="input" {...num('noPostDays', 1, 60)} /></label>
            <label className="field"><span>Báo trước khi token hết hạn (ngày)</span><input className="input" {...num('tokenExpiryDays', 1, 60)} /></label>
          </div>
        </section>

        <section className="card card-pad">
          <div className="card-title" style={{ fontSize: 18 }}>
            Chủ đề
            <button className="btn btn-sm" onClick={() => setAdding(true)}>+ Thêm chủ đề</button>
          </div>
          <div className="chips" style={{ gap: 12 }}>
            {list.map((t) => (
              <span key={t.id} className="topic-chip">
                <input value={t.name} aria-label="Tên chủ đề" size={Math.max(2, t.name.length)} style={{ width: 'auto' }}
                  onChange={(e) => setList(list.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))} />
                <span className="n">{countOf(t.id)} kênh</span>
                <button className="x" aria-label={`Xoá chủ đề ${t.name}`} onClick={() => removeTopic(t)}>×</button>
              </span>
            ))}
            {adding && (
              <span className="topic-chip">
                <input autoFocus placeholder="Tên chủ đề" value={newTopic} onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTopic(); if (e.key === 'Escape') setAdding(false) }} onBlur={addTopic} />
              </span>
            )}
          </div>
          <div className="hint" style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>Bấm vào tên chủ đề để sửa. Chỉ xoá được chủ đề không còn kênh.</div>
        </section>

        <section className="card card-pad">
          <div className="card-title" style={{ fontSize: 18 }}>Lịch thu thập</div>
          <div className="form-grid c3" style={{ alignItems: 'end' }}>
            <label className="field"><span>Giờ chạy hằng ngày</span>
              <input className="input" type="time" value={s.runTime} onChange={(e) => setS({ ...s, runTime: e.target.value || '06:00' })} />
            </label>
            <label className="field"><span>Cập nhật hằng ngày cho video đăng trong (ngày)</span><input className="input" {...num('freshVideoDays', 1, 365)} /></label>
            <label className="field"><span>Video cũ hơn cập nhật</span>
              <Select value={s.oldVideoCycle} onChange={(oldVideoCycle) => setS({ ...s, oldVideoCycle })} options={[
                { value: 'weekly', label: 'Hằng tuần' }, { value: 'monthly', label: 'Hằng tháng' }, { value: 'never', label: 'Không cập nhật' },
              ]} />
            </label>
          </div>
        </section>

        <section className="card card-pad">
          <div className="card-title" style={{ fontSize: 18 }}>Phân quyền</div>
          <label className="field" style={{ maxWidth: 420 }}><span>Phạm vi dữ liệu của Nhân viên</span>
            <Select value={s.staffScope} onChange={(staffScope) => setS({ ...s, staffScope })} options={[
              { value: 'own', label: 'Chỉ kênh mình phụ trách' }, { value: 'all', label: 'Toàn bộ kênh' },
            ]} />
          </label>
        </section>
      </div>
    </>
  )
}
