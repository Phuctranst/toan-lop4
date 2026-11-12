# Hướng dẫn kết nối Google Sheets (để quản trị viên xem dữ liệu mọi học sinh)

Trang web chạy trên GitHub Pages nên không có máy chủ riêng. Ta dùng **Google Sheets + Google Apps Script** làm nơi lưu dữ liệu (miễn phí). Làm một lần, khoảng 5 phút.

## Bước 1 – Tạo bảng tính
1. Vào https://sheets.google.com → **Trống** (tạo bảng tính mới), đặt tên ví dụ `Toan lop 4 - Du lieu`.
2. **Giữ bảng tính ở chế độ riêng tư** (không chia sẻ cho ai).

## Bước 2 – Dán mã
1. Trong bảng tính: **Tiện ích mở rộng → Apps Script**.
2. Xóa mã mẫu, mở file `apps-script/Code.gs` trong thư mục dự án, **copy toàn bộ** và dán vào.
3. Dòng `const ADMIN_PASSWORD = 'admin123';` → **đổi thành mật khẩu quản trị của bạn** (tài khoản quản trị luôn là `admin`).
4. Bấm biểu tượng 💾 **Lưu dự án**.

## Bước 3 – Triển khai
1. Bấm **Triển khai → Tùy chọn triển khai mới**.
2. Biểu tượng bánh răng → chọn loại **Ứng dụng web**.
3. Thiết lập:
   - *Thực thi với tư cách*: **Tôi**
   - *Người có quyền truy cập*: **Bất kỳ ai**
4. Bấm **Triển khai** → **Cấp quyền truy cập** → chọn tài khoản Google của bạn → *Nâng cao → Đi tới ... (không an toàn) → Cho phép*.
5. **Copy "URL ứng dụng web"** (dạng `https://script.google.com/macros/s/.../exec`).

## Bước 4 – Gắn địa chỉ vào trang web
Mở `index.html`, tìm dòng:

```js
const API_URL='';
```

dán URL vào giữa hai dấu nháy, rồi đưa lên GitHub (hoặc nhờ trợ lý làm giúp).

## Sử dụng
- Quản trị viên đăng nhập bằng `admin` + mật khẩu đã đặt → tạo tài khoản học sinh ở thẻ **Tạo tài khoản**.
- Học sinh đăng nhập bằng tên đăng nhập và mật khẩu thầy/cô cấp, có thể tự đổi mật khẩu bằng nút 🔑.
- Dữ liệu nằm trong 4 trang tính: `Users`, `Results`, `Logs`, `Activity` (bạn có thể mở xem hoặc tải về Excel).

## Lưu ý
- Nếu sửa `Code.gs` sau này: **Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản mới → Triển khai** (URL giữ nguyên).
- Mật khẩu học sinh được mã hóa (SHA-256) trước khi gửi và lưu, nhưng đây là hệ thống **mật khẩu đơn giản** dành cho lớp học, không dùng cho dữ liệu nhạy cảm.
- Khi mất mạng, kết quả và nhật ký được giữ lại trên máy học sinh và tự gửi lại khi có mạng.
- Khi `API_URL` còn trống, trang chạy ở **chế độ thử nghiệm**: dữ liệu chỉ lưu trên từng máy (tài khoản quản trị mặc định `admin` / `admin123`).
