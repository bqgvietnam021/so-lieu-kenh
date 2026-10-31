// Bộ tính cảnh báo (mục 9). Chạy lại mỗi khi dữ liệu / ngưỡng thay đổi; trạng thái lưu theo dedupe_key.
import { isoAt, LAST_DAY, TODAY_INDEX } from './format'
import { weekOverWeek } from './metrics'
import type { Alert, AlertState, Channel, ChannelSeries, Connection, JobRun, Settings, Video } from './types'

interface Input {
  channels: Channel[]
  connections: Connection[]
  jobRuns: JobRun[]
  settings: Settings
  alertStates: Record<string, AlertState>
  series: Record<string, ChannelSeries>
  videos: Video[]
}

export const ALERT_LABEL: Record<Alert['type'], string> = {
  view_drop: 'Kênh tụt view',
  no_post: 'Không đăng bài',
  token_error: 'Token lỗi',
  token_expiring: 'Token sắp hết hạn',
  job_error: 'Job lỗi',
}

/** Kênh mới (ít hơn 14 ngày dữ liệu) không xét cảnh báo tụt view. */
const MIN_DAYS_FOR_DROP = 14

export function computeAlerts({ channels, connections, jobRuns, settings, alertStates, series, videos }: Input): Alert[] {
  const out: Alert[] = []
  const push = (a: Omit<Alert, 'id' | 'status'>) => {
    const st = alertStates[a.dedupeKey]
    out.push({ ...a, id: a.dedupeKey, status: st?.status ?? 'new', resolvedBy: st?.resolvedBy, resolvedAt: st?.resolvedAt })
  }

  const lastPost: Record<string, number> = {}
  for (const v of videos) lastPost[v.channelId] = Math.max(lastPost[v.channelId] ?? -1, v.publishedDay)

  const tracked = channels.filter((c) => c.status !== 'hidden')
  for (const c of tracked) {
    const s = series[c.id]
    if (LAST_DAY - c.firstDay + 1 >= MIN_DAYS_FOR_DROP) {
      const { pct } = weekOverWeek(s)
      if (pct <= -settings.viewDropPct / 100) {
        push({
          type: 'view_drop', channelId: c.id, dedupeKey: `view_drop:${c.id}`,
          message: `${c.name} giảm ${Math.round(-pct * 100)}% view so với tuần trước`,
          createdAt: isoAt(TODAY_INDEX, 6, 5),
        })
      }
    }
    const lp = lastPost[c.id]
    const idle = lp == null ? TODAY_INDEX - c.firstDay : TODAY_INDEX - lp
    if (idle >= settings.noPostDays) {
      push({
        type: 'no_post', channelId: c.id, dedupeKey: `no_post:${c.id}`,
        message: `${c.name} chưa đăng video mới trong ${idle} ngày`,
        createdAt: isoAt(TODAY_INDEX, 6, 5),
      })
    }
  }

  for (const conn of connections) {
    const affected = channels.filter((c) => c.connectionId === conn.id && c.access === 'missing_permission').length
    if (conn.status === 'missing_permission' || conn.status === 'error') {
      push({
        type: 'token_error', connectionId: conn.id, dedupeKey: `token_error:${conn.id}`,
        message: `${conn.name} ${conn.lastError?.replace(/^\(#\d+\)\s*/, '').toLowerCase() ?? 'lỗi token'}${affected ? ` – ${affected} kênh không cập nhật` : ''}`,
        createdAt: isoAt(TODAY_INDEX, 6, 0),
      })
    }
    if (conn.tokenExpiresAt) {
      const daysLeft = Math.ceil((Date.parse(conn.tokenExpiresAt) - Date.parse(isoAt(TODAY_INDEX, 0))) / 86_400_000)
      if (daysLeft <= settings.tokenExpiryDays) {
        push({
          type: 'token_expiring', connectionId: conn.id, dedupeKey: `token_expiring:${conn.id}`,
          message: `Token ${conn.name} hết hạn sau ${daysLeft} ngày`,
          createdAt: isoAt(TODAY_INDEX, 6, 0),
        })
      }
    }
  }

  const latest = jobRuns.find((r) => r.status !== 'running')
  if (latest) {
    const pending = latest.errors.filter((e) => e.retryStatus !== 'success')
    if (pending.length) {
      const hm = new Date(Date.parse(latest.startedAt) + 7 * 3600_000).toISOString().slice(11, 16)
      push({
        type: 'job_error', runId: latest.id, dedupeKey: `job_error:${latest.id}`,
        message: `Job ${hm}: ${pending.length} kênh lỗi khi lấy số liệu video`,
        createdAt: latest.finishedAt ?? latest.startedAt,
      })
    }
  }

  // Cảnh báo đã xử lý mà điều kiện đã hết (tự đóng) vẫn hiện ở tab "Đã xử lý".
  const live = new Set(out.map((a) => a.dedupeKey))
  for (const [key, st] of Object.entries(alertStates)) {
    if (st.status === 'resolved' && !live.has(key) && st.message && st.type) {
      out.push({
        id: key, dedupeKey: key, type: st.type, message: st.message, status: 'resolved',
        channelId: st.channelId, connectionId: st.connectionId, runId: st.runId,
        createdAt: st.resolvedAt ?? isoAt(TODAY_INDEX, 6), resolvedBy: st.resolvedBy, resolvedAt: st.resolvedAt,
      })
    }
  }

  const order: Alert['type'][] = ['view_drop', 'token_error', 'token_expiring', 'job_error', 'no_post']
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || order.indexOf(a.type) - order.indexOf(b.type))
}
