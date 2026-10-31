import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LineChart } from '../components/LineChart'
import { PlayIcon } from '../components/ui'
import { fmtDay, fmtDuration, fmtShort, LAST_DAY } from '../lib/format'
import { videoStatsAt } from '../lib/metrics'
import { useStore, VIDEOS } from '../lib/store'

const PLATFORM_FORMAT: Record<string, string> = { facebook: 'Facebook Reels', youtube: 'YouTube', tiktok: 'TikTok' }

export function VideoDetail() {
  const { id } = useParams()
  // key theo id để ô "Mã video" khởi tạo lại khi chuyển sang video khác.
  return <VideoDetailInner key={id} id={id} />
}

function VideoDetailInner({ id }: { id?: string }) {
  const { visibleChannels, contentCodes, setContentCode } = useStore()
  const v = VIDEOS.find((x) => x.id === id)
  const ch = v && visibleChannels.find((c) => c.id === v.channelId)
  const saved = (v && contentCodes[v.id]) ?? ''
  const [code, setCode] = useState(saved)
  const [err, setErr] = useState('')

  if (!v || !ch) {
    return <div className="card empty">Không tìm thấy video hoặc bạn không có quyền xem. <Link to="/video">Về danh sách video</Link></div>
  }

  const st = videoStatsAt(v)
  // Biểu đồ: view cộng dồn từ ngày đăng (ngày 0) đến hôm qua.
  const ages = Math.max(1, LAST_DAY - v.publishedDay + 1)
  const curve = [0, ...Array.from({ length: ages }, (_, i) => videoStatsAt(v, v.publishedDay + i).views)]
  const hh = Math.floor(v.publishedHour)
  const mm = Math.floor((v.publishedHour % 1) * 60)
  const pubTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  const platformLabel = ch.platform === 'facebook' && v.format === '16:9' ? 'Facebook Video' : PLATFORM_FORMAT[ch.platform]
  const short = v.title.split(':')[0]

  const save = () => {
    const c = code.trim().toUpperCase()
    if (c && !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(c)) {
      setErr('Mã gồm 3–32 ký tự chữ, số, gạch nối hoặc gạch dưới')
      return
    }
    const dup = c && VIDEOS.find((x) => x.id !== v.id && contentCodes[x.id] === c)
    if (dup) {
      setErr(`Mã này đã gắn cho video "${dup.title}"`)
      return
    }
    setErr('')
    setCode(c)
    setContentCode(v.id, c)
  }

  return (
    <>
      <div className="crumbs"><Link to="/video">Video</Link> / {short}</div>
      <div className="video-detail">
        <div>
          <a href={v.url} target="_blank" rel="noreferrer" className={`poster ${v.format === '16:9' ? 'wide' : ''}`} aria-label="Mở video gốc">
            <PlayIcon size={48} />
          </a>
          <a className="btn" href={v.url} target="_blank" rel="noreferrer" style={{ width: '100%', marginTop: 16, color: 'inherit', textDecoration: 'none' }}>Mở video gốc ↗</a>
        </div>
        <div className="stack">
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 10 }}>{v.title}</h1>
            <div className="chips">
              <Link to={`/kenh/${ch.id}`} className="badge info">{ch.name}</Link>
              <span className="badge neutral">{platformLabel}</span>
              <span className="badge neutral">{v.format} · {v.durationS >= 60 && v.format === '16:9' ? fmtDuration(v.durationS) : `${v.durationS} giây`}</span>
              <span className="badge neutral">Đăng {fmtDay(v.publishedDay, true)} {pubTime}</span>
            </div>
          </div>
          <div className="grid-5">
            {[
              ['View', fmtShort(st.views)], ['Like', fmtShort(st.likes)], ['Comment', fmtShort(st.comments)],
              ['Share', fmtShort(st.shares)], ['Xem TB', fmtDuration(st.avgWatchS)],
            ].map(([l, val]) => (
              <div key={l} className="card stat" style={{ padding: '16px 20px' }}>
                <div className="label">{l}</div>
                <div className="value" style={{ marginBottom: 0 }}>{val}</div>
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <div className="card-title">View cộng dồn kể từ khi đăng</div>
            <LineChart
              height={330}
              formatY={fmtShort}
              pointLabel={(i) => `Ngày ${i} · ${fmtDay(v.publishedDay + Math.max(0, i - 1))}`}
              xLabels={[{ i: 0, text: 'Ngày 0' }, { i: curve.length - 1, text: `Ngày ${curve.length - 1}` }]}
              series={[{ values: curve, color: '#1f5fd6', label: 'View' }]}
            />
          </div>
          <div className="card card-pad">
            <label className="field">
              <span>Mã video (liên kết Content Hub)</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <input className="input" style={{ flex: 1 }} placeholder="[MÃ VIDEO]" value={code}
                  onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
                <button className="btn" onClick={save} disabled={code.trim().toUpperCase() === saved}>Lưu mã</button>
              </div>
              {err && <span className="error-text">{err}</span>}
            </label>
          </div>
        </div>
      </div>
    </>
  )
}
