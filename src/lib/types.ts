export type Platform = 'facebook' | 'youtube' | 'tiktok'
export type ConnectionKind = 'fb_bm' | 'google_oauth' | 'tiktok_business'
export type ConnectionStatus = 'active' | 'missing_permission' | 'error' | 'testing'
export type ChannelStatus = 'active' | 'hidden' | 'disconnected'
/** Tình trạng truy cập số liệu của riêng kênh (một BM có thể thiếu quyền trên vài page). */
export type ChannelAccess = 'ok' | 'missing_permission' | 'testing' | 'disconnected'
export type VideoFormat = '9:16' | '16:9'
export type Role = 'admin' | 'manager' | 'staff' | 'tech'
export type AlertType = 'view_drop' | 'no_post' | 'token_error' | 'token_expiring' | 'job_error'
export type AlertStatus = 'new' | 'seen' | 'resolved'
export type JobStatus = 'running' | 'success' | 'partial' | 'failed'

export interface User {
  id: string
  name: string
  role: Role
}

export interface Topic {
  id: string
  name: string
}

export interface Connection {
  id: string
  platform: Platform
  kind: ConnectionKind
  name: string
  externalId: string
  /** Token không bao giờ được giữ ở client; chỉ biết đã có token hay chưa. */
  hasToken: boolean
  tokenExpiresAt: string | null
  scopes: string[]
  status: ConnectionStatus
  lastCheckedAt: string
  lastError: string | null
}

export interface Channel {
  id: string
  connectionId: string
  platform: Platform
  externalId: string
  name: string
  url: string
  topicId: string
  ownerUserId: string
  status: ChannelStatus
  access: ChannelAccess
  accessError: string | null
  /** Chỉ số ngày (dayIndex) bắt đầu có dữ liệu. */
  firstDay: number
  lastSyncedAt: string
}

/** Chuỗi số liệu theo ngày của một kênh (bảng channel_daily_stats), đánh chỉ số theo dayIndex. */
export interface ChannelSeries {
  followers: number[]
  views: number[]
  reach: number[]
  engagements: number[]
}

export interface Video {
  id: string
  channelId: string
  externalId: string
  title: string
  url: string
  format: VideoFormat
  durationS: number
  /** dayIndex của ngày đăng + giờ đăng (0–23.99). */
  publishedDay: number
  publishedHour: number
  contentCode: string
  /** Tham số đường cong view cộng dồn: total × (1 − e^(−tuổi/tau)). */
  totalViews: number
  tau: number
  likeRate: number
  commentRate: number
  shareRate: number
  avgWatchS: number
}

export interface VideoStatsAt {
  views: number
  likes: number
  comments: number
  shares: number
  avgWatchS: number
}

export interface JobRunError {
  id: string
  runId: string
  channelId: string
  errorCode: string
  message: string
  retriedAt: string | null
  retryStatus: 'success' | 'failed' | null
}

export interface JobRun {
  id: string
  startedAt: string
  finishedAt: string | null
  status: JobStatus
  okCount: number
  errorCount: number
  maxRateLimitPct: number
  triggeredBy: string
  errors: JobRunError[]
}

export interface Alert {
  id: string
  type: AlertType
  channelId?: string
  connectionId?: string
  runId?: string
  message: string
  status: AlertStatus
  dedupeKey: string
  createdAt: string
  resolvedBy?: string
  resolvedAt?: string
}

export interface AlertState {
  status: AlertStatus
  message?: string
  type?: AlertType
  channelId?: string
  connectionId?: string
  runId?: string
  resolvedBy?: string
  resolvedAt?: string
}

export interface MonthlyTarget {
  scopeType: 'all' | 'topic'
  /** Với scopeType 'all': chỉ dùng total. Với 'topic': mục tiêu từng chủ đề. */
  total: number
  byTopic: Record<string, number>
}

export interface Settings {
  target: MonthlyTarget
  viewDropPct: number
  noPostDays: number
  tokenExpiryDays: number
  runTime: string
  freshVideoDays: number
  oldVideoCycle: 'weekly' | 'monthly' | 'never'
  staffScope: 'own' | 'all'
}

export interface AuditEntry {
  at: string
  userName: string
  action: string
}
