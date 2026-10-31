import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { BusyButton, NoAccess, PageHead } from '../components/ui'
import { fmtDay, dateToDay } from '../lib/format'
import { useStore } from '../lib/store'
import type { JobRun } from '../lib/types'

function localParts(iso: string) {
  const d = new Date(Date.parse(iso) + 7 * 3600_000)
  return { day: dateToDay(d), hm: d.toISOString().slice(11, 16) }
}

function duration(run: JobRun) {
  if (!run.finishedAt) return 'Đang chạy…'
  const mins = Math.max(1, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 60000))
  return `${mins} phút`
}

const STATUS: Record<JobRun['status'], [string, string]> = {
  success: ['ok', 'Thành công'],
  partial: ['warn', 'Có lỗi'],
  failed: ['warn', 'Thất bại'],
  running: ['info', 'Đang chạy'],
}

export function Logs() {
  const { jobRuns, channelById, runNow, retryError, can, settings } = useStore()
  const [open, setOpen] = useState<string | null>(() => jobRuns.find((r) => r.errorCount > 0)?.id ?? null)
  if (!can('logs')) return <NoAccess />
  const running = jobRuns.some((r) => r.status === 'running')

  return (
    <>
      <PageHead
        title="Nhật ký thu thập"
        sub={`Job chạy hằng ngày lúc ${settings.runTime} · lần chạy tiếp theo: ${settings.runTime} ngày mai`}
        actions={<button className="btn btn-primary" disabled={running} onClick={runNow} style={{ height: 44, padding: '0 22px' }}>
          {running && <span className="spin" />} {running ? 'Đang chạy…' : 'Chạy ngay'}
        </button>}
      />
      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Thời gian chạy</th>
                <th>Thời lượng</th>
                <th>Kích hoạt</th>
                <th className="num">Thành công</th>
                <th className="num">Lỗi</th>
                <th>Rate limit cao nhất</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {jobRuns.map((run) => {
                const t = localParts(run.startedAt)
                const isOpen = open === run.id && run.errors.length > 0
                const [tone, label] = STATUS[run.status]
                return (
                  <Fragment key={run.id}>
                    <tr className={run.errors.length ? 'clickable' : ''} onClick={() => run.errors.length && setOpen(isOpen ? null : run.id)}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmtDay(t.day)} {t.hm} {run.errors.length > 0 && <span style={{ fontSize: 11 }}>{isOpen ? '▾' : '▸'}</span>}
                      </td>
                      <td>{duration(run)}</td>
                      <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{run.triggeredBy}</td>
                      <td className="num">{run.okCount}</td>
                      <td className="num" style={{ color: run.errorCount ? 'var(--down)' : undefined }}>{run.errorCount}</td>
                      <td>
                        <div className="bar-inline">
                          <div className="track"><div className={run.maxRateLimitPct >= 80 ? 'hot' : ''} style={{ width: `${run.maxRateLimitPct}%` }} /></div>
                          <span style={{ color: 'var(--muted)' }}>{run.maxRateLimitPct}%</span>
                        </div>
                      </td>
                      <td><span className={`badge ${tone}`}>{label}</span></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, borderTop: 0 }}>
                          <div className="errors-box">
                            {run.errors.map((e) => {
                              const ch = channelById[e.channelId]
                              return (
                                <div className="err" key={e.id}>
                                  <Link to={`/kenh/${e.channelId}`} style={{ fontWeight: 600, color: 'var(--text)' }}>{ch?.name ?? e.channelId}</Link>
                                  <div>
                                    <code className="errmsg">{e.message}</code>
                                    {e.retryStatus && (
                                      <div style={{ fontSize: 12, marginTop: 4 }} className={e.retryStatus === 'success' ? 'up' : 'down'}>
                                        Chạy lại {e.retryStatus === 'success' ? 'thành công' : 'vẫn lỗi'}
                                      </div>
                                    )}
                                  </div>
                                  <BusyButton className="btn" disabled={e.retryStatus === 'success'} onClick={() => retryError(run.id, e.id)}>
                                    {e.retryStatus === 'success' ? 'Đã xong' : 'Chạy lại'}
                                  </BusyButton>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
