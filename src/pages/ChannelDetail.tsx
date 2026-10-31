import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LineChart } from '../components/LineChart'
import { ChannelAccessBadge, Delta, Modal, Select, SortTh, Tabs, useSort } from '../components/ui'
import { fmtDay, fmtDuration, fmtPct, fmtShort, LAST_DAY, PLATFORM_LABEL, relTime } from '../lib/format'
import { engagementRate, newFollowers, sumRange, videoStatsAt } from '../lib/metrics'
import { SERIES, useStore, VIDEOS } from '../lib/store'
import type { Channel } from '../lib/types'

type Metric = 'views' | 'followers' | 'engagements'
type SortKey = 'views' | 'eng' | 'day' | 'watch'

export function ChannelDetail() {
  const { id } = useParams()
  const { visibleChannels, connections, topicName, userName, can } = useStore()
  const ch = visibleChannels.find((c) => c.id === id)
  const [range, setRange] = useState('30')
  const [metric, setMetric] = useState<Metric>('views')
  const [editing, setEditing] = useState(false)
  const { sort, toggle } = useSort<SortKey>('views')

  const data = useMemo(() => {
    if (!ch) return null
    const n = Number(range)
    const s = SERIES[ch.id]
    const from = Math.max(ch.firstDay, LAST_DAY - n + 1)
    const pFrom = from - n, pTo = from - 1
    const views = sumRange(s.views, from, LAST_DAY)
    const prevViews = sumRange(s.views, pFrom, pTo)
    const eng = sumRange(s.engagements, from, LAST_DAY) / (views || 1)
    const prevEng = sumRange(s.engagements, pFrom, pTo) / (prevViews || 1)
    const vids = VIDEOS.filter((v) => v.channelId === ch.id && v.publishedDay >= from).map((v) => {
      const st = videoStatsAt(v)
      return { v, st, eng: st.likes + st.comments + st.shares }
    })
    return {
      n, from, views, viewsDelta: prevViews && pFrom >= ch.firstDay ? views / prevViews - 1 : null,
      followers: s.followers[LAST_DAY], followGain: newFollowers(s, from, LAST_DAY),
      eng, engDelta: pFrom >= ch.firstDay ? eng - prevEng : null, vids,
      chart: s[metric].slice(from, LAST_DAY + 1),
    }
  }, [ch, range, metric])

  if (!ch || !data) {
    return <div className="card empty">Không tìm thấy kênh hoặc bạn không có quyền xem kênh này. <Link to="/kenh">Về danh sách kênh</Link></div>
  }

  const conn = connections.find((c) => c.id === ch.connectionId)
  const sorted = [...data.vids].sort((a, b) => {
    const dir = sort.dir === 'desc' ? -1 : 1
    const val = (r: typeof a) => sort.key === 'views' ? r.st.views : sort.key === 'eng' ? r.eng : sort.key === 'day' ? r.v.publishedDay + r.v.publishedHour / 24 : r.st.avgWatchS
    return dir * (val(a) - val(b))
  })
  const metricLabel = { views: 'View', followers: 'Follow', engagements: 'Tương tác' }[metric]

  return (
    <>
      <div className="crumbs"><Link to="/kenh">Kênh</Link> / {ch.name}</div>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 28 }}>{ch.name}</h1>
          <div className="chips" style={{ margin: '10px 0 8px' }}>
            <span className="badge neutral">{PLATFORM_LABEL[ch.platform]}</span>
            <span className="badge neutral">Chủ đề: {topicName(ch.topicId)}</span>
            <span className="badge neutral">Phụ trách: {userName(ch.ownerUserId)}</span>
            {conn && <span className="badge neutral">{conn.name}</span>}
            {ch.access === 'ok' && ch.status !== 'hidden' ? <span className="badge ok">Kết nối tốt</span> : <ChannelAccessBadge ch={ch} />}
          </div>
          <div className="sub">Đồng bộ lần cuối: {relTime(ch.lastSyncedAt)}{ch.accessError && <span className="warn-text"> · {ch.accessError}</span>}</div>
        </div>
        <div className="head-actions">
          <Select value={range} onChange={setRange} options={[
            { value: '7', label: '7 ngày qua' }, { value: '30', label: '30 ngày qua' }, { value: '90', label: '90 ngày qua' },
          ]} />
          <a className="btn" href={ch.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>Mở trang gốc ↗</a>
          {can('editChannel') && <button className="btn" onClick={() => setEditing(true)}>Sửa thông tin</button>}
        </div>
      </div>

      <div className="stack">
        <div className="grid-4">
          <div className="card card-pad stat">
            <div className="label">Follow</div>
            <div className="value">{fmtShort(data.followers)}</div>
            <div className="note"><span className={data.followGain >= 0 ? 'up' : 'down'}>{data.followGain >= 0 ? '▲' : '▼'} {fmtShort(Math.abs(data.followGain))} trong {data.n} ngày</span></div>
          </div>
          <div className="card card-pad stat">
            <div className="label">View {data.n} ngày</div>
            <div className="value">{fmtShort(data.views)}</div>
            <div className="note">{data.viewsDelta == null ? 'Chưa đủ dữ liệu so sánh' : <Delta value={data.viewsDelta} suffix={` so với ${data.n} ngày trước`} />}</div>
          </div>
          <div className="card card-pad stat">
            <div className="label">Tỷ lệ tương tác</div>
            <div className="value">{fmtPct(data.eng)}</div>
            <div className="note">{data.engDelta == null ? '—' : <Delta value={data.engDelta} points />}</div>
          </div>
          <div className="card card-pad stat">
            <div className="label">Video đã đăng</div>
            <div className="value">{data.vids.length}</div>
            <div className="note">trung bình {(data.vids.length / data.n).toFixed(1).replace('.', ',')} video/ngày</div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-title">
            {metric === 'followers' ? 'Follow theo ngày' : metric === 'views' ? 'View theo ngày' : 'Tương tác theo ngày'}
            <Tabs value={metric} onChange={setMetric} items={[
              { value: 'views', label: 'View' }, { value: 'followers', label: 'Follow' }, { value: 'engagements', label: 'Tương tác' },
            ]} />
          </div>
          <LineChart
            height={420}
            formatY={fmtShort}
            yMin={metric === 'followers' ? Math.floor(Math.min(...data.chart) * 0.98) : 0}
            pointLabel={(i) => fmtDay(data.from + i, true)}
            xLabels={[{ i: 0, text: fmtDay(data.from) }, { i: data.chart.length - 1, text: fmtDay(LAST_DAY) }]}
            series={[{ values: data.chart, color: '#1f5fd6', label: metricLabel }]}
          />
        </div>

        <div className="card">
          <div className="card-title" style={{ padding: '20px 20px 0' }}>Video của kênh</div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Video</th>
                  <SortTh k="day" sort={sort} toggle={toggle} num={false}>Ngày đăng</SortTh>
                  <SortTh k="views" sort={sort} toggle={toggle}>View</SortTh>
                  <SortTh k="eng" sort={sort} toggle={toggle}>Tương tác</SortTh>
                  <SortTh k="watch" sort={sort} toggle={toggle}>Xem TB</SortTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ v, st, eng }) => (
                  <tr key={v.id}>
                    <td style={{ minWidth: 280 }}><Link className="title" to={`/video/${v.id}`}>{v.title}</Link></td>
                    <td>{fmtDay(v.publishedDay)}</td>
                    <td className="num strong">{fmtShort(st.views)}</td>
                    <td className="num" title={`Tỷ lệ ${fmtPct(engagementRate(st))}`}>{fmtShort(eng)}</td>
                    <td className="num">{fmtDuration(st.avgWatchS)}</td>
                  </tr>
                ))}
                {sorted.length === 0 && <tr><td colSpan={5} className="empty">Không có video trong khoảng thời gian này</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editing && <EditChannel ch={ch} onClose={() => setEditing(false)} />}
    </>
  )
}

function EditChannel({ ch, onClose }: { ch: Channel; onClose: () => void }) {
  const { topics, users, updateChannel } = useStore()
  const [topicId, setTopicId] = useState(ch.topicId)
  const [owner, setOwner] = useState(ch.ownerUserId)
  const [hidden, setHidden] = useState(ch.status === 'hidden')
  return (
    <Modal title="Sửa thông tin kênh" onClose={onClose}>
      <div className="form-grid">
        <label className="field"><span>Chủ đề</span>
          <Select value={topicId} onChange={setTopicId} options={topics.map((t) => ({ value: t.id, label: t.name }))} />
        </label>
        <label className="field"><span>Người phụ trách</span>
          <Select value={owner} onChange={setOwner} options={users.filter((u) => u.role === 'staff').map((u) => ({ value: u.id, label: u.name }))} />
        </label>
        <label className="check">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          Ẩn kênh (ngừng hiển thị và không xét cảnh báo)
        </label>
      </div>
      <div className="actions">
        <button className="btn" onClick={onClose}>Huỷ</button>
        <button className="btn btn-primary" onClick={() => {
          updateChannel(ch.id, { topicId, ownerUserId: owner, status: hidden ? 'hidden' : ch.access === 'disconnected' ? 'disconnected' : 'active' })
          onClose()
        }}>Lưu</button>
      </div>
    </Modal>
  )
}
