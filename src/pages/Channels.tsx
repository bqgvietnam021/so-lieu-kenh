import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChannelAccessBadge, PageHead, Pager, Select, SortTh, usePaged, useSort } from '../components/ui'
import { fmtShort, fmtSignedPct, PLATFORM_LABEL, relDay, TODAY_INDEX, LAST_DAY } from '../lib/format'
import { weekOverWeek } from '../lib/metrics'
import { SERIES, useStore, VIDEOS } from '../lib/store'

type SortKey = 'followers' | 'views7' | 'pct' | 'lastPost' | 'name'

const LAST_POST: Record<string, number> = {}
for (const v of VIDEOS) LAST_POST[v.channelId] = Math.max(LAST_POST[v.channelId] ?? -1, v.publishedDay)

export function Channels() {
  const { visibleChannels, topics, users, topicName, userName, settings } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [platform, setPlatform] = useState('all')
  const [topic, setTopic] = useState('all')
  const [owner, setOwner] = useState('all')
  const [access, setAccess] = useState('all')
  const { sort, toggle } = useSort<SortKey>('views7')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return visibleChannels
      .filter((c) => (access === 'hidden' ? c.status === 'hidden' : c.status !== 'hidden'))
      .filter((c) => platform === 'all' || c.platform === platform)
      .filter((c) => topic === 'all' || c.topicId === topic)
      .filter((c) => owner === 'all' || c.ownerUserId === owner)
      .filter((c) => access === 'all' || access === 'hidden' || c.access === access)
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || userName(c.ownerUserId).toLowerCase().includes(needle))
      .map((c) => {
        const s = SERIES[c.id]
        const w = weekOverWeek(s)
        const young = LAST_DAY - c.firstDay + 1 < 14
        return { c, followers: s.followers[LAST_DAY], views7: w.cur, pct: young ? null : w.pct, lastPost: LAST_POST[c.id] ?? -1 }
      })
      .sort((a, b) => {
        const dir = sort.dir === 'desc' ? -1 : 1
        if (sort.key === 'name') return dir * a.c.name.localeCompare(b.c.name, 'vi')
        return dir * (((a[sort.key] ?? -9) as number) - ((b[sort.key] ?? -9) as number))
      })
  }, [visibleChannels, q, platform, topic, owner, access, sort, userName])

  const paged = usePaged(rows, 10, [q, platform, topic, owner, access, sort.key, sort.dir].join('|'))
  const platformCount = new Set(visibleChannels.map((c) => c.platform)).size
  const activeCount = visibleChannels.filter((c) => c.status !== 'hidden').length

  return (
    <>
      <PageHead title="Kênh" sub={`${activeCount} kênh · ${platformCount} nền tảng · ${topics.length} chủ đề`} />
      <div className="filters" style={{ marginBottom: 20 }}>
        <label className="field" style={{ flex: '1 1 320px' }}>
          <span>Tìm kênh</span>
          <input className="input" placeholder="Tên kênh hoặc người phụ trách" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select label="Nền tảng" value={platform} onChange={setPlatform} options={[
          { value: 'all', label: 'Tất cả' }, { value: 'facebook', label: 'Facebook' }, { value: 'youtube', label: 'YouTube' }, { value: 'tiktok', label: 'TikTok' },
        ]} />
        <Select label="Chủ đề" value={topic} onChange={setTopic} options={[{ value: 'all', label: 'Tất cả' }, ...topics.map((t) => ({ value: t.id, label: t.name }))]} />
        <Select label="Phụ trách" value={owner} onChange={setOwner} options={[
          { value: 'all', label: 'Tất cả' }, ...users.filter((u) => u.role === 'staff').map((u) => ({ value: u.id, label: u.name })),
        ]} />
        <Select label="Kết nối" value={access} onChange={setAccess} options={[
          { value: 'all', label: 'Tất cả' }, { value: 'ok', label: 'Tốt' }, { value: 'missing_permission', label: 'Thiếu quyền' },
          { value: 'testing', label: 'Đang thử API' }, { value: 'disconnected', label: 'Mất kết nối' }, { value: 'hidden', label: 'Kênh đã ẩn' },
        ]} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <SortTh k="name" sort={sort} toggle={toggle} num={false}>Kênh</SortTh>
                <th>Nền tảng</th>
                <th>Chủ đề</th>
                <th>Phụ trách</th>
                <SortTh k="followers" sort={sort} toggle={toggle}>Follow</SortTh>
                <SortTh k="views7" sort={sort} toggle={toggle}>View 7 ngày</SortTh>
                <SortTh k="pct" sort={sort} toggle={toggle}>So tuần trước</SortTh>
                <SortTh k="lastPost" sort={sort} toggle={toggle} num={false}>Đăng gần nhất</SortTh>
                <th>Kết nối</th>
              </tr>
            </thead>
            <tbody>
              {paged.slice.map(({ c, followers, views7, pct, lastPost }) => {
                const idle = TODAY_INDEX - lastPost
                return (
                  <tr key={c.id} className="clickable" onClick={() => nav(`/kenh/${c.id}`)}>
                    <td><Link className="title" to={`/kenh/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.name}</Link></td>
                    <td>{PLATFORM_LABEL[c.platform]}</td>
                    <td>{topicName(c.topicId)}</td>
                    <td>{userName(c.ownerUserId)}</td>
                    <td className="num">{fmtShort(followers)}</td>
                    <td className="num strong">{fmtShort(views7)}</td>
                    <td className={`num ${pct == null ? '' : pct >= 0 ? 'up' : 'down'}`}>{pct == null ? <span title="Kênh mới, chưa đủ 14 ngày dữ liệu" style={{ color: 'var(--subtle)' }}>Kênh mới</span> : fmtSignedPct(pct)}</td>
                    <td className={lastPost >= 0 && idle >= settings.noPostDays ? 'warn-text' : ''}>{lastPost < 0 ? 'Chưa có' : relDay(lastPost)}</td>
                    <td><ChannelAccessBadge ch={c} /></td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="empty">Không có kênh phù hợp bộ lọc</td></tr>}
            </tbody>
          </table>
        </div>
        <Pager {...paged} total={rows.length} unit="kênh" />
      </div>
    </>
  )
}
