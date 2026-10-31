import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHead, Pager, PlayIcon, Select, SortTh, Tabs, usePaged, useSort } from '../components/ui'
import { fmtDay, fmtDuration, fmtShort, LAST_DAY, monthRange, TODAY_INDEX } from '../lib/format'
import { videoStatsAt } from '../lib/metrics'
import { useStore, VIDEOS } from '../lib/store'

type SortKey = 'views' | 'likes' | 'comments' | 'shares' | 'avgWatchS' | 'day'
type Tab = 'all' | 'top' | 'bottom'

const PERIODS = [
  { value: '2026-10', label: 'Tháng 10/2026' },
  { value: '2026-09', label: 'Tháng 9/2026' },
  { value: '2026-08', label: 'Tháng 8/2026' },
  { value: 'd7', label: '7 ngày qua' },
  { value: 'd30', label: '30 ngày qua' },
]

export function Videos() {
  const { visibleChannels, topics, channelById } = useStore()
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [period, setPeriod] = useState('2026-10')
  const [channel, setChannel] = useState('all')
  const [topic, setTopic] = useState('all')
  const [format, setFormat] = useState('all')
  const { sort, toggle } = useSort<SortKey>('views')

  const { from, to } = useMemo(() => {
    if (period.startsWith('d')) return { from: LAST_DAY - Number(period.slice(1)) + 1, to: TODAY_INDEX }
    const [y, m] = period.split('-').map(Number)
    const r = monthRange(y, m)
    return { from: r.from, to: Math.min(r.end, TODAY_INDEX) }
  }, [period])

  const base = useMemo(() => {
    const ids = new Set(visibleChannels.filter((c) => c.status !== 'hidden').map((c) => c.id))
    return VIDEOS
      .filter((v) => ids.has(v.channelId) && v.publishedDay >= from && v.publishedDay <= to)
      .filter((v) => channel === 'all' || v.channelId === channel)
      .filter((v) => topic === 'all' || channelById[v.channelId].topicId === topic)
      .filter((v) => format === 'all' || v.format === format)
      .map((v) => ({ v, st: videoStatsAt(v) }))
  }, [visibleChannels, from, to, channel, topic, format, channelById])

  const rows = useMemo(() => {
    const byViews = [...base].sort((a, b) => b.st.views - a.st.views)
    const pool = tab === 'top' ? byViews.slice(0, 10) : tab === 'bottom' ? byViews.slice(-10).reverse() : base
    const dir = sort.dir === 'desc' ? -1 : 1
    const val = (r: (typeof base)[number]) => sort.key === 'day' ? r.v.publishedDay + r.v.publishedHour / 24 : r.st[sort.key]
    return tab === 'all' ? [...pool].sort((a, b) => dir * (val(a) - val(b))) : pool
  }, [base, tab, sort])

  const paged = usePaged(rows, 10, [tab, period, channel, topic, format, sort.key, sort.dir].join('|'))
  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase()
  const chOptions = visibleChannels.filter((c) => topic === 'all' || c.topicId === topic)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))

  return (
    <>
      <PageHead title="Video" sub={`${base.length} video đăng trong ${periodLabel}`} />
      <div className="filters" style={{ marginBottom: 20, justifyContent: 'space-between' }}>
        <Tabs value={tab} onChange={setTab} items={[{ value: 'all', label: 'Tất cả' }, { value: 'top', label: 'Top 10' }, { value: 'bottom', label: 'Bottom 10' }]} />
        <div className="filters">
          <Select value={period} onChange={setPeriod} options={PERIODS} />
          <Select label="Kênh" value={channel} onChange={setChannel} style={{ maxWidth: 260 }}
            options={[{ value: 'all', label: 'Tất cả' }, ...chOptions.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Chủ đề" value={topic} onChange={(t) => { setTopic(t); setChannel('all') }}
            options={[{ value: 'all', label: 'Tất cả' }, ...topics.map((t) => ({ value: t.id, label: t.name }))]} />
          <Select label="Định dạng" value={format} onChange={setFormat}
            options={[{ value: 'all', label: 'Tất cả' }, { value: '9:16', label: '9:16' }, { value: '16:9', label: '16:9' }]} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Video</th>
                <th>Kênh</th>
                <SortTh k="day" sort={sort} toggle={toggle} num={false}>Ngày đăng</SortTh>
                <th>Định dạng</th>
                <SortTh k="views" sort={sort} toggle={toggle}>View</SortTh>
                <SortTh k="likes" sort={sort} toggle={toggle}>Like</SortTh>
                <SortTh k="comments" sort={sort} toggle={toggle}>Comment</SortTh>
                <SortTh k="shares" sort={sort} toggle={toggle}>Share</SortTh>
                <SortTh k="avgWatchS" sort={sort} toggle={toggle}>Xem TB</SortTh>
              </tr>
            </thead>
            <tbody>
              {paged.slice.map(({ v, st }) => (
                <tr key={v.id} className="clickable" onClick={() => nav(`/video/${v.id}`)}>
                  <td>
                    <div className="video-cell">
                      <span className={`thumb ${v.format === '16:9' ? 'wide' : ''}`}><PlayIcon /></span>
                      <Link className="title" to={`/video/${v.id}`} onClick={(e) => e.stopPropagation()}>{v.title}</Link>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{channelById[v.channelId].name}</td>
                  <td>{fmtDay(v.publishedDay)}</td>
                  <td><span className="badge neutral">{v.format}</span></td>
                  <td className="num strong">{fmtShort(st.views)}</td>
                  <td className="num">{fmtShort(st.likes)}</td>
                  <td className="num">{fmtShort(st.comments)}</td>
                  <td className="num">{fmtShort(st.shares)}</td>
                  <td className="num">{fmtDuration(st.avgWatchS)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9} className="empty">Không có video phù hợp bộ lọc</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager {...paged} total={rows.length} unit="video" />
      </div>
    </>
  )
}
