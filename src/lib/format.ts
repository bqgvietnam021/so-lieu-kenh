/** Mốc thời gian của dữ liệu demo: hôm nay 31/10/2026, số liệu đủ đến hết 30/10. */
export const DATA_START = Date.UTC(2026, 6, 1) // 01/07/2026 = dayIndex 0
export const TODAY = Date.UTC(2026, 9, 31)
const DAY_MS = 86_400_000

export const TODAY_INDEX = Math.round((TODAY - DATA_START) / DAY_MS)
/** Ngày cuối cùng đã thu thập đủ (hôm qua). */
export const LAST_DAY = TODAY_INDEX - 1
export const DAY_COUNT = TODAY_INDEX

export function dayToDate(day: number): Date {
  return new Date(DATA_START + day * DAY_MS)
}

export function dateToDay(d: Date): number {
  return Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - DATA_START) / DAY_MS)
}

/** Khoảng dayIndex [from, to] của một tháng (month 1–12), cắt theo dữ liệu có. */
export function monthRange(year: number, month: number) {
  const from = dateToDay(new Date(Date.UTC(year, month - 1, 1)))
  const end = dateToDay(new Date(Date.UTC(year, month, 0)))
  return { from, end, to: Math.min(end, LAST_DAY), days: end - from + 1 }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtDay(day: number, withYear = false) {
  const d = dayToDate(day)
  const s = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`
  return withYear ? `${s}/${d.getUTCFullYear()}` : s
}

export function relDay(day: number) {
  const diff = TODAY_INDEX - day
  if (diff <= 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  return `${diff} ngày trước`
}

/** Thời điểm dạng "06:05 hôm nay" / "hôm qua" / "28/10 06:00" từ chuỗi ISO. */
export function relTime(iso: string) {
  const d = new Date(iso)
  const day = dateToDay(new Date(d.getTime() + 7 * 3600_000))
  const local = new Date(d.getTime() + 7 * 3600_000)
  const hm = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`
  const diff = TODAY_INDEX - day
  if (diff === 0) return `${hm} hôm nay`
  if (diff === 1) return `${hm} hôm qua`
  return `${fmtDay(day)} ${hm}`
}

/** ISO cho một dayIndex + giờ phút theo giờ Việt Nam (UTC+7). */
export function isoAt(day: number, hour: number, minute = 0) {
  return new Date(DATA_START + day * DAY_MS + (hour - 7) * 3600_000 + minute * 60_000).toISOString()
}

export function nowIso() {
  // Đồng hồ demo: ngày 31/10/2026, giờ phút theo đồng hồ thật.
  const real = new Date()
  const local = new Date(real.getTime() + 7 * 3600_000)
  return isoAt(TODAY_INDEX, local.getUTCHours(), local.getUTCMinutes())
}

const nfVi = new Intl.NumberFormat('vi-VN')

export function fmtInt(n: number) {
  return nfVi.format(Math.round(n))
}

/** 1,83 tr · 12.4K · 412 (theo cách viết trên thiết kế). */
export function fmtShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace('.', ',').replace(/,?0+$/, '')} tr`
  if (a >= 10_000) return `${Math.round(n / 1000)}K`
  if (a >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(n))
}

export function fmtPct(ratio: number, digits = 1) {
  return `${(ratio * 100).toFixed(digits).replace('.', ',')}%`
}

export function fmtSignedPct(ratio: number) {
  const v = Math.round(ratio * 100)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return m > 0 ? `${m}m${pad(sec)}s` : `${sec}s`
}

export const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}
