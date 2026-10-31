# Số liệu kênh

Module theo dõi số liệu kênh mạng xã hội (Facebook Fanpage, YouTube, TikTok) cho phòng marketing, xây theo
tài liệu [design/mo-ta-phan-mem-so-lieu-kenh.md](design/mo-ta-phan-mem-so-lieu-kenh.md) và 9 ảnh thiết kế trong `design/`.

## Màn hình

| Đường dẫn | Màn hình |
|---|---|
| `/` | Tổng quan: view tháng / mục tiêu, dự báo cuối tháng, follow mới, tỷ lệ tương tác, biểu đồ tiến độ, kênh tăng/tụt, cảnh báo mới |
| `/kenh` | Danh sách kênh: tìm, lọc, sắp xếp mọi cột số, phân trang |
| `/kenh/:id` | Chi tiết kênh: khoảng 7/30/90 ngày, biểu đồ View/Follow/Tương tác, sửa chủ đề/phụ trách/ẩn kênh |
| `/video` | Danh sách video: Tất cả / Top 10 / Bottom 10, lọc thời gian, kênh, chủ đề, định dạng |
| `/video/:id` | Chi tiết video: chỉ số, view cộng dồn từ khi đăng, ô Mã video (nối Content Hub) |
| `/canh-bao` | Cảnh báo: Mới / Đã xem / Đã xử lý, lọc loại, điều hướng tới đối tượng |
| `/ket-noi` | Kết nối: kiểm tra token, đồng bộ kênh, thêm kết nối, lịch sử thao tác |
| `/nhat-ky` | Nhật ký thu thập: lần chạy, lỗi từng kênh, Chạy lại, Chạy ngay |
| `/cai-dat` | Cài đặt: mục tiêu (toàn bộ / theo chủ đề), ngưỡng cảnh báo, chủ đề, lịch thu thập, phạm vi dữ liệu nhân viên |

Phân quyền theo vai trò (Quản trị, Quản lý marketing, Nhân viên, Kỹ thuật) — chọn tài khoản demo ở cuối menu trái.

## Trạng thái hiện tại

Đây là bản giao diện hoàn chỉnh chạy trên **dữ liệu demo** (124 kênh, ~3 tháng số liệu theo ngày) sinh tất định trong
`src/lib/seed.ts`. Thao tác của người dùng (đánh dấu cảnh báo, cài đặt, mã video, kết nối mới…) được lưu ở trình duyệt.
Token nhập ở form Kết nối **không** được lưu ở trình duyệt.

Các công thức chỉ số (`src/lib/metrics.ts`) và quy tắc cảnh báo (`src/lib/alerts.ts`) đã viết đúng theo mục 7 và 9 của tài liệu,
dùng lại được khi nối dữ liệu thật. Lược đồ PostgreSQL cho giai đoạn backend ở `db/schema.sql`.

Bước tiếp theo (theo mục 12 tài liệu): thử Graph API với 2–3 page, dựng DB + API, worker thu thập (scheduler + hàng đợi),
rồi thay `seed.ts` bằng lời gọi API.

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # xuất ra dist/
```

Triển khai: Vercel (Vite, `vercel.json` đã cấu hình rewrite cho SPA).
