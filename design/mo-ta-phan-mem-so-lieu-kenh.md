# Mô tả phần mềm: Module "Số liệu kênh"

> Module thuộc webapp đa module của công ty (cùng Content Hub, CRM, Ads), dùng chung database và hệ thống tài khoản.
> Phiên bản tài liệu: 1.0 · Ngày: 31/10/2026

---

## 1. Tổng quan

### 1.1. Mục đích
Thu thập tự động và hiển thị số liệu hiệu quả của toàn bộ kênh mạng xã hội (Facebook Fanpage, YouTube, TikTok) do phòng marketing quản lý, giúp trưởng phòng:

- Biết tiến độ đạt mục tiêu view trong tháng.
- Phát hiện sớm kênh tụt view, kênh ngừng đăng bài, lỗi kết nối.
- So sánh hiệu quả giữa các kênh, chủ đề, định dạng video.

### 1.2. Phạm vi
| Trong phạm vi | Ngoài phạm vi (giai đoạn 1) |
|---|---|
| Đọc số liệu kênh và video qua API chính thức | Đăng bài, chỉnh sửa nội dung trên kênh |
| Lưu lịch sử số liệu theo ngày | Theo dõi kênh đối thủ (scraping) |
| Dashboard, bảng kênh, bảng video | Doanh thu, chuyển đổi đơn hàng |
| Cảnh báo tự động | Phân tích nội dung comment |
| Quản lý kết nối, nhật ký job | Báo cáo gửi tự động (giai đoạn 2) |

### 1.3. Quy mô thiết kế
- Hàng trăm kênh (thiết kế cho tối thiểu 500 kênh).
- Hàng chục nghìn video.
- Thu thập 1 lần/ngày, có thể chạy thủ công.

### 1.4. Tiêu chí thành công (giai đoạn 1)
Mỗi sáng mở dashboard thấy được:
1. Số liệu ngày hôm qua của **tất cả** kênh đang hoạt động.
2. Tháng này có đạt mục tiêu view hay không (dự báo).
3. Kênh nào đang tụt, kênh nào ngừng đăng, kết nối nào lỗi.

---

## 2. Người dùng và phân quyền

Dùng cơ chế phân quyền theo module của webapp (tài khoản dùng chung, vai trò và phạm vi dữ liệu riêng cho từng module).

| Vai trò trong module | Quyền |
|---|---|
| **Quản trị** | Toàn quyền, gồm kết nối, cài đặt, nhật ký |
| **Quản lý marketing** | Xem toàn bộ, đặt mục tiêu, sửa thông tin kênh, xử lý cảnh báo |
| **Nhân viên** | Xem kênh mình phụ trách (hoặc toàn bộ, tùy cấu hình), xử lý cảnh báo của kênh mình |
| **Kỹ thuật** | Quản lý kết nối, xem nhật ký, chạy lại job |

> Đề xuất: phạm vi dữ liệu của nhân viên mặc định là "kênh mình phụ trách". Cần chốt lại theo cách vận hành thực tế.

---

## 3. Kiến trúc

```
┌──────────────┐    ┌───────────────┐    ┌────────────────────┐
│  Scheduler   │───▶│  Hàng đợi job  │───▶│ Worker thu thập     │
│ (06:00/ngày) │    │ (mỗi kênh 1 job)│    │ (Python hoặc Node) │
└──────────────┘    └───────────────┘    └─────────┬──────────┘
                                                   │ Graph API / YouTube API / TikTok API
                                                   ▼
┌──────────────┐    ┌───────────────────────────────────────────┐
│ Webapp (UI)  │◀──▶│ Database dùng chung (bảng của module này) │
└──────────────┘    └───────────────────────────────────────────┘
```

- **Scheduler:** đẩy mỗi kênh thành một job vào hàng đợi theo lịch.
- **Worker:** xử lý tuần tự hoặc song song có giới hạn, tôn trọng rate limit, retry có giãn thời gian (exponential backoff).
- **Không dùng n8n cho phần thu thập**: khó kiểm soát hàng đợi, retry và rate limit ở quy mô hàng trăm kênh.
- **Bộ tính cảnh báo:** chạy ngay sau khi job thu thập kết thúc.

---

## 4. Kết nối nền tảng

### 4.1. Facebook (Fanpage)
- Gom page vào **Business Manager (BM)**, mỗi BM khoảng 30–50 page để giảm rủi ro mất toàn bộ khi một BM bị hạn chế.
- Mỗi BM tạo một **System User** (vai trò Employee), gán page và App, sinh token không hết hạn.
- Quyền cần: `pages_show_list`, `pages_read_engagement`, `read_insights` (thêm `pages_read_user_content` nếu sau này đọc comment).
- Luồng:
  1. Dùng System User token gọi `/me/accounts` để lấy danh sách page và page token.
  2. Dùng page token lấy insights cấp page, danh sách Reels/video và insights từng video.
- Dùng batch request (tối đa 50 lệnh/request), đọc header `X-Business-Use-Case-Usage` để điều tiết.

### 4.2. YouTube
- YouTube Data API (thông tin kênh, video) + YouTube Analytics API (số liệu chi tiết).
- Xác thực OAuth Google, lưu refresh token.

### 4.3. TikTok
- Dùng API dành cho tài khoản Business.
- **Chưa chắc chắn** về mức độ số liệu lấy được, cần thử nghiệm trước khi cam kết. Trong giao diện, kết nối TikTok mang trạng thái "Đang thử nghiệm".

### 4.4. Cần kiểm tra trước khi code
- Giới hạn số page trên mỗi BM.
- App có cần App Review hoặc xác minh doanh nghiệp để dùng quyền insights qua System User hay không.
- Tên metric insights hiện hành của Page và Reels (Meta thường xuyên đổi hoặc ngừng metric).

---

## 5. Thu thập dữ liệu

### 5.1. Lịch chạy
- Mặc định 06:00 hằng ngày, cấu hình được.
- Video đăng trong N ngày gần nhất (mặc định 30): cập nhật hằng ngày.
- Video cũ hơn: cập nhật hằng tuần (hoặc hằng tháng / không cập nhật, tùy cấu hình).
- Có nút "Chạy ngay" và "Chạy lại" cho từng kênh lỗi.

### 5.2. Nguyên tắc lưu số liệu
- **Luôn lưu snapshot theo ngày vào DB của mình.** API thường chỉ trả số cộng dồn hoặc giới hạn lịch sử, không tự lưu sẽ mất dữ liệu xu hướng.
- Với số liệu cộng dồn (tổng view của video): lưu giá trị cộng dồn, số tăng trong ngày = hôm nay − hôm qua.
- Mỗi cặp (kênh, ngày) và (video, ngày) chỉ có 1 bản ghi; chạy lại thì ghi đè.

### 5.3. Xử lý lỗi
| Loại lỗi | Xử lý |
|---|---|
| Rate limit | Tạm dừng, chạy tiếp sau khi hết hạn chế |
| Lỗi mạng / 5xx | Retry tối đa 3 lần, giãn thời gian |
| Thiếu quyền / token lỗi | Không retry, ghi lỗi, tạo cảnh báo kết nối |
| Page không còn truy cập | Đánh dấu kênh "mất kết nối", tạo cảnh báo |

---

## 6. Mô hình dữ liệu

### 6.1. `connections`: kết nối
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| platform | enum | facebook, youtube, tiktok |
| kind | enum | fb_bm, google_oauth, tiktok_business |
| name | text | Tên gợi nhớ, vd "BM Chăn nuôi 01" |
| external_id | text | Business ID / channel owner ID |
| token_encrypted | text | Mã hóa khi lưu, không trả về giao diện |
| refresh_token_encrypted | text | Nếu có |
| token_expires_at | timestamp | Null nếu không hết hạn |
| scopes | text[] | Quyền đã cấp |
| status | enum | active, missing_permission, error, testing |
| last_checked_at | timestamp | |
| last_error | text | |

### 6.2. `topics`: chủ đề
| Trường | Kiểu |
|---|---|
| id | PK |
| name | text (Gà, Vịt, Lợn, Bò…) |

### 6.3. `channels`: kênh
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| connection_id | FK → connections | |
| platform | enum | |
| external_id | text | Page ID / Channel ID |
| name, url | text | |
| topic_id | FK → topics | |
| owner_user_id | FK → users | Người phụ trách |
| status | enum | active, hidden, disconnected |
| last_synced_at | timestamp | |

### 6.4. `videos`: video
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | PK | |
| channel_id | FK → channels | |
| external_id | text | |
| title, url | text | |
| format | enum | 9:16, 16:9 |
| duration_s | int | |
| published_at | timestamp | |
| content_code | text | **Mã video chung** để nối Content Hub và tool đăng bài (giai đoạn 2) |
| last_synced_at | timestamp | |

### 6.5. `channel_daily_stats`
| Trường | Kiểu |
|---|---|
| channel_id, date | PK ghép |
| followers | int (tổng tại ngày) |
| views, reach, engagements | int (trong ngày) |

### 6.6. `video_daily_stats`
| Trường | Kiểu |
|---|---|
| video_id, date | PK ghép |
| views, likes, comments, shares | int (cộng dồn) |
| avg_watch_s | numeric |

### 6.7. `job_runs` và `job_run_errors`
| `job_runs` | `job_run_errors` |
|---|---|
| id, started_at, finished_at | id, run_id, channel_id |
| status (running, success, partial, failed) | error_code, message |
| ok_count, error_count | retried_at, retry_status |
| max_rate_limit_pct, triggered_by | |

### 6.8. `alerts`
| Trường | Ghi chú |
|---|---|
| id, type | view_drop, no_post, token_error, job_error |
| channel_id / connection_id | Đối tượng liên quan |
| message | |
| status | new, seen, resolved |
| dedupe_key | Tránh tạo trùng cảnh báo cùng loại cho cùng đối tượng khi chưa xử lý |
| created_at, resolved_by, resolved_at | |

### 6.9. `monthly_targets` và `settings`
- `monthly_targets`: month, scope_type (all / topic / group), scope_id, target_views.
- `settings`: key, value (ngưỡng cảnh báo, lịch chạy, chu kỳ cập nhật video).

---

## 7. Chỉ số và công thức

| Chỉ số | Công thức |
|---|---|
| View tháng | Tổng `views` theo ngày của mọi kênh từ ngày 1 đến hôm qua |
| % đạt mục tiêu | View tháng / mục tiêu tháng |
| Dự báo cuối tháng | View tháng + (TB view/ngày của 7 ngày gần nhất × số ngày còn lại) |
| Follow mới | followers cuối kỳ − followers đầu kỳ |
| Tỷ lệ tương tác | (like + comment + share) / view |
| % so tuần trước | (view 7 ngày gần nhất − view 7 ngày trước đó) / view 7 ngày trước đó |
| View video trong ngày | views cộng dồn hôm nay − hôm qua |

> Mọi số liệu tính đến hết ngày hôm qua (ngày đã thu thập đủ).

---

## 8. Danh sách màn hình

Bố cục chung: menu trái (Tổng quan, Kênh, Video, Cảnh báo, Kết nối, Nhật ký thu thập, Cài đặt), nội dung bên phải. Màu: xanh = tăng, cam = giảm/cần chú ý.

### 8.1. Tổng quan
- **Bộ lọc:** tháng, nền tảng, chủ đề.
- **Thẻ chỉ số:** view tháng / mục tiêu (thanh tiến độ + dự báo cuối tháng, báo thiếu bao nhiêu), follow mới, tỷ lệ tương tác, số video đã đăng.
- **Biểu đồ:** view cộng dồn trong tháng; đường thực tế, đường mục tiêu, đường dự báo.
- **Kênh tăng mạnh / tụt mạnh (7 ngày):** 5 kênh mỗi bên, kèm view và %.
- **Cảnh báo mới:** 4 cảnh báo gần nhất, link "Xem tất cả".

### 8.2. Danh sách kênh
- Tìm theo tên kênh hoặc người phụ trách.
- Lọc: nền tảng, chủ đề, phụ trách, trạng thái kết nối.
- Cột: Kênh, Nền tảng, Chủ đề, Phụ trách, Follow, View 7 ngày, So tuần trước, Đăng gần nhất (cam nếu quá ngưỡng), Kết nối.
- Sắp xếp theo mọi cột số; phân trang.
- Bấm tên kênh → Chi tiết kênh.

### 8.3. Chi tiết kênh
- Thông tin: nền tảng, chủ đề, phụ trách, BM, trạng thái kết nối, lần đồng bộ cuối.
- Thao tác: chọn khoảng thời gian, mở trang gốc, sửa thông tin (chủ đề, phụ trách, ẩn kênh).
- Thẻ chỉ số: follow, view, tỷ lệ tương tác, số video.
- Biểu đồ theo ngày, chuyển tab View / Follow / Tương tác.
- Bảng video của kênh, sắp theo view.

### 8.4. Danh sách video
- Tab: Tất cả / Top 10 / Bottom 10.
- Lọc: thời gian, kênh, chủ đề, định dạng.
- Cột: thumbnail, tiêu đề, kênh, ngày đăng, định dạng, view, like, comment, share, thời lượng xem TB.
- Bấm tiêu đề → Chi tiết video.

### 8.5. Chi tiết video
- Thumbnail dọc, link mở video gốc.
- Thông tin: kênh, nền tảng, định dạng, thời lượng, thời điểm đăng.
- Thẻ chỉ số: view, like, comment, share, xem TB.
- Biểu đồ view cộng dồn kể từ khi đăng.
- Ô **Mã video** (nhập/sửa) để nối Content Hub.

### 8.6. Cảnh báo
- Tab trạng thái: Mới / Đã xem / Đã xử lý. Lọc theo loại.
- Mỗi dòng: loại, nội dung, người phụ trách, thời gian.
- Nút điều hướng tới đối tượng (kênh / kết nối / nhật ký) và "Đánh dấu đã xử lý".

### 8.7. Kết nối
- Bảng: tên, loại, số kênh, trạng thái token, lần kiểm tra cuối.
- Thao tác: Kiểm tra token, Đồng bộ kênh (lấy page mới từ BM).
- Form thêm kết nối: loại, tên gợi nhớ, Business ID, token (ô mật khẩu; mã hóa khi lưu, không hiển thị lại), nút "Kiểm tra & lưu".

### 8.8. Nhật ký thu thập
- Bảng lần chạy: thời gian, thời lượng, số kênh thành công/lỗi, rate limit cao nhất, trạng thái.
- Mở một lần chạy → danh sách kênh lỗi kèm mã lỗi, nút "Chạy lại".
- Nút "Chạy ngay".

### 8.9. Cài đặt
- **Mục tiêu:** view/tháng, áp dụng cho toàn bộ / theo chủ đề / theo nhóm kênh.
- **Ngưỡng cảnh báo:** % view giảm, số ngày không đăng, số ngày báo trước token hết hạn.
- **Chủ đề:** thêm, sửa, xóa (hiện số kênh mỗi chủ đề).
- **Lịch thu thập:** giờ chạy, số ngày coi là video mới, chu kỳ cập nhật video cũ.

---

## 9. Quy tắc cảnh báo

| Loại | Điều kiện kích hoạt (mặc định) | Tự đóng khi |
|---|---|---|
| Kênh tụt view | View 7 ngày giảm ≥ 20% so với 7 ngày trước | Tuần sau không còn vượt ngưỡng |
| Không đăng bài | Không có video mới ≥ 5 ngày | Có video mới |
| Token lỗi | Kiểm tra token thất bại hoặc thiếu quyền | Kiểm tra lại thành công |
| Token sắp hết hạn | Còn ≤ 7 ngày (với token có hạn) | Token được thay |
| Job lỗi | Lần chạy có kênh lỗi | Chạy lại thành công |

- Không tạo cảnh báo trùng khi cảnh báo cùng loại, cùng đối tượng còn chưa xử lý.
- Kênh mới (ít hơn 14 ngày dữ liệu) không xét cảnh báo tụt view.

---

## 10. Yêu cầu phi chức năng

- **Bảo mật:**
  - Token mã hóa khi lưu, chỉ worker giải mã.
  - Không bao giờ trả token ra giao diện hay log.
  - Mọi thao tác trên kết nối được ghi lại người thực hiện.
- **Hiệu năng:**
  - Job hằng ngày hoàn thành trong < 30 phút với 500 kênh.
  - Dashboard tải < 3 giây (dùng bảng tổng hợp hoặc cache nếu cần).
- **Độ tin cậy:**
  - Một kênh lỗi không làm dừng job.
  - Chạy lại không tạo dữ liệu trùng.
- **Theo dõi:** mỗi lần chạy có nhật ký đầy đủ, lỗi có mã và nội dung gốc từ API.
- **Giao diện:** hoạt động trên màn hình desktop và điện thoại; bảng rộng cuộn ngang.

---

## 11. Giai đoạn 2 (chưa làm ngay)

1. **Phân tích nội dung:** nối Content Hub và tool đăng bài qua `content_code` để đo hiệu quả theo người làm, kịch bản, công cụ AI.
2. **Báo cáo tuần tự động:** gửi qua Zalo hoặc Telegram.
3. **Comment cần xử lý:** lọc comment có câu hỏi mua hàng, chuyển sang CRM.

> Nên thiết kế sẵn trường `content_code` ngay từ giai đoạn 1 để không phải sửa DB sau này.

---

## 12. Thứ tự triển khai đề xuất

| Bước | Nội dung | Kết quả |
|---|---|---|
| 0 | Thử API với 2–3 page bằng Graph API Explorer | Xác nhận quyền, metric dùng được |
| 1 | DB + màn **Kết nối** | Thêm BM, đồng bộ danh sách kênh |
| 2 | Worker thu thập + màn **Nhật ký** | Có số liệu hằng ngày, theo dõi lỗi |
| 3 | Màn **Kênh**, **Video** | Xem và lọc dữ liệu |
| 4 | Màn **Tổng quan** + **Cài đặt** mục tiêu | Theo dõi tiến độ tháng |
| 5 | **Cảnh báo** | Phát hiện vấn đề tự động |
| 6 | Màn chi tiết kênh, chi tiết video | Đào sâu từng đối tượng |
| 7 | YouTube, sau đó TikTok | Mở rộng nền tảng |

---

## 13. Rủi ro và giả định

| Rủi ro / giả định | Mức độ | Hướng xử lý |
|---|---|---|
| Meta đổi hoặc ngừng metric insights | Cao | Tách lớp ánh xạ metric, dễ thay tên metric mà không sửa logic |
| BM bị hạn chế, mất truy cập hàng loạt page | Cao | Chia nhiều BM, mỗi BM 30–50 page |
| Nhiều page cùng chủ, nội dung giống nhau bị giảm phân phối | Trung bình | Rủi ro về nội dung, không xử lý bằng kỹ thuật; theo dõi qua cảnh báo tụt view |
| TikTok API hạn chế số liệu | Trung bình | Thử nghiệm trước, có thể chỉ hỗ trợ một phần chỉ số |
| App cần App Review / xác minh doanh nghiệp | Chưa rõ | Kiểm tra ở bước 0 |
| Giả định: database dùng chung của webapp đủ tải dữ liệu theo ngày | Thấp | Đánh index (channel_id, date), (video_id, date); cân nhắc partition theo tháng khi dữ liệu lớn |
