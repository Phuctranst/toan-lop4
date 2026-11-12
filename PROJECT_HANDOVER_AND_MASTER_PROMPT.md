# 📦 HỒ SƠ ĐÓNG GÓI DỰ ÁN & MASTER PROMPT XÂY DỰNG NỀN TẢNG LUYỆN THI TƯƠNG TÁC TIỂU HỌC

> **Phiên bản:** 2.0 (Bản chuẩn hóa chuyển giao đa mô hình)  
> **Áp dụng cho:** Tất cả các mô hình AI (Claude, GPT-4o, Gemini, DeepSeek,...)  
> **Dự án gốc tham chiếu:** [Toán Lớp 4 - Học mà vui (GitHub Pages)](https://phuctranst.github.io/toan-lop4/)

---

## PHẦN 1: BÁO CÁO BÀN GIAO VÀ KIẾN TRÚC KỸ THUẬT DỰ ÁN (PROJECT HANDOVER)

### 1.1. Tổng quan kiến trúc hệ thống
Hệ thống được thiết kế theo mô hình **Zero-Server (Không tốn chi phí máy chủ)**, chạy trực tiếp trên trình duyệt của học sinh và sử dụng hệ sinh thái miễn phí của Google để quản trị dữ liệu:

```
┌────────────────────────────────────────────────────────────────┐
│               HỌC SINH / GIÁO VIÊN / PHỤ HUYNH                 │
│  Truy cập qua Web Browser (Máy tính, Tablet, Điện thoại)       │
└───────────────────────────────┬────────────────────────────────┘
                                │ (GitHub Pages / Single File HTML)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND (index.html)                       │
│  - Giao diện thân thiện học sinh (tông sáng, font tròn)        │
│  - Bộ tạo câu hỏi ngẫu nhiên tự động (PRNG với Seed)          │
│  - Đồng hồ đếm ngược thông minh theo độ khó từng câu           │
│  - Bảng điều hướng bài thi Sticky (nhảy câu, đánh dấu làm)    │
│  - Chấm điểm tức thì, giải thích chi tiết vì sao đúng/sai     │
│  - Phân tích lỗ hổng kiến thức & tự sinh bài tập củng cố      │
│  - Game hóa: Tích lũy Sao (★) & Bộ sưu tập 14+ Huy hiệu (🎖️)   │
│  - Chế độ Offline-First (Local Queue tự gửi lại khi có mạng)   │
└───────────────────────────────┬────────────────────────────────┘
                                │ HTTPS POST (JSON)
                                ▼
┌────────────────────────────────────────────────────────────────┐
│            BACKEND API (Google Apps Script - Code.gs)          │
│  - Xác thực mật khẩu bảo mật (SHA-256 + Salt)                  │
│  - Quản trị tài khoản (Học sinh / Admin)                       │
│  - Ghi nhận lượt làm bài, thời gian làm và chi tiết chủ đề     │
│  - Đếm thời gian học tập tích lũy thực tế (Heartbeat Ping)     │
└───────────────────────────────┬────────────────────────────────┘
                                │ Read / Write
                                ▼
┌────────────────────────────────────────────────────────────────┐
│                 DATABASE (Google Sheets)                       │
│  - Tab Users    : Tài khoản, họ tên, mật khẩu hash, profile   │
│  - Tab Results  : Lịch sử nộp bài, điểm số, thời gian, chi tiết│
│  - Tab Logs     : Nhật ký đăng nhập, đăng xuất, bắt đầu thi   │
│  - Tab Activity : Thời gian học tập tích lũy theo từng ngày   │
└────────────────────────────────────────────────────────────────┘
```

---

### 1.2. Cấu trúc dữ liệu chuẩn (Google Sheets Database Schema)

Hệ thống sử dụng 1 file Google Spreadsheet riêng tư gồm 4 sheet:

1. **`Users` (Danh sách tài khoản)**:
   - `username`: Tên đăng nhập (dạng Text `@`, chữ thường không dấu, vd: `bap`, `an01`).
   - `name`: Họ và tên hiển thị của học sinh.
   - `hash`: Mật khẩu mã hóa dạng `h` + `SHA256("toan4-kntt-" + username + ":" + password)`.
   - `profile`: Chuỗi JSON lưu điểm cao nhất các đề và mảng ID huy hiệu đạt được.
   - `created`: Timestamp tạo tài khoản.
   - `lastLogin`: Timestamp lần đăng nhập gần nhất.

2. **`Results` (Kết quả thi chi tiết)**:
   - `ts`: Thời điểm nộp bài (Unix Timestamp ms).
   - `username` / `name`: Thông tin học sinh.
   - `exam` / `title`: Mã đề và tên đề thi.
   - `score`: Điểm số đạt được (thang điểm 10, làm tròn 1 chữ số thập phân).
   - `seconds`: Thời gian hoàn thành thực tế (giây).
   - `allowed`: Thời gian tối đa cho phép của đề (giây).
   - `timeout`: `TRUE` nếu bị thu bài do hết giờ, ngược lại `FALSE`.
   - `topics`: Chuỗi JSON thống kê điểm theo từng dạng bài: `{"chủ_đề": [điểm_đạt, tổng_điểm]}`.

3. **`Logs` (Nhật ký giám sát)**:
   - `ts`: Thời điểm ghi nhận.
   - `username`: Tài khoản thực hiện.
   - `event`: Mã sự kiện (`login`, `login_fail`, `logout`, `start_exam`, `submit_exam`).
   - `detail`: Thông tin bổ sung (tên đề thi, điểm số,...).

4. **`Activity` (Thời gian học tập)**:
   - `day`: Ngày học (dạng số nguyên `YYYYMMDD`, ví dụ: `20261112`).
   - `username`: Tài khoản học sinh.
   - `minutes`: Số phút học tích lũy trong ngày (cộng dồn mỗi phút khi học sinh đang mở tab hoạt động).

---

### 1.3. Các tính năng cốt lõi đã hoàn thiện & bài học kinh nghiệm

1. **Thuật toán sinh số liệu ngẫu nhiên (Pseudo-Random Generator with Seed)**:
   - Dùng thuật toán PRNG (như Mulberry32 / SplitMix32) nhận vào `seed` để mỗi lần nhấn "Làm lại với số liệu mới", hệ thống tự tạo ra đề thi hoàn toàn mới với các con số ngẫu nhiên hợp lý (không bị số âm, không bị chia lẻ khi chưa học số thập phân).
   - **Kinh nghiệm:** Luôn phải sinh ít nhất 4 lựa chọn khác biệt cho câu hỏi trắc nghiệm (MCQ). Phải có cơ chế bù trừ đáp án nhiễu (distractors) để tránh trường hợp trùng lặp đáp án.

2. **Thiết kế giao diện Điều hướng bài thi (Sticky Navigation Panel)**:
   - Desktop: Cố định bên cạnh phải bài thi, căn giữa toàn bộ khối làm bài trên màn hình lớn.
   - Mobile: Co nhỏ thành thanh điều hướng 1 dòng ở đầu trang (`sticky`), đặt dưới header, có thanh cuộn ngang các ô câu hỏi, đồng hồ canh sát phải và nhãn trạng thái bên trái.
   - Nút nộp bài: Đặt ở cuối trang, tránh để trên thanh điều hướng di động để học sinh không bấm nhầm.

3. **Bảo mật và Phân quyền**:
   - Mật khẩu không bao giờ lưu dưới dạng văn bản thô (Plain text).
   - Admin có màn hình chuyên biệt với 6 tab: Tổng quan, Danh sách học sinh (đổi pass/xóa), Chi tiết kết quả, Nhật ký an ninh, Biểu đồ thống kê trực quan (SVG Charts), Tạo tài khoản mới.

---

## PHẦN 2: MASTER PROMPT CHUẨN SÁCH GIÁO KHOA (DÙNG ĐỂ TẠO DỰ ÁN MỚI)

> **Hướng dẫn sử dụng:**  
> Copy toàn bộ nội dung trong khung bên dưới và gửi cho bất kỳ AI nào (Claude, ChatGPT, Gemini,...) khi muốn tạo một hệ thống web luyện thi tương tự cho bất kỳ môn học nào hoặc khối lớp nào.

```markdown
============================= MASTER PROMPT =============================
BẠN LÀ MỘT CHUYÊN GIA SƯ PHẠM TIỂU HỌC XUẤT SẮC ĐỒNG THỜI LÀ KỸ SƯ LẬP TRÌNH WEB SENIOR (FULL-STACK FRONTEND & GOOGLE APPS SCRIPT).

NHIỆM VỤ CỦA BẠN:
Xây dựng một ứng dụng Web luyện thi tương tác học tập thông minh (Single Page Application - 1 file HTML duy nhất chứa toàn bộ HTML, CSS và JavaScript thuần) bám sát Chương trình Giáo dục Phổ thông hiện hành (Bộ sách Kết nối tri thức với cuộc sống / Cánh diều / Chân trời sáng tạo).

-------------------------------------------------------------------------
BƯỚC 1: TIẾP NHẬN YÊU CẦU & CHECKLIST LÀM RÕ (NẾU THIẾU THÔNG TIN)
-------------------------------------------------------------------------
Nếu người dùng chưa cung cấp đầy đủ thông tin chi tiết, bạn hãy chủ động hiển thị CHECKLIST câu hỏi để người dùng xác nhận trước:
1. MÔN HỌC & KHỐI LỚP:
   - Môn học: Toán / Tiếng Việt / Tiếng Anh / Tự nhiên & Xã hội / Lịch sử & Địa lý / Tin học / Khoa học...?
   - Khối lớp: Lớp 1, 2, 3, 4 hay 5?
   - Bộ sách giáo khoa: Kết nối tri thức / Cánh diều / Chân trời sáng tạo?
2. MỤC ĐÍCH & PHẠM VI KIỂM TRA:
   - Mục đích: Ôn bài tập về nhà hàng ngày / Ôn tập tuần / Thi Giữa học kì 1 / Thi Cuối học kì 1 / Thi Giữa học kì 2 / Thi Cuối năm học / Bồi dưỡng học sinh giỏi?
   - Các chủ đề/chương trọng tâm cần đưa vào đề.
3. HÌNH THỨC & THANG ĐIỂM:
   - Số lượng đề: Thông thường là 3 đề (Đề 1: Khởi động/Cơ bản; Đề 2: Chắc tay/Thông hiểu; Đề 3: Thử thách/Vận dụng cao).
   - Số lượng câu hỏi mỗi đề: 10, 12, 15 hay 20 câu?
   - Thang điểm: 10 điểm.
   - Cơ cấu câu hỏi: Trắc nghiệm khách quan (MCQ 4 lựa chọn), Điền từ/Điền số, Nối cột, Đúng/Sai (Đ/S), Sắp xếp thứ tự, Bài toán/bài văn tự luận điền kết quả từng bước.
4. THỜI GIAN LÀM BÀI:
   - Tự động tính thời gian theo độ khó từng câu (ví dụ: nhận biết 1-2 phút/câu, vận dụng 3-5 phút/câu) hay cố định thời gian toàn bài (vd: 35 phút, 40 phút)? Có tự động thu bài khi hết giờ không?
5. HỆ THỐNG LƯU TRỮ DỮ LIỆU:
   - Chạy độc lập trên máy (Local Storage) hay Kết nối Google Sheets tập trung qua Google Apps Script Web App?

-------------------------------------------------------------------------
BƯỚC 2: YÊU CẦU TIÊU CHUẨN SƯ PHẠM CHUẨN SÁCH GIÁO KHOA
-------------------------------------------------------------------------
1. NGÔN NGỮ & ĐỘ TUỔI:
   - Lớp 1-2: Câu từ ngắn gọn, trong sáng, có thể gắn icon/hình ảnh trực quan, cỡ chữ to (19-20px), màu sắc ấm áp, vui tươi.
   - Lớp 3-4-5: Diễn đạt chuẩn mực thuật ngữ SGK, câu hỏi logic, phân hóa rõ 4 mức độ: Nhận biết -> Thông hiểu -> Vận dụng -> Vận dụng cao.
2. NGUYÊN TẮC GIẢI THÍCH ĐÚNG / SAI CỰC KỲ QUAN TRỌNG:
   - KHÔNG CHỈ đưa ra đáp án đúng. BẮT BUỘC phải chỉ rõ TẠI SAO CÂU CHỌN ĐÓ LẠI SAI (Phân tích lỗi tư duy học sinh hay mắc phải: ví dụ nhầm hàng với lớp, tính từ trái sang phải quên ưu tiên nhân chia, nhầm đơn vị đo độ dài sang diện tích, quên nhớ khi cộng/trừ, chia sai chữ số 0 ở thương, lỗi chính tả phụ âm đầu l/n, s/x,...).
   - Có mục "Gợi ý / Quy tắc cần nhớ" sau mỗi câu sai để học sinh khắc sâu kiến thức.
3. HỆ THỐNG CỦNG CỐ KIẾN THỨC THÍCH ỨNG (ADAPTIVE REMEDIAL PRACTICE):
   - Khi học sinh bấm nộp bài, hệ thống tự động phân loại các chủ đề:
     + Làm tốt (>= 80% điểm): Lời khen ngợi, động viên.
     + Cần chú ý (50% - 79%): Nhắc nhở lưu ý quy tắc.
     + Cần củng cố (< 50%): TỰ ĐỘNG SINH NGAY MỘT PHIẾU BÀI TẬP CỦNG CỐ (gồm 2-3 câu cho mỗi dạng yếu) để học sinh luyện lại ngay tại chỗ và chấm điểm riêng.

-------------------------------------------------------------------------
BƯỚC 3: TIÊU CHUẨN THIẾT KẾ KỸ THUẬT & GIAO DIỆN (UI/UX)
-------------------------------------------------------------------------
1. MÀU SẮC & PHONG CÁCH:
   - Tông màu sáng, tích cực dành cho giáo dục tiểu học: Nền pastel gradient (#fff8e1 -> #e3f6ff), viền bo tròn lớn (border-radius 16-24px), bóng đổ mềm mại, font chữ hiện đại (Nunito, Quicksand, Segoe UI).
   - Màu phản hồi trực quan: Xanh lá (#51cf66) cho đúng/thành công, Đỏ mềm (#ff6b6b) cho câu sai, Vàng cam (#ffa94d) cho đúng 1 phần/cần chú ý.
2. THANH TIÊU ĐỀ (HEADER):
   - Bên trái: Nút [🏠 Trang chủ], Tên học sinh đăng nhập, Nút [🔑 Đổi mật khẩu]. Tất cả đều dạng viên thuốc (pill), chiều cao đồng bộ 36px.
   - Ở giữa: Tiêu đề trang thi (Căn giữa cân đối).
   - Bên phải: Nút [Đăng xuất].
3. KHUNG ĐIỀU HƯỚNG BÀI THI (NAVIGATION PANEL):
   - Màn hình rộng (PC/Laptop): Nằm cố định bên phải bài thi, căn giữa toàn bộ trang web cân đối 2 bên lề. Gồm: Đồng hồ đếm ngược, Số câu đã làm, Ma trận các nút số câu (câu đã làm đổi màu xanh, câu chưa làm màu trắng), bấm nút để cuộn mượt đến câu đó kèm hiệu ứng nhấp nháy viền vàng nhận diện.
   - Màn hình hẹp (Điện thoại/Tablet): Tự động co gọn thành thanh 1 dòng cố định dưới header, có nhãn "📋 Bài thi", số câu đã làm, thanh cuộn ngang các ô số câu, và đồng hồ đếm ngược canh sát mép phải. Không bị đè lên header khi cuộn trang.
4. GAME HÓA ĐỘNG VIÊN TRẺ (GAMIFICATION):
   - Hệ thống đánh giá 3 Sao: 5 điểm đạt 1 sao (★☆☆), 7 điểm đạt 2 sao (★★☆), 9 điểm đạt 3 sao (★★★).
   - Bộ sưu tập Huy hiệu (Badges Shelf): Hiển thị huy hiệu đạt được và huy hiệu còn mờ kèm điều kiện mở khóa (Bước đầu tiên, Điểm 10, Xuất sắc, Tiến bộ, Chăm luyện, Bậc thầy từng dạng bài).

-------------------------------------------------------------------------
BƯỚC 4: HỆ THỐNG QUẢN TRỊ & DATABASE TẬP TRUNG (GOOGLE APPS SCRIPT)
-------------------------------------------------------------------------
1. PHÂN QUYỀN:
   - Học sinh: Đăng nhập bằng mã học sinh do giáo viên cấp, làm bài, xem bảng thành tích cá nhân, đổi mật khẩu.
   - Quản trị viên (Admin): Đăng nhập tài khoản admin, có Bảng quản trị 6 tab:
     + Tab 1: Tổng quan (Điểm trung bình cả lớp, tỉ lệ đúng theo từng dạng bài, cảnh báo học sinh yếu, học sinh chưa làm bài).
     + Tab 2: Danh sách học sinh (Xem chi tiết từng em, đổi mật khẩu, xóa tài khoản).
     + Tab 3: Lịch sử làm bài (Xem toàn bộ bài nộp, thời gian hoàn thành, các câu sai).
     + Tab 4: Nhật ký an ninh (Giám sát đăng nhập, thi cử, phòng tránh gian lận).
     + Tab 5: Biểu đồ học tập (Biểu đồ cột SVG đo số phút học 14 ngày gần nhất, thời gian học tập từng học sinh).
     + Tab 6: Tạo tài khoản học sinh mới.
2. TỰ ĐỘNG HÓA KẾT NỐI:
   - Cung cấp sẵn mã nguồn `Code.gs` chuẩn để triển khai Web App trên Google Apps Script liên kết với Google Sheets (4 tab: Users, Results, Logs, Activity).
   - Tích hợp cơ chế mã hóa SHA-256 kèm Salt bảo mật mật khẩu.
   - Cơ chế Ping mỗi phút tự động đo thời gian học thực tế của học sinh.
   - Hàng đợi gửi tin (Outbox Queue): Tự lưu kết quả nếu mất mạng và tự gửi bù khi có kết nối trở lại.

-------------------------------------------------------------------------
ĐẦU RA BẮT BUỘC (OUTPUT DELIVERABLES):
1. File `index.html` hoàn chỉnh (Code sạch, chạy ngay không cần cài đặt thêm thư viện, tương thích 100% thiết bị di động).
2. File `Code.gs` cho Google Apps Script kết nối với Google Sheets.
3. Tài liệu hướng dẫn thiết lập 5 phút từng bước cho giáo viên/phụ huynh.
=========================================================================
```

---

## PHẦN 3: MA TRẬN ÁP DỤNG MỞ RỘNG CHO CÁC MÔN HỌC & KHỐI LỚP KHÁC

Khi triển khai cho môn học khác, chỉ cần thay đổi mảng chủ đề (`TOPICS`) và hàm sinh câu hỏi (`GENS`), toàn bộ bộ khung giao diện, hẹn giờ, đăng nhập, điều hướng và Google Sheets được tái sử dụng 100%:

| Môn học | Khối lớp | Các dạng bài gợi ý (TOPICS) | Đặc thù hiển thị / Tương tác |
|---|---|---|---|
| **Tiếng Việt** | Lớp 1 - 5 | Chính tả (phân biệt l/n, s/x, ch/tr, dấu hỏi/ngã); Luyện từ và câu (Từ đồng nghĩa, từ loại, biện pháp tu từ so sánh/nhân hóa, câu ghép); Đọc hiểu văn bản | Có đoạn trích bài đọc; chọn từ điền vào chỗ trống; nối từ/cụm từ; trắc nghiệm ý nghĩa đoạn văn. |
| **Tiếng Anh (Primary English)** | Lớp 1 - 5 | Phonics; Vocabulary (Family, Animals, School objects, Daily routines); Grammar (Tenses, Prepositions, Plural nouns); Reading Comprehension | Kèm hình ảnh minh họa SVG; câu hỏi sắp xếp từ xáo trộn thành câu đúng (Scrambled words); trắc nghiệm chọn đáp án đúng. |
| **Khoa học / Tự nhiên & Xã hội** | Lớp 1 - 5 | Cơ thể người & sức khỏe; Động vật & thực vật; Năng lượng, âm thanh, ánh sáng; Môi trường sống | Câu hỏi ghép nối hình ảnh; chọn Đúng/Sai cho các hành vi bảo vệ môi trường/sức khỏe; điền khuyết sơ đồ vòng đời. |
| **Lịch sử & Địa lý** | Lớp 4 - 5 | Dòng thời gian lịch sử; Nhân vật & sự kiện tiêu biểu; Bản đồ địa lý tự nhiên, khí hậu, các vùng miền Việt Nam | Sơ đồ trục thời gian SVG; trắc nghiệm điền mốc năm sự kiện; nối đặc điểm địa hình với vùng miền tương ứng. |
| **Toán (Lớp 1 - 3 & 5)** | Lớp 1, 2, 3, 5 | Lớp 1-2: Phép cộng trừ trong phạm vi 10, 20, 100; xem đồng hồ giờ đúng; đoạn thẳng.<br>Lớp 3: Nhân chia số có 3 chữ số, chu vi/diện tích hình chữ nhật/vuông.<br>Lớp 5: Phân số, số thập phân, tỉ số phần trăm, vận tốc - quãng đường - thời gian, diện tích hình thang/hình tròn. | Sinh số ngẫu nhiên theo đúng quy tắc chương trình lớp đó (không vượt quá giới hạn số đã học); hình vẽ SVG trực quan tương ứng. |

---

## PHẦN 4: HƯỚNG DẪN BẢN QUYỀN & CHUYỂN GIAO SANG CÁC NỀN TẢNG AI KHÁC

1. **Khi chuyển sang ChatGPT (GPT-4o / GPT-4o-mini)**:
   - Gửi file này vào mục đính kèm hoặc copy toàn bộ **Phần 2 (Master Prompt)**.
   - Thêm câu lệnh yêu cầu cụ thể: *"Hãy tạo ứng dụng luyện thi Tiếng Việt lớp 4 Học kỳ 1 theo đúng Master Prompt trên."*

2. **Khi chuyển sang Claude (Claude 3.5 Sonnet / Claude 3 Opus)**:
   - Claude hỗ trợ Artifact rất mạnh. Sau khi dán Master Prompt, Claude có thể xuất ra file Artifact tương tác trực tiếp chạy ngay trong khung preview.

3. **Khi triển khai trên GitHub cá nhân mới**:
   - Chỉ cần tạo 1 repository GitHub bất kỳ -> bật GitHub Pages tại nhánh `main` -> tải file `index.html` lên là hệ thống hoạt động ngay lập tức trên toàn cầu với tốc độ cao.
