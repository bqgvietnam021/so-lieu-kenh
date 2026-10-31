import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from '../components/LineChart'
import { Delta, PageHead, Select } from '../components/ui'
import { ALERT_LABEL } from '../lib/alerts'
import { fmtDay, fmtShort, fmtPct, fmtSignedPct, LAST_DAY, monthRange, TODAY_INDEX } from '../lib/format'
import { forecastMonth, newFollowers, sumRange, weekOverWeek } from '../lib/metrics'
import { SERIES, useStore, VIDEOS } from '../lib/store'

const MONTHS = [
  { value: '2026-10', label: 'Tháng 10/2026' },
  { value: '2026-09', label: 'Tháng 9/2026' },
  { value: '2026-08', label: 'Tháng 8/2026' },
]

export function Overview() {
  const { visibleChannels, topics, settings, alerts } = useStore()
  const [month, setMonth] = useState('2026-10')
  const [platform, setPlatform] = useState('all')
  const [topic, setTopic] = useState('all')

  const data = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const r = monthRange(y, m)
    const prev = m === 1 ? monthRange(y - 1, 12) : monthRange(y, m - 1)
    const elapsed = r.to - r.from
    const chs = visibleChannels.filter((c) => c.status !== 'hidden'
      && (platform === 'all' || c.platform === platform)
      && (topic === 'all' || c.topicId === topic))

    const daily = Array.from({ length: r.days }, (_, i) => chs.reduce((s, c) => s + (SERIES[c.id].views[r.from + i] ?? 0), 0))
    const monthViews = daily.slice(0, elapsed + 1).reduce((a, b) => a + b, 0)
    const last7 = chs.reduce((s, c) => s + sumRange(SERIES[c.id].views, r.to - 6, r.to), 0) / 7
    const daysLeft = r.end - r.to
    const forecast = forecastMonth(monthViews, last7, daysLeft)

    let target: number | null = null
    if (platform === 'all') {
      if (settings.target.scopeType === 'all') target = topic === 'all' ? settings.target.total : null
      else target = topic === 'all'
        ? Object.values(settings.target.byTopic).reduce((a, b) => a + b, 0)
        : settings.target.byTopic[topic] ?? null
    }

    const follows = chs.reduce((s, c) => s + newFollowers(SERIES[c.id], r.from, r.to), 0)
    const prevFollows = chs.reduce((s, c) => s + newFollowers(SERIES[c.id], prev.from, Math.min(prev.end, prev.from + elapsed)), 0)
    const sumEng = (from: number, to: number) => chs.reduce((s, c) => s + sumRange(SERIES[c.id].engagements, from, to), 0)
    const sumViews = (from: number, to: number) => chs.reduce((s, c) => s + sumRange(SERIES[c.id].views, from, to), 0)
    const eng = sumEng(r.from, r.to) / (monthViews || 1)
    const prevTo = Math.min(prev.end, prev.from + elapsed)
    const prevEng = sumEng(prev.from, prevTo) / (sumViews(prev.from, prevTo) || 1)

    const ids = new Set(chs.map((c) => c.id))
    const videoCount = VIDEOS.filter((v) => ids.has(v.channelId) && v.publishedDay >= r.from && v.publishedDay <= Math.min(r.end, TODAY_INDEX)).length

    let cum = 0
    const actual = daily.map((v, i) => (i <= elapsed ? (cum += v) : null))
    const targetLine = target ? daily.map((_, i) => (target! * (i + 1)) / r.days) : null
    const forecastLine = daysLeft > 0
      ? daily.map((_, i) => (i < elapsed ? null : monthViews + last7 * (i - elapsed)))
      : null

    const ranked = chs
      .filter((c) => r.to - c.firstDay + 1 >= 14)
      .map((c) => ({ c, ...weekOverWeek(SERIES[c.id], r.to) }))
    const gainers = [...ranked].sort((a, b) => b.pct - a.pct).slice(0, 5)
    const losers = [...ranked].sort((a, b) => a.pct - b.pct).slice(0, 5)

    return {
      r, monthViews, forecast, target, daysLeft, follows, followsDelta: prevFollows ? follows / prevFollows - 1 : 0,
      eng, engDelta: eng - prevEng, videoCount, channelCount: chs.length, actual, targetLine, forecastLine, gainers, losers,
    }
  }, [month, platform, topic, visibleChannels, settings])

  const { r, target } = data
  const isCurrent = data.daysLeft > 0
  const shortfall = target ? target - data.forecast : 0
  const latestAlerts = alerts.filter((a) => a.status !== 'resolved').slice(0, 4)

  return (
    <>
      <PageHead
        title="Tổng quan"
        sub={`Cập nhật lần cuối: 06:00 hôm nay · dữ liệu đến hết ${fmtDay(LAST_DAY)}`}
        actions={<>
          <Select value={month} onChange={setMonth} options={MONTHS} />
          <Select value={platform} onChange={setPlatform} options={[
            { value: 'all', label: 'Tất cả nền tảng' }, { value: 'facebook', label: 'Facebook' },
            { value: 'youtube', label: 'YouTube' }, { value: 'tiktok', label: 'TikTok' },
          ]} />
          <Select value={topic} onChange={setTopic} options={[{ value: 'all', label: 'Tất cả chủ đề' }, ...topics.map((t) => ({ value: t.id, label: t.name }))]} />
        </>}
      />

      <div className="stack">
        <div className="grid-4">
          <div className="card card-pad stat">
            <div className="label">{target ? 'View tháng / mục tiêu' : 'View tháng'}</div>
            <div className="value">{fmtShort(data.monthViews)} {target && <small>/ {fmtShort(target)}</small>}</div>
            {target ? (
              <>
                <div className="progress"><div style={{ width: `${Math.min(100, (data.monthViews / target) * 100)}%` }} /></div>
                {isCurrent ? (
                  <div className={shortfall > 0 ? 'note warn-text' : 'note up'} style={{ fontWeight: 600 }}>
                    Dự báo cuối tháng: {fmtShort(data.forecast)}
                    {shortfall > 0 ? ` – thiếu ${fmtShort(shortfall)}` : ' – đạt mục tiêu'}
                  </div>
                ) : (
                  <div className="note">Đạt {fmtPct(data.monthViews / target, 0)} mục tiêu</div>
                )}
              </>
            ) : (
              <div className="note">
                {isCurrent && <>Dự báo cuối tháng: {fmtShort(data.forecast)}<br /></>}
                Chưa đặt mục tiêu cho bộ lọc này
              </div>
            )}
          </div>
          <div className="card card-pad stat">
            <div className="label">Follow mới</div>
            <div className="value">{fmtShort(data.follows)}</div>
            <div className="note"><Delta value={data.followsDelta} suffix=" so với tháng trước" /></div>
          </div>
          <div className="card card-pad stat">
            <div className="label">Tỷ lệ tương tác</div>
            <div className="value">{fmtPct(data.eng)}</div>
            <div className="note"><Delta value={data.engDelta} points suffix=" so với tháng trước" /></div>
          </div>
          <div className="card card-pad stat">
            <div className="label">Video đã đăng</div>
            <div className="value">{data.videoCount}</div>
            <div className="note">trên {data.channelCount} kênh</div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-title">
            Tiến độ view cộng dồn trong tháng
            <div className="legend">
              <span><i />Thực tế</span>
              {data.targetLine && <span><i className="dash" style={{ borderTopColor: 'var(--target)' }} />Mục tiêu</span>}
              {data.forecastLine && <span><i className="dash" style={{ borderTopColor: 'var(--down)' }} />Dự báo</span>}
            </div>
          </div>
          <LineChart
            height={440}
            formatY={fmtShort}
            pointLabel={(i) => fmtDay(r.from + i, true)}
            xLabels={[{ i: 0, text: fmtDay(r.from) }, { i: 14, text: fmtDay(r.from + 14) }, { i: r.days - 1, text: fmtDay(r.end) }]}
            series={[
              ...(data.targetLine ? [{ values: data.targetLine, color: '#8a909b', dashed: true, label: 'Mục tiêu' }] : []),
              ...(data.forecastLine ? [{ values: data.forecastLine, color: '#c2540a', dashed: true, label: 'Dự báo' }] : []),
              { values: data.actual, color: '#1f5fd6', label: 'Thực tế' },
            ]}
          />
        </div>

        <div className="grid-3">
          <RankCard title="Kênh tăng mạnh (7 ngày)" rows={data.gainers} />
          <RankCard title="Kênh tụt (7 ngày)" rows={data.losers} />
          <div className="card card-pad">
            <div className="card-title">Cảnh báo mới <Link to="/canh-bao" style={{ fontSize: 14, fontWeight: 400, textDecoration: 'underline' }}>Xem tất cả</Link></div>
            {latestAlerts.length === 0 && <div className="empty">Không có cảnh báo cần xử lý</div>}
            {latestAlerts.map((a) => (
              <div key={a.id} className="alert-mini">
                <div className={`kind ${a.type === 'view_drop' || a.type === 'token_error' ? 'hot' : ''}`}>
                  {a.type === 'token_error' || a.type === 'token_expiring' ? 'Kết nối' : a.type === 'job_error' ? 'Thu thập' : ALERT_LABEL[a.type]}
                </div>
                <div>{a.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function RankCard({ title, rows }: { title: string; rows: { c: { id: string; name: string }; cur: number; pct: number }[] }) {
  return (
    <div className="card card-pad">
      <div className="card-title">{title}</div>
      <ul className="rank-list">
        {rows.map(({ c, cur, pct }) => (
          <li key={c.id}>
            <Link to={`/kenh/${c.id}`} style={{ color: 'var(--text)' }}>{c.name}</Link>
            <span className="num">{fmtShort(cur)}</span>
            <span className={`pct ${pct >= 0 ? 'up' : 'down'}`}>{fmtSignedPct(pct)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
