import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isoAt, nowIso, TODAY_INDEX } from './format'
import { buildSeed, SEED_CONNECTIONS, SEED_TOPICS, USERS } from './seed'
import { computeAlerts } from './alerts'
import type {
  Alert, AlertState, AlertStatus, AuditEntry, Channel, Connection, ConnectionKind, JobRun, Role, Settings, Topic, User,
} from './types'

const seed = buildSeed()
export const SERIES = seed.series
export const VIDEOS = seed.videos

const STORAGE_KEY = 'so-lieu-kenh:v1'

export const DEFAULT_SETTINGS: Settings = {
  target: { scopeType: 'all', total: 3_000_000, byTopic: { 't-ga': 1_200_000, 't-vit': 700_000, 't-lon': 650_000, 't-bo': 450_000 } },
  viewDropPct: 20,
  noPostDays: 5,
  tokenExpiryDays: 7,
  runTime: '06:00',
  freshVideoDays: 30,
  oldVideoCycle: 'weekly',
  staffScope: 'own',
}

interface PersistedState {
  userId: string
  topics: Topic[]
  connections: Connection[]
  channels: Channel[]
  contentCodes: Record<string, string>
  settings: Settings
  alertStates: Record<string, AlertState>
  jobRuns: JobRun[]
  audit: AuditEntry[]
}

function initialState(): PersistedState {
  return {
    userId: 'u-duc',
    topics: SEED_TOPICS,
    connections: SEED_CONNECTIONS,
    channels: seed.channels,
    contentCodes: {},
    settings: DEFAULT_SETTINGS,
    // Bốn cảnh báo đã được xem trước đó (như thiết kế).
    alertStates: {
      'view_drop:ch7': { status: 'seen' },
      'view_drop:ch10': { status: 'seen' },
      'no_post:ch9': { status: 'seen' },
      'token_expiring:c-tt01': { status: 'seen' },
    },
    jobRuns: seed.jobRuns,
    audit: [
      { at: isoAt(TODAY_INDEX - 2, 9, 14), userName: 'Minh', action: 'Thêm kết nối "TikTok Business" (chế độ thử nghiệm)' },
      { at: isoAt(TODAY_INDEX - 1, 15, 2), userName: 'Minh', action: 'Đồng bộ kênh "BM Chăn nuôi 02": không có page mới' },
    ],
  }
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState(), ...JSON.parse(raw) }
  } catch {
    /* bộ nhớ trình duyệt không dùng được: dùng dữ liệu mặc định */
  }
  return initialState()
}

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'warn' | 'info'
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Quản trị',
  manager: 'Quản lý marketing',
  staff: 'Nhân viên',
  tech: 'Kỹ thuật',
}

export type Permission = 'connections' | 'logs' | 'settings' | 'editChannel' | 'systemAlerts'
const PERMS: Record<Role, Permission[]> = {
  admin: ['connections', 'logs', 'settings', 'editChannel', 'systemAlerts'],
  manager: ['settings', 'editChannel', 'systemAlerts'],
  staff: [],
  tech: ['connections', 'logs', 'systemAlerts'],
}

export interface AddConnectionInput {
  kind: ConnectionKind
  name: string
  externalId: string
  token: string
}

interface Store extends PersistedState {
  user: User
  users: User[]
  can: (p: Permission) => boolean
  /** Kênh người dùng hiện tại được xem (theo phạm vi dữ liệu của vai trò). */
  visibleChannels: Channel[]
  channelById: Record<string, Channel>
  topicName: (id: string) => string
  userName: (id: string) => string
  alerts: Alert[]
  toasts: Toast[]
  toast: (text: string, tone?: Toast['tone']) => void
  setUser: (id: string) => void
  updateChannel: (id: string, patch: Partial<Channel>) => void
  setContentCode: (videoId: string, code: string) => void
  saveSettings: (s: Settings, topics: Topic[]) => void
  setAlertStatus: (alert: Alert, status: AlertStatus) => void
  checkConnection: (id: string) => Promise<void>
  syncConnection: (id: string) => Promise<void>
  addConnection: (input: AddConnectionInput) => Promise<string | null>
  runNow: () => void
  retryError: (runId: string, errorId: string) => Promise<void>
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* bỏ qua */
    }
  }, [state])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  const user = USERS.find((u) => u.id === state.userId) ?? USERS[0]
  const can = useCallback((p: Permission) => PERMS[user.role].includes(p), [user.role])

  const audit = useCallback((action: string) => {
    setState((s) => ({ ...s, audit: [{ at: nowIso(), userName: user.name, action }, ...s.audit].slice(0, 50) }))
  }, [user.name])

  const channelById = useMemo(() => Object.fromEntries(state.channels.map((c) => [c.id, c])), [state.channels])

  const visibleChannels = useMemo(() => {
    if (user.role === 'staff' && state.settings.staffScope === 'own') {
      return state.channels.filter((c) => c.ownerUserId === user.id)
    }
    return state.channels
  }, [state.channels, state.settings.staffScope, user])

  const allAlerts = useMemo(
    () => computeAlerts({
      channels: state.channels, connections: state.connections, jobRuns: state.jobRuns,
      settings: state.settings, alertStates: state.alertStates, series: SERIES, videos: VIDEOS,
    }),
    [state.channels, state.connections, state.jobRuns, state.settings, state.alertStates],
  )

  const alerts = useMemo(() => {
    const visibleIds = new Set(visibleChannels.map((c) => c.id))
    return allAlerts.filter((a) => (a.channelId ? visibleIds.has(a.channelId) : can('systemAlerts')))
  }, [allAlerts, visibleChannels, can])

  const topicName = useCallback((id: string) => state.topics.find((t) => t.id === id)?.name ?? '—', [state.topics])
  const userName = useCallback((id: string) => USERS.find((u) => u.id === id)?.name ?? '—', [])

  const updateConnection = (id: string, patch: Partial<Connection>) =>
    setState((s) => ({ ...s, connections: s.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))

  const store: Store = {
    ...state,
    user,
    users: USERS,
    can,
    visibleChannels,
    channelById,
    topicName,
    userName,
    alerts,
    toasts,
    toast,
    setUser: (id) => setState((s) => ({ ...s, userId: id })),
    updateChannel: (id, patch) => {
      setState((s) => ({ ...s, channels: s.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
      toast('Đã lưu thông tin kênh')
    },
    setContentCode: (videoId, code) => {
      setState((s) => ({ ...s, contentCodes: { ...s.contentCodes, [videoId]: code } }))
      toast(code ? `Đã lưu mã video ${code}` : 'Đã xoá mã video')
    },
    saveSettings: (settings, topics) => {
      setState((s) => ({ ...s, settings, topics }))
      toast('Đã lưu cài đặt')
    },
    setAlertStatus: (alert, status) => {
      setState((s) => ({
        ...s,
        alertStates: {
          ...s.alertStates,
          [alert.dedupeKey]: status === 'resolved'
            ? {
                status, message: alert.message, type: alert.type, channelId: alert.channelId,
                connectionId: alert.connectionId, runId: alert.runId, resolvedBy: user.name, resolvedAt: nowIso(),
              }
            : { status },
        },
      }))
      if (status === 'resolved') toast('Đã đánh dấu đã xử lý')
    },
    checkConnection: async (id) => {
      const conn = state.connections.find((c) => c.id === id)
      if (!conn) return
      await wait(900)
      const now = nowIso()
      audit(`Kiểm tra token "${conn.name}"`)
      if (conn.status === 'missing_permission' || conn.status === 'error') {
        updateConnection(id, { lastCheckedAt: now })
        toast(`${conn.name}: vẫn ${conn.lastError ?? 'lỗi'}`, 'warn')
        return
      }
      updateConnection(id, { lastCheckedAt: now })
      toast(conn.status === 'testing' ? `${conn.name}: token hợp lệ (API đang thử nghiệm)` : `${conn.name}: token hợp lệ, đủ quyền`)
    },
    syncConnection: async (id) => {
      const conn = state.connections.find((c) => c.id === id)
      if (!conn) return
      await wait(1200)
      const n = state.channels.filter((c) => c.connectionId === id).length
      audit(`Đồng bộ kênh "${conn.name}": ${n} kênh, không có page mới`)
      updateConnection(id, { lastCheckedAt: nowIso() })
      toast(`${conn.name}: đã đồng bộ ${n} kênh, không có kênh mới`)
    },
    addConnection: async (input) => {
      const name = input.name.trim()
      const ext = input.externalId.trim()
      const token = input.token.trim()
      if (!name) return 'Nhập tên gợi nhớ'
      if (state.connections.some((c) => c.name.toLowerCase() === name.toLowerCase())) return 'Tên gợi nhớ đã tồn tại'
      if (input.kind === 'fb_bm' && !/^\d{10,20}$/.test(ext)) return 'Business ID gồm 10–20 chữ số'
      if (!ext) return 'Nhập ID tài khoản'
      if (token.length < 20) return 'Token không hợp lệ (quá ngắn)'
      await wait(1100)
      const platform = input.kind === 'fb_bm' ? 'facebook' : input.kind === 'google_oauth' ? 'youtube' : 'tiktok'
      const conn: Connection = {
        id: `c-${Date.now().toString(36)}`,
        platform,
        kind: input.kind,
        name,
        externalId: ext,
        hasToken: true, // token chỉ gửi lên máy chủ để mã hoá, không lưu ở trình duyệt
        tokenExpiresAt: input.kind === 'fb_bm' ? null : isoAt(TODAY_INDEX + 60, 0),
        scopes: input.kind === 'fb_bm' ? ['pages_show_list', 'pages_read_engagement', 'read_insights'] : [],
        status: input.kind === 'tiktok_business' ? 'testing' : 'active',
        lastCheckedAt: nowIso(),
        lastError: null,
      }
      setState((s) => ({ ...s, connections: [...s.connections, conn] }))
      audit(`Thêm kết nối "${name}"`)
      toast(`Đã lưu kết nối ${name}. Bấm "Đồng bộ kênh" để lấy danh sách page.`)
      return null
    },
    runNow: () => {
      if (state.jobRuns.some((r) => r.status === 'running')) return
      const id = `run-manual-${Date.now()}`
      const startedAt = nowIso()
      const active = state.channels.filter((c) => c.status !== 'hidden')
      setState((s) => ({
        ...s,
        jobRuns: [{
          id, startedAt, finishedAt: null, status: 'running', okCount: 0, errorCount: 0,
          maxRateLimitPct: 0, triggeredBy: `Chạy thủ công (${user.name})`, errors: [],
        }, ...s.jobRuns],
      }))
      toast(`Đã đưa ${active.length} kênh vào hàng đợi thu thập`, 'info')
      const failing = active.filter((c) => c.accessError)
      let step = 0
      const steps = 6
      const timer = setInterval(() => {
        step++
        const ok = Math.round(((active.length - failing.length) * step) / steps)
        const done = step >= steps
        setState((s) => ({
          ...s,
          jobRuns: s.jobRuns.map((r) => r.id !== id ? r : {
            ...r,
            okCount: ok,
            errorCount: done ? failing.length : Math.min(failing.length, Math.floor((failing.length * step) / steps)),
            maxRateLimitPct: Math.min(66, 30 + step * 6),
            ...(done ? {
              finishedAt: nowIso(),
              status: failing.length ? 'partial' : 'success',
              errors: failing.map((c, i) => ({
                id: `${id}-e${i}`, runId: id, channelId: c.id,
                errorCode: c.platform === 'tiktok' ? 'TIKTOK_403' : 'FB_10',
                message: c.accessError!, retriedAt: null, retryStatus: null,
              })),
            } : {}),
          }),
          channels: done
            ? s.channels.map((c) => (c.status !== 'hidden' && !c.accessError ? { ...c, lastSyncedAt: nowIso() } : c))
            : s.channels,
        }))
        if (done) {
          clearInterval(timer)
          toast(failing.length ? `Thu thập xong: ${active.length - failing.length} thành công, ${failing.length} lỗi` : 'Thu thập xong, không có lỗi', failing.length ? 'warn' : 'ok')
        }
      }, 700)
    },
    retryError: async (runId, errorId) => {
      const run = state.jobRuns.find((r) => r.id === runId)
      const err = run?.errors.find((e) => e.id === errorId)
      if (!run || !err) return
      await wait(1000)
      const ch = state.channels.find((c) => c.id === err.channelId)
      // Lỗi quyền/token không tự hết khi chạy lại: cần xử lý kết nối trước.
      const ok = !ch?.accessError
      setState((s) => ({
        ...s,
        jobRuns: s.jobRuns.map((r) => r.id !== runId ? r : {
          ...r,
          errors: r.errors.map((e) => e.id === errorId ? { ...e, retriedAt: nowIso(), retryStatus: ok ? 'success' : 'failed' } : e),
        }),
      }))
      toast(ok ? `${ch?.name}: chạy lại thành công` : `${ch?.name}: vẫn lỗi – ${err.message}`, ok ? 'ok' : 'warn')
    },
    resetDemo: () => {
      setState(initialState())
      toast('Đã khôi phục dữ liệu demo', 'info')
    },
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore phải nằm trong StoreProvider')
  return s
}
