<div align="center">
  <h1>🦊 Kitsune Platform</h1>
  <p><b>Learn Smarter, Not Harder.</b></p>
  <p><i>A comprehensive, cross-platform Japanese learning ecosystem.</i></p>

  ![Flutter](https://img.shields.io/badge/Flutter-%2302569B.svg?style=for-the-badge&logo=Flutter&logoColor=white)
  ![Angular](https://img.shields.io/badge/Angular-%23DD0031.svg?style=for-the-badge&logo=angular&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Dart](https://img.shields.io/badge/Dart-%230175C2.svg?style=for-the-badge&logo=dart&logoColor=white)
</div>

---

## 📖 Giới thiệu (About the Project)

**Kitsune** là một nền tảng học tiếng Nhật toàn diện được thiết kế dành riêng cho học sinh, sinh viên và người đi làm tại Việt Nam (trình độ N5 đến N3). Dự án không chỉ là một ứng dụng di động mà còn bao gồm một hệ sinh thái đầy đủ với cổng thông tin web và hệ thống quản trị nội dung.

Mục tiêu cốt lõi của Kitsune là giúp người học ghi nhớ từ vựng và Kanji lâu dài thông qua thuật toán lặp lại ngắt quãng (**SRS - Spaced Repetition System**), kết hợp với trải nghiệm UI/UX tối ưu, mượt mà và tập trung vào nội dung ("Chữ Nhật là nhân vật chính").

### 📸 Giao diện ứng dụng (Screenshots)

**1. Giao diện Web (User & Admin)**
*(Dán ảnh giao diện Web của bạn vào đây - Gợi ý: Kéo thả ảnh trực tiếp vào file này trên VS Code hoặc GitHub)*
<!-- ![Web Interface](link-anh-web-cua-ban) -->

**2. Giao diện Mobile App (Android/iOS)**
*(Dán ảnh giao diện Mobile của bạn vào đây - Gợi ý: Kéo thả ảnh trực tiếp vào file này trên VS Code hoặc GitHub)*
<!-- ![Mobile Interface](link-anh-mobile-cua-ban) -->

---

## 🚀 Điểm nhấn Kỹ thuật (Technical Highlights)

Dự án này được xây dựng từ con số không, thể hiện khả năng thiết kế hệ thống, lựa chọn công nghệ và triển khai Full-stack của tôi:

*   **Kiến trúc Hệ thống Toàn diện (Cross-platform Architecture):** Phát triển đồng thời ứng dụng Mobile (Flutter) và Web (Angular), chia sẻ chung một Backend Serverless.
*   **Quản lý Trạng thái Phức tạp (Advanced State Management):** Ứng dụng kiến trúc `Riverpod` cực kỳ mạnh mẽ trong Flutter để xử lý luồng dữ liệu phức tạp của các bài học, thuật toán SRS và trạng thái đồng bộ người dùng.
*   **Modern Web Development:** Sử dụng **Angular** với Server-Side Rendering (SSR), tự động hóa việc tiêm biến môi trường (CI/CD Environment Injection) an toàn trên Vercel.
*   **Backend & Bảo mật (Secure BaaS):** Tích hợp **Supabase** (PostgreSQL) với thiết kế Schema Database phức tạp, ứng dụng triệt để Row Level Security (RLS) để bảo vệ dữ liệu người dùng.
*   **Thuật toán Học tập (Algorithm Implementation):** Tự xây dựng logic và thuật toán tính toán thời gian ôn tập (Spaced Repetition) cho Kanji và Từ vựng.
*   **UI/UX & Accessibility:** Tuân thủ tiêu chuẩn thiết kế WCAG AA, kiến trúc UI nhất quán (Design System), animation mượt mà (Lottie) và phản hồi tương tác dưới 200ms.

---

## ✨ Tính năng Cốt lõi (Core Features)

### 📱 Dành cho Người học (Mobile App & Web Client)
*   **🧠 Spaced Repetition System (SRS):** Hệ thống flashcard thông minh tự động tính toán thời điểm hoàn hảo để ôn tập Từ vựng và Kanji.
*   **🎌 Interactive Kanji Dictionary:** Từ điển Kanji tương tác chi tiết với âm On, âm Kun, âm Hán Việt, số nét và cách nhớ (mnemonics).
*   **📚 Quản lý Thư mục Học tập:** Cho phép người dùng tự do nhóm các từ vựng và cấu trúc ngữ pháp theo các thư mục cá nhân hóa.
*   **🏆 Gamification & Motivation:** Hệ thống Streak (chuỗi ngày học), điểm kinh nghiệm (XP), và Leaderboard giúp duy trì động lực hằng ngày.
*   **📝 Quizzes & Test:** Đánh giá năng lực chuẩn JLPT với các bài kiểm tra được thiết kế linh hoạt.

### ⚙️ Dành cho Quản trị viên (Admin Portal)
*   **Quản lý Nội dung (CMS):** Giao diện Web (Angular) dành riêng cho admin để thêm/sửa/xóa từ vựng, Kanji, ngữ pháp và bộ đề thi.
*   **Thống kê:** Theo dõi lượng người dùng đăng ký và hoạt động.

---

## 🏗 Cấu trúc Dự án (Project Structure)

Dự án được tổ chức theo mô hình Monorepo (để quản lý web) kết hợp với Mobile platform:

```text
KitsunePlatform/
├── kitsune_app/           # 📱 Ứng dụng Mobile (Flutter / Dart)
│   ├── lib/               # Chứa logic UI, Riverpod providers, Models...
│   └── run.bat            # Script chạy local an toàn với biến môi trường
├── Kitsune.Web/           # 🌐 Hệ sinh thái Web (Angular)
│   ├── Kitsune.Web.User/  # Web Client dành cho người học
│   └── Kitsune.Web.Admin/ # Web Portal dành cho Quản trị viên quản lý nội dung
└── scripts/               # Các script CI/CD tự động hóa môi trường
```

---

## 🛠 Hướng dẫn Cài đặt (Getting Started)

> **Lưu ý:** Vì lý do bảo mật, toàn bộ khóa API và URL của Database đều được ẩn khỏi mã nguồn (Git). Bạn cần có file cấu hình môi trường để chạy.

### 1. Ứng dụng Mobile (Flutter)
*   Yêu cầu: `Flutter SDK >= 3.10`
*   Di chuyển vào thư mục: `cd kitsune_app`
*   Cài đặt thư viện: `flutter pub get`
*   Chạy ứng dụng: Để chạy ứng dụng với các biến môi trường, hãy chạy file script đã được cấu hình sẵn:
    ```bash
    .\run.bat
    ```

### 2. Ứng dụng Web (Angular Admin/User)
*   Yêu cầu: `Node.js >= 18`
*   Di chuyển vào thư mục Web tương ứng (ví dụ: `cd Kitsune.Web/Kitsune.Web.User`)
*   Cài đặt thư viện: `npm install`
*   Tạo file `.env` ở thư mục gốc của Web app (ngang hàng với `package.json`) với định dạng:
    ```env
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_key
    ```
*   Chạy server: `npm start` *(script `set-env.js` sẽ tự động đọc file `.env` và nạp vào Angular)*.

---

## 👨‍💻 Tác giả (Author)

*   **Nguyễn Duy Linh** 
*   *Vai trò:* Full-stack Developer / Mobile Developer / System Architect
*   *Liên hệ:* [Thêm link GitHub/LinkedIn của bạn tại đây]

---
*Phát triển với ❤️ dành cho cộng đồng học tiếng Nhật.*
