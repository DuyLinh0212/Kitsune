# Kitsune Platform v3.0.0

Kitsune v3 chuyển hành trình học chính sang **Chủ đề → Bài học → Từ vựng/Kanji** trên Web và Mobile. Người học có bản đồ tiến độ theo chủ đề, học từng mục theo thứ tự và mở phiên ôn tập SRS đúng phạm vi bài học đang chọn.

## Điểm mới

- SRS theo bài học, giữ nguyên lịch sử thẻ khi một từ xuất hiện ở nhiều bài; chi tiết số thẻ theo cấp được thu gọn sau một nút xem.
- Câu hỏi điền khuyết dùng câu ví dụ theo ngữ cảnh và luôn hiển thị câu đầy đủ cùng bản dịch sau khi trả lời.
- Bốn minigame dùng chung kho từ vựng: Bong bóng từ vựng, Kéo nối Kana, Siêu trí nhớ và Nghe đoán từ.
- Trang Admin quản lý Chủ đề/Bài học, nhập nội dung từ Folder cũ và tạo bản nháp bài học bằng Gemini dựa trên đúng ID từ/Kanji có trong hệ thống.
- Giao diện học mới theo phong cách bản đồ washi, responsive, hỗ trợ focus rõ ràng và reduced motion; favicon Angular được thay bằng logo Kitsune.

## Kiến trúc dữ liệu

Migration `Kitsune.Web/sql/005_topics_lessons_minigames.sql` bổ sung `Topics`, `Lessons`, `LessonItems`, `UserLessonProgress`, `SrsCardLessons` và `MinigameSessions` cùng index/RLS. `VocabularyFolder` vẫn được giữ để nhập dữ liệu và tương thích trong giai đoạn chuyển đổi.

## Triển khai vận hành

1. Chạy migration `005_topics_lessons_minigames.sql` trong Supabase SQL Editor.
2. Đặt secret `GEMINI_API_KEY` cho Supabase Edge Functions.
3. Deploy function `generate-topic-lessons`.
4. Tạo/publish ít nhất một Topic và Lesson trong Admin để người dùng bắt đầu học.

Không lưu Gemini API key trong repository. Nếu một khóa từng xuất hiện trong tài liệu hoặc lịch sử Git, hãy thu hồi và tạo khóa mới trước khi deploy.
