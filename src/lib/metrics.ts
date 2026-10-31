// Công thức chỉ số (mục 7 tài liệu mô tả). Mọi số liệu tính đến hết ngày hôm qua (LAST_DAY).
import { LAST_DAY } from './format'
import type { ChannelSeries, Video, VideoStatsAt } from './types'

export function sumRange(arr: number[], from: number, to: number) {
  let s = 0
  for (let d = Math.max(0, from); d <= Math.min(to, arr.length - 1); d++) s += arr[d]
  return s
}

/** View cộng dồn của video vào cuối ngày `day` (snapshot video_daily_stats). */
export function videoStatsAt(v: Video, day = LAST_DAY): VideoStatsAt {
  const age = day + 1 - (v.publishedDay + v.publishedHour / 24)
  const views = age <= 0 ? 0 : Math.round(v.totalViews * (1 - Math.exp(-age / v.tau)))
  return {
    views,
    likes: Math.round(views * v.likeRate),
    comments: Math.round(views * v.commentRate),
    shares: Math.round(views * v.shareRate),
    avgWatchS: v.avgWatchS,
  }
}

/** View video trong ngày = cộng dồn hôm nay − hôm qua. */
export function videoViewsOnDay(v: Video, day: number) {
  return videoStatsAt(v, day).views - videoStatsAt(v, day - 1).views
}

export function engagementRate(s: VideoStatsAt) {
  return s.views ? (s.likes + s.comments + s.shares) / s.views : 0
}

/** % so tuần trước: (view 7 ngày gần nhất − 7 ngày trước đó) / 7 ngày trước đó. */
export function weekOverWeek(s: ChannelSeries, end = LAST_DAY) {
  const cur = sumRange(s.views, end - 6, end)
  const prev = sumRange(s.views, end - 13, end - 7)
  return { cur, prev, pct: prev ? (cur - prev) / prev : 0 }
}

/** Follow mới = followers cuối kỳ − followers đầu kỳ. */
export function newFollowers(s: ChannelSeries, from: number, to: number) {
  const start = from - 1 >= 0 ? s.followers[from - 1] : s.followers[from]
  return (s.followers[to] ?? 0) - (start ?? 0)
}

/** Dự báo cuối tháng = view tháng + TB view/ngày 7 ngày gần nhất × số ngày còn lại. */
export function forecastMonth(monthViews: number, last7Avg: number, daysLeft: number) {
  return monthViews + last7Avg * Math.max(0, daysLeft)
}
