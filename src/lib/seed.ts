// Dữ liệu demo sinh tất định (cùng seed → cùng số liệu), thay cho DB thật ở giai đoạn giao diện.
import { DAY_COUNT, LAST_DAY, isoAt, monthRange, TODAY_INDEX } from './format'
import type {
  Channel, ChannelSeries, Connection, JobRun, JobRunError, Platform, Topic, User, Video, VideoFormat,
} from './types'

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(20261031)
const between = (a: number, b: number) => a + rnd() * (b - a)
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]

export const USERS: User[] = [
  { id: 'u-duc', name: 'Đức', role: 'admin' },
  { id: 'u-linh', name: 'Linh', role: 'manager' },
  { id: 'u-ha', name: 'Hà', role: 'staff' },
  { id: 'u-nam', name: 'Nam', role: 'staff' },
  { id: 'u-tuan', name: 'Tuấn', role: 'staff' },
  { id: 'u-minh', name: 'Minh', role: 'tech' },
]
const STAFF = ['u-ha', 'u-nam', 'u-tuan']

export const SEED_TOPICS: Topic[] = [
  { id: 't-ga', name: 'Gà' },
  { id: 't-vit', name: 'Vịt' },
  { id: 't-lon', name: 'Lợn' },
  { id: 't-bo', name: 'Bò' },
]

export const SEED_CONNECTIONS: Connection[] = [
  {
    id: 'c-bm01', platform: 'facebook', kind: 'fb_bm', name: 'BM Chăn nuôi 01', externalId: '1029384756102938',
    hasToken: true, tokenExpiresAt: null, scopes: ['pages_show_list', 'pages_read_engagement', 'read_insights'],
    status: 'active', lastCheckedAt: isoAt(TODAY_INDEX, 6), lastError: null,
  },
  {
    id: 'c-bm02', platform: 'facebook', kind: 'fb_bm', name: 'BM Chăn nuôi 02', externalId: '2038475610293847',
    hasToken: true, tokenExpiresAt: null, scopes: ['pages_show_list', 'pages_read_engagement', 'read_insights'],
    status: 'active', lastCheckedAt: isoAt(TODAY_INDEX, 6), lastError: null,
  },
  {
    id: 'c-bm03', platform: 'facebook', kind: 'fb_bm', name: 'BM Chăn nuôi 03', externalId: '3047561029384756',
    hasToken: true, tokenExpiresAt: null, scopes: ['pages_show_list', 'pages_read_engagement'],
    status: 'missing_permission', lastCheckedAt: isoAt(TODAY_INDEX, 6),
    lastError: '(#10) Thiếu quyền read_insights',
  },
  {
    id: 'c-yt01', platform: 'youtube', kind: 'google_oauth', name: 'YouTube Bình Minh', externalId: 'UC8bMinhChanNuoi',
    hasToken: true, tokenExpiresAt: null, scopes: ['youtube.readonly', 'yt-analytics.readonly'],
    status: 'active', lastCheckedAt: isoAt(TODAY_INDEX, 6), lastError: null,
  },
  {
    id: 'c-tt01', platform: 'tiktok', kind: 'tiktok_business', name: 'TikTok Business', externalId: '7301928374650',
    hasToken: true, tokenExpiresAt: isoAt(TODAY_INDEX + 5, 0), scopes: ['user.info.basic', 'video.list'],
    status: 'testing', lastCheckedAt: isoAt(TODAY_INDEX - 1, 6), lastError: null,
  },
]

const CONN_SLOTS: Record<string, number> = { 'c-bm01': 42, 'c-bm02': 38, 'c-bm03': 29, 'c-yt01': 9, 'c-tt01': 6 }
const CONN_PLATFORM: Record<string, Platform> = {
  'c-bm01': 'facebook', 'c-bm02': 'facebook', 'c-bm03': 'facebook', 'c-yt01': 'youtube', 'c-tt01': 'tiktok',
}

const NAME_TEMPLATES: Record<string, string[]> = {
  't-ga': ['Gà Thả Vườn', 'Gà Đông Tảo', 'Gà Ri Lai', 'Nuôi Gà Thịt'],
  't-vit': ['Kỹ Thuật Nuôi Vịt', 'Nuôi Vịt Siêu Trứng', 'Vịt Bầu Đồng'],
  't-lon': ['Chăn Nuôi Lợn Sạch', 'Lợn Rừng Lai', 'Nuôi Heo Thịt'],
  't-bo': ['Nuôi Bò Vỗ Béo', 'Nuôi Bò Sinh Sản', 'Bò Ba Ban'],
}
const TOPIC_COUNT: Record<string, number> = { 't-ga': 42, 't-vit': 31, 't-lon': 28, 't-bo': 23 }

const TITLES: Record<string, string[]> = {
  't-ga': [
    'Úm gà con 7 ngày đầu: 5 lỗi hay gặp', 'Chọn gà giống khỏe từ ngày đầu', 'Pha thuốc úm đúng liều cho gà con',
    'Đệm lót sinh học cho chuồng gà', 'Gà rù mùa lạnh: dấu hiệu sớm', 'Thức ăn tự trộn cho gà thả vườn',
    'Lịch vắc-xin cho gà thịt', 'Gà mái đẻ ít trứng: nguyên nhân', 'Làm máng uống tự động cho gà',
    'Nuôi gà bằng giun quế', 'Phòng bệnh cầu trùng cho gà', 'Ấp trứng gà bằng máy mini',
    'Gà bị khò khè xử lý thế nào', 'Thiết kế chuồng gà 500 con', 'Bí quyết gà da vàng thịt chắc',
  ],
  't-vit': [
    'Chuồng vịt khô ráo mùa mưa', 'Vịt đẻ trứng ít: nguyên nhân thường gặp', 'Úm vịt con không cần đèn',
    'Khẩu phần cho vịt đẻ cao sản', 'Phòng dịch tả vịt đúng cách', 'Nuôi vịt trên đệm lót sinh học',
    'Chọn vịt giống siêu trứng', 'Vịt bị liệt chân xử lý ra sao', 'Ao nuôi vịt kết hợp cá',
    'Bổ sung canxi cho vịt đẻ', 'Lịch tiêm phòng cho vịt thịt', 'Vịt chạy đồng: kinh nghiệm thực tế',
  ],
  't-lon': [
    'Phòng tiêu chảy cho lợn con sau cai sữa', 'Ủ thức ăn lên men cho lợn', 'Chuồng lợn sạch không mùi',
    'Lợn nái đẻ khó: cách hỗ trợ', 'Vỗ béo lợn thịt 90 ngày', 'Men vi sinh cho chuồng lợn',
    'Phòng dịch tả lợn châu Phi', 'Lợn ăn kém mùa nóng', 'Thiết kế hệ thống làm mát chuồng lợn',
    'Cám tự phối giảm 20% chi phí', 'Thiến lợn đực đúng kỹ thuật', 'Nuôi lợn rừng lai thả vườn',
  ],
  't-bo': [
    'Khẩu phần vỗ béo bò 90 ngày', 'Lịch tiêm phòng cho bò sinh sản', 'Ủ chua cỏ cho bò mùa khô',
    'Chọn bò giống Ba Ban', 'Bò chướng hơi: xử lý nhanh', 'Trồng cỏ voi năng suất cao',
    'Phối giống bò bằng tinh nhân tạo', 'Bò bị viêm da nổi cục', 'Chuồng bò thoáng mát',
    'Bò con tiêu chảy phân trắng', 'Tính lãi nuôi 10 con bò vỗ béo', 'Rơm ủ urê cho bò',
  ],
}

interface FeaturedSpec {
  name: string
  conn: string
  topic: string
  owner: string
  weight: number
  /** % thay đổi view 7 ngày gần nhất so với 7 ngày trước. */
  change: number
  /** Số ngày tính đến hôm nay kể từ video gần nhất (null = đăng đều). */
  lastPostAgo?: number
  access?: Channel['access']
  accessError?: string
  postRate?: number
}

const FEATURED: FeaturedSpec[] = [
  { name: 'Gà Thả Vườn 01', conn: 'c-bm01', topic: 't-ga', owner: 'u-ha', weight: 1, change: 0.38, lastPostAgo: 1, postRate: 0.9 },
  { name: 'Nuôi Bò Vỗ Béo 02', conn: 'c-bm01', topic: 't-bo', owner: 'u-nam', weight: 0.66, change: 0.27, lastPostAgo: 1 },
  { name: 'Kỹ Thuật Nuôi Vịt 03', conn: 'c-bm02', topic: 't-vit', owner: 'u-ha', weight: 0.5, change: 0.22, lastPostAgo: 0 },
  { name: 'Chăn Nuôi Lợn Sạch 01', conn: 'c-yt01', topic: 't-lon', owner: 'u-tuan', weight: 0.45, change: 0.19, lastPostAgo: 2 },
  { name: 'Gà Thả Vườn 04', conn: 'c-bm02', topic: 't-ga', owner: 'u-nam', weight: 0.32, change: 0.15, lastPostAgo: 1 },
  {
    name: 'Chăn Nuôi Lợn Sạch 06', conn: 'c-bm03', topic: 't-lon', owner: 'u-tuan', weight: 0.11, change: -0.33, lastPostAgo: 3,
    access: 'missing_permission', accessError: '(#10) Thiếu quyền read_insights',
  },
  { name: 'Nuôi Bò Sinh Sản 03', conn: 'c-tt01', topic: 't-bo', owner: 'u-nam', weight: 0.095, change: -0.24, lastPostAgo: 1, access: 'testing' },
  { name: 'Nuôi Vịt Siêu Trứng 05', conn: 'c-bm01', topic: 't-vit', owner: 'u-ha', weight: 0.075, change: -0.41, lastPostAgo: 6 },
  {
    name: 'Gà Đông Tảo 02', conn: 'c-tt01', topic: 't-ga', owner: 'u-tuan', weight: 0.06, change: -0.29, lastPostAgo: 5,
    access: 'testing', accessError: 'TikTok API: 403 – tài khoản chưa cấp quyền',
  },
  {
    name: 'Kỹ Thuật Nuôi Vịt 07', conn: 'c-bm03', topic: 't-vit', owner: 'u-ha', weight: 0.045, change: -0.21, lastPostAgo: 7,
    access: 'missing_permission', accessError: '(#10) Thiếu quyền read_insights',
  },
]

/** Tổng view tháng 10 (01–30/10) toàn bộ kênh sau khi hiệu chỉnh. */
const OCT_TOTAL = 1_830_000

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function channelUrl(platform: Platform, name: string, extId: string) {
  if (platform === 'youtube') return `https://www.youtube.com/channel/${extId}`
  if (platform === 'tiktok') return `https://www.tiktok.com/@${slug(name).replace(/-/g, '')}`
  return `https://www.facebook.com/${extId}`
}

interface Spec extends FeaturedSpec {
  firstDay: number
}

function buildSpecs(): Spec[] {
  const specs: Spec[] = FEATURED.map((f) => ({ ...f, firstDay: 0 }))
  const used = new Set(specs.map((s) => s.name))
  const slotsLeft = { ...CONN_SLOTS }
  for (const s of specs) slotsLeft[s.conn]--
  const topicsLeft = { ...TOPIC_COUNT }
  for (const s of specs) topicsLeft[s.topic]--

  const topicQueue: string[] = []
  for (const [t, n] of Object.entries(topicsLeft)) for (let i = 0; i < n; i++) topicQueue.push(t)
  topicQueue.sort(() => rnd() - 0.5)
  const connQueue: string[] = []
  for (const [c, n] of Object.entries(slotsLeft)) for (let i = 0; i < n; i++) connQueue.push(c)
  connQueue.sort(() => rnd() - 0.5)

  const counters: Record<string, number> = {}
  topicQueue.forEach((topic, i) => {
    let name = ''
    do {
      const tpl = pick(NAME_TEMPLATES[topic])
      counters[tpl] = (counters[tpl] ?? 0) + 1
      name = `${tpl} ${String(counters[tpl]).padStart(2, '0')}`
    } while (used.has(name))
    used.add(name)
    const conn = connQueue[i]
    const rank = i + 1
    specs.push({
      name, conn, topic,
      owner: pick(STAFF),
      weight: 0.4 * Math.pow(rank, -0.75) * between(0.7, 1.3),
      change: between(-0.12, 0.14),
      access: conn === 'c-tt01' ? 'testing' : 'ok',
      // Hai kênh mới tạo gần đây (chưa đủ 14 ngày dữ liệu → không xét cảnh báo tụt view).
      firstDay: i === 40 || i === 77 ? LAST_DAY - 9 : 0,
    })
  })
  return specs
}

function seriesFor(spec: Spec, scale: number): ChannelSeries {
  const base = spec.weight * scale
  const weekly = [1.06, 0.97, 0.95, 0.98, 1.0, 1.08, 1.12]
  const followRate = between(0.006, 0.013)
  const engRate = between(0.032, 0.058)
  const reachMul = between(1.6, 2.4)
  const slow = between(-0.0015, 0.0035)
  let followers = Math.round(base * between(9, 16) * 0.6) + 300
  const out: ChannelSeries = { followers: [], views: [], reach: [], engagements: [] }
  for (let d = 0; d < DAY_COUNT; d++) {
    if (d < spec.firstDay) {
      out.followers.push(0); out.views.push(0); out.reach.push(0); out.engagements.push(0)
      continue
    }
    // 7 ngày gần nhất mang mức thay đổi định sẵn so với 7 ngày trước đó.
    const recent = d > LAST_DAY - 7 ? 1 + spec.change : 1
    const trend = 1 + slow * (d - LAST_DAY)
    const v = Math.max(0, Math.round(base * recent * trend * weekly[d % 7] * between(0.88, 1.12)))
    followers += Math.round(v * followRate * between(0.6, 1.4))
    out.views.push(v)
    out.reach.push(Math.round(v * reachMul))
    out.engagements.push(Math.round(v * engRate * (d > LAST_DAY - 30 ? 0.97 : 1) * between(0.85, 1.15)))
    out.followers.push(followers)
  }
  return out
}

export interface SeedData {
  channels: Channel[]
  series: Record<string, ChannelSeries>
  videos: Video[]
  jobRuns: JobRun[]
}

function buildVideos(channels: Channel[], specs: Spec[], series: Record<string, ChannelSeries>): Video[] {
  const videos: Video[] = []
  const maxW = Math.max(...specs.map((s) => s.weight))
  channels.forEach((ch, idx) => {
    const spec = specs[idx]
    const s = series[ch.id]
    const avgDaily = s.views.slice(LAST_DAY - 29, LAST_DAY + 1).reduce((a, b) => a + b, 0) / 30
    const rate = spec.postRate ?? Math.min(0.85, (0.04 + 0.5 * Math.sqrt(spec.weight / maxW)) * between(0.7, 1.3))
    const lastAllowed = spec.lastPostAgo != null ? TODAY_INDEX - spec.lastPostAgo : TODAY_INDEX
    const titles = TITLES[ch.topicId] ?? TITLES['t-ga']
    let n = 0
    let prevPost = ch.firstDay - 1
    for (let d = Math.max(ch.firstDay, 0); d <= lastAllowed; d++) {
      // Kênh vận hành bình thường không để quá 4 ngày không có video.
      const forced = (d === lastAllowed && spec.lastPostAgo != null) || (d - prevPost >= 4 && d < TODAY_INDEX)
      if (!forced && rnd() > rate) continue
      prevPost = d
      if (d === TODAY_INDEX && !forced) continue
      const format: VideoFormat = ch.platform === 'youtube' && rnd() < 0.55 ? '16:9' : '9:16'
      const long = format === '16:9'
      const title = titles[(n + idx * 3) % titles.length] + (n >= titles.length ? ` (phần ${Math.floor(n / titles.length) + 1})` : '')
      n++
      videos.push({
        id: `v${videos.length + 1}`,
        channelId: ch.id,
        externalId: String(Math.floor(between(1e14, 9e14))),
        title,
        url: '',
        format,
        durationS: Math.round(long ? between(240, 900) : between(25, 90)),
        publishedDay: d,
        publishedHour: between(6, 22),
        contentCode: '',
        totalViews: Math.round(avgDaily * (1 / Math.max(rate, 0.15)) * 0.55 * Math.pow(between(0.25, 1.6), 1.4)),
        tau: long ? between(5, 14) : between(1.2, 3.5),
        likeRate: between(0.022, 0.04),
        commentRate: between(0.0025, 0.005),
        shareRate: between(0.0012, 0.0032),
        avgWatchS: long ? between(70, 240) : between(8, 28),
      })
    }
  })
  // Video tiêu biểu trên thiết kế.
  const gtv = channels[0]
  const top = videos.filter((v) => v.channelId === gtv.id && v.publishedDay === TODAY_INDEX - 3)[0]
  if (top) {
    Object.assign(top, {
      title: 'Úm gà con 7 ngày đầu: 5 lỗi hay gặp', totalViews: 98_000, tau: 1.4, durationS: 58,
      publishedHour: 19.5, likeRate: 0.0323, commentRate: 0.0043, shareRate: 0.003, avgWatchS: 24, format: '9:16',
    })
  }
  for (const v of videos) {
    const ch = channels.find((c) => c.id === v.channelId)!
    v.url = ch.platform === 'youtube'
      ? `https://www.youtube.com/watch?v=${v.externalId.slice(0, 11)}`
      : ch.platform === 'tiktok'
        ? `${ch.url}/video/${v.externalId}`
        : `https://www.facebook.com/reel/${v.externalId}`
  }
  return videos
}

function buildJobRuns(channels: Channel[]): JobRun[] {
  const runs: JobRun[] = []
  const total = channels.length
  const history = [
    { ago: 6, err: 0, mins: 10, rl: 57 },
    { ago: 5, err: 1, mins: 10, rl: 57 },
    { ago: 4, err: 0, mins: 10, rl: 58 },
    { ago: 3, err: 6, mins: 14, rl: 82 },
    { ago: 2, err: 0, mins: 11, rl: 60 },
    { ago: 1, err: 0, mins: 11, rl: 61 },
  ]
  const others = channels.filter((c) => c.access === 'ok')
  for (const h of history) {
    const day = TODAY_INDEX - h.ago
    const id = `run-${day}`
    const errors: JobRunError[] = Array.from({ length: h.err }, (_, i) => ({
      id: `${id}-e${i}`, runId: id, channelId: others[(i * 17 + day) % others.length].id,
      errorCode: i % 2 ? 'RATE_LIMIT' : 'HTTP_500',
      message: i % 2 ? '(#80001) Có quá nhiều lệnh gọi tới Page này. Đã chờ và thử lại.' : 'Graph API: 500 – An unknown error has occurred',
      retriedAt: isoAt(day, 7, 10), retryStatus: 'success',
    }))
    runs.push({
      id, startedAt: isoAt(day, 6), finishedAt: isoAt(day, 6, h.mins), status: h.err ? 'partial' : 'success',
      okCount: total - h.err, errorCount: h.err, maxRateLimitPct: h.rl, triggeredBy: 'Lịch 06:00', errors,
    })
  }
  const id = `run-${TODAY_INDEX}`
  const failing = channels.filter((c) => c.accessError)
  runs.push({
    id, startedAt: isoAt(TODAY_INDEX, 6), finishedAt: isoAt(TODAY_INDEX, 6, 12), status: 'partial',
    okCount: total - failing.length, errorCount: failing.length, maxRateLimitPct: 64, triggeredBy: 'Lịch 06:00',
    errors: failing.map((c, i) => ({
      id: `${id}-e${i}`, runId: id, channelId: c.id,
      errorCode: c.platform === 'tiktok' ? 'TIKTOK_403' : 'FB_10',
      message: c.accessError!, retriedAt: null, retryStatus: null,
    })),
  })
  return runs.reverse()
}

export function buildSeed(): SeedData {
  const specs = buildSpecs()
  // Hiệu chỉnh để tổng view tháng 10 xấp xỉ OCT_TOTAL.
  const oct = monthRange(2026, 10)
  const probe = specs.reduce((sum, s) => sum + s.weight * (oct.to - oct.from + 1), 0)
  const scale = OCT_TOTAL / probe

  const channels: Channel[] = specs.map((s, i) => {
    const platform = CONN_PLATFORM[s.conn]
    const externalId = platform === 'youtube'
      ? `UC${Math.floor(between(1e9, 9e9)).toString(36)}${i}`
      : String(Math.floor(between(1e14, 9e14)))
    return {
      id: `ch${i + 1}`,
      connectionId: s.conn,
      platform,
      externalId,
      name: s.name,
      url: channelUrl(platform, s.name, externalId),
      topicId: s.topic,
      ownerUserId: s.owner,
      status: 'active',
      access: s.access ?? 'ok',
      accessError: s.accessError ?? null,
      firstDay: s.firstDay,
      lastSyncedAt: s.accessError ? isoAt(TODAY_INDEX - 1, 6, 11) : isoAt(TODAY_INDEX, 6, 8),
    }
  })
  const series: Record<string, ChannelSeries> = {}
  channels.forEach((c, i) => { series[c.id] = seriesFor(specs[i], scale) })
  // Hiệu chỉnh lần hai theo số thực tế sau nhiễu.
  let actual = 0
  for (const c of channels) for (let d = oct.from; d <= oct.to; d++) actual += series[c.id].views[d]
  const k = OCT_TOTAL / actual
  for (const c of channels) {
    const s = series[c.id]
    s.views = s.views.map((v) => Math.round(v * k))
    s.reach = s.reach.map((v) => Math.round(v * k))
    s.engagements = s.engagements.map((v) => Math.round(v * k))
  }
  const videos = buildVideos(channels, specs, series)
  return { channels, series, videos, jobRuns: buildJobRuns(channels) }
}
