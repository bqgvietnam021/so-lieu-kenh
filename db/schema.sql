-- Module "Số liệu kênh" – lược đồ PostgreSQL (mục 6 tài liệu mô tả).
-- Dùng cho giai đoạn nối backend/worker; bảng users nằm ở phần dùng chung của webapp.

CREATE TYPE platform AS ENUM ('facebook', 'youtube', 'tiktok');
CREATE TYPE connection_kind AS ENUM ('fb_bm', 'google_oauth', 'tiktok_business');
CREATE TYPE connection_status AS ENUM ('active', 'missing_permission', 'error', 'testing');
CREATE TYPE channel_status AS ENUM ('active', 'hidden', 'disconnected');
CREATE TYPE video_format AS ENUM ('9:16', '16:9');
CREATE TYPE job_status AS ENUM ('running', 'success', 'partial', 'failed');
CREATE TYPE alert_type AS ENUM ('view_drop', 'no_post', 'token_error', 'token_expiring', 'job_error');
CREATE TYPE alert_status AS ENUM ('new', 'seen', 'resolved');

CREATE TABLE connections (
  id                      bigserial PRIMARY KEY,
  platform                platform NOT NULL,
  kind                    connection_kind NOT NULL,
  name                    text NOT NULL UNIQUE,
  external_id             text NOT NULL,
  token_encrypted         text NOT NULL,          -- chỉ worker giải mã, không trả về giao diện/log
  refresh_token_encrypted text,
  token_expires_at        timestamptz,
  scopes                  text[] NOT NULL DEFAULT '{}',
  status                  connection_status NOT NULL DEFAULT 'active',
  last_checked_at         timestamptz,
  last_error              text
);

CREATE TABLE connection_audit (
  id            bigserial PRIMARY KEY,
  connection_id bigint REFERENCES connections(id) ON DELETE SET NULL,
  user_id       bigint NOT NULL,
  action        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id   bigserial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE channels (
  id             bigserial PRIMARY KEY,
  connection_id  bigint NOT NULL REFERENCES connections(id),
  platform       platform NOT NULL,
  external_id    text NOT NULL,
  name           text NOT NULL,
  url            text,
  topic_id       bigint REFERENCES topics(id),
  owner_user_id  bigint,
  status         channel_status NOT NULL DEFAULT 'active',
  last_synced_at timestamptz,
  UNIQUE (platform, external_id)
);

CREATE TABLE videos (
  id             bigserial PRIMARY KEY,
  channel_id     bigint NOT NULL REFERENCES channels(id),
  external_id    text NOT NULL,
  title          text,
  url            text,
  format         video_format,
  duration_s     int,
  published_at   timestamptz NOT NULL,
  content_code   text UNIQUE,                     -- mã video chung, nối Content Hub (giai đoạn 2)
  last_synced_at timestamptz,
  UNIQUE (channel_id, external_id)
);
CREATE INDEX videos_channel_published ON videos (channel_id, published_at DESC);

-- Snapshot theo ngày: mỗi cặp (đối tượng, ngày) một bản ghi, chạy lại thì ghi đè (UPSERT).
CREATE TABLE channel_daily_stats (
  channel_id  bigint NOT NULL REFERENCES channels(id),
  date        date NOT NULL,
  followers   int NOT NULL,       -- tổng tại ngày
  views       int NOT NULL,       -- trong ngày
  reach       int NOT NULL,
  engagements int NOT NULL,
  PRIMARY KEY (channel_id, date)
);

CREATE TABLE video_daily_stats (
  video_id    bigint NOT NULL REFERENCES videos(id),
  date        date NOT NULL,
  views       int NOT NULL,       -- cộng dồn
  likes       int NOT NULL,
  comments    int NOT NULL,
  shares      int NOT NULL,
  avg_watch_s numeric(8, 2),
  PRIMARY KEY (video_id, date)
);

CREATE TABLE job_runs (
  id                 bigserial PRIMARY KEY,
  started_at         timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  status             job_status NOT NULL DEFAULT 'running',
  ok_count           int NOT NULL DEFAULT 0,
  error_count        int NOT NULL DEFAULT 0,
  max_rate_limit_pct int NOT NULL DEFAULT 0,
  triggered_by       text NOT NULL
);

CREATE TABLE job_run_errors (
  id           bigserial PRIMARY KEY,
  run_id       bigint NOT NULL REFERENCES job_runs(id) ON DELETE CASCADE,
  channel_id   bigint REFERENCES channels(id),
  error_code   text NOT NULL,
  message      text NOT NULL,     -- nội dung gốc từ API
  retried_at   timestamptz,
  retry_status text
);

CREATE TABLE alerts (
  id            bigserial PRIMARY KEY,
  type          alert_type NOT NULL,
  channel_id    bigint REFERENCES channels(id),
  connection_id bigint REFERENCES connections(id),
  run_id        bigint REFERENCES job_runs(id),
  message       text NOT NULL,
  status        alert_status NOT NULL DEFAULT 'new',
  dedupe_key    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_by   bigint,
  resolved_at   timestamptz
);
-- Không tạo trùng cảnh báo cùng loại, cùng đối tượng khi chưa xử lý.
CREATE UNIQUE INDEX alerts_open_dedupe ON alerts (dedupe_key) WHERE status <> 'resolved';

CREATE TABLE monthly_targets (
  month        date NOT NULL,               -- ngày 1 của tháng
  scope_type   text NOT NULL CHECK (scope_type IN ('all', 'topic', 'group')),
  scope_id     bigint NOT NULL DEFAULT 0,
  target_views bigint NOT NULL,
  PRIMARY KEY (month, scope_type, scope_id)
);

CREATE TABLE settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);
