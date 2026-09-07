// kitsune_app/lib/core/localization/app_strings.dart
import 'package:flutter/material.dart';

enum AppLanguage {
  vi('vi', 'Tiếng Việt', '🇻🇳', Locale('vi', 'VN')),
  en('en', 'English', '🇺🇸', Locale('en', 'US')),
  ja('ja', '日本語', '🇯🇵', Locale('ja', 'JP'));

  const AppLanguage(this.code, this.displayName, this.flag, this.locale);

  final String code;
  final String displayName;
  final String flag;
  final Locale locale;

  static AppLanguage fromCode(String? code) {
    return AppLanguage.values.firstWhere(
      (lang) => lang.code == code,
      orElse: () => AppLanguage.vi,
    );
  }
}

class AppStrings {
  const AppStrings(this.language);

  final AppLanguage language;

  static AppStrings of(AppLanguage lang) => AppStrings(lang);

  // --- NAVIGATION (Bottom Bar & Headers) ---
  String get navHome => switch (language) {
        AppLanguage.vi => 'Trang chủ',
        AppLanguage.en => 'Home',
        AppLanguage.ja => 'ホーム',
      };

  String get navSearch => switch (language) {
        AppLanguage.vi => 'Tra cứu',
        AppLanguage.en => 'Search',
        AppLanguage.ja => '検索',
      };

  String get navTopics => switch (language) {
        AppLanguage.vi => 'Lộ trình',
        AppLanguage.en => 'Topics',
        AppLanguage.ja => 'コース',
      };

  String get navReview => switch (language) {
        AppLanguage.vi => 'Ôn tập',
        AppLanguage.en => 'Review',
        AppLanguage.ja => '復習',
      };

  String get navProfile => switch (language) {
        AppLanguage.vi => 'Cá nhân',
        AppLanguage.en => 'Profile',
        AppLanguage.ja => 'マイページ',
      };

  // --- COMMON ACTIONS ---
  String get retry => switch (language) {
        AppLanguage.vi => 'Thử lại',
        AppLanguage.en => 'Retry',
        AppLanguage.ja => '再試行',
      };

  String get cancel => switch (language) {
        AppLanguage.vi => 'Hủy',
        AppLanguage.en => 'Cancel',
        AppLanguage.ja => 'キャンセル',
      };

  String get confirm => switch (language) {
        AppLanguage.vi => 'Xác nhận',
        AppLanguage.en => 'Confirm',
        AppLanguage.ja => '確認',
      };

  String get close => switch (language) {
        AppLanguage.vi => 'Đóng',
        AppLanguage.en => 'Close',
        AppLanguage.ja => '閉じる',
      };

  String get back => switch (language) {
        AppLanguage.vi => 'Quay lại',
        AppLanguage.en => 'Back',
        AppLanguage.ja => '戻る',
      };

  String get save => switch (language) {
        AppLanguage.vi => 'Lưu',
        AppLanguage.en => 'Save',
        AppLanguage.ja => '保存',
      };

  // --- LESSON STUDY & FLASHCARD ---
  String get previous => switch (language) {
        AppLanguage.vi => 'Trước',
        AppLanguage.en => 'Previous',
        AppLanguage.ja => '前へ',
      };

  String get next => switch (language) {
        AppLanguage.vi => 'Tiếp theo',
        AppLanguage.en => 'Next',
        AppLanguage.ja => '次へ',
      };

  String get complete => switch (language) {
        AppLanguage.vi => 'Hoàn thành',
        AppLanguage.en => 'Complete',
        AppLanguage.ja => '完了',
      };

  String get memorized => switch (language) {
        AppLanguage.vi => 'Đã nhớ',
        AppLanguage.en => 'Remembered',
        AppLanguage.ja => '覚えた',
      };

  String get meaning => switch (language) {
        AppLanguage.vi => 'Ý nghĩa',
        AppLanguage.en => 'Meaning',
        AppLanguage.ja => '意味',
      };

  String get readings => switch (language) {
        AppLanguage.vi => 'Cách đọc',
        AppLanguage.en => 'Readings',
        AppLanguage.ja => '読み方',
      };

  String get onyomi => switch (language) {
        AppLanguage.vi => 'Âm On',
        AppLanguage.en => "On'yomi",
        AppLanguage.ja => '音読み',
      };

  String get kunyomi => switch (language) {
        AppLanguage.vi => 'Âm Kun',
        AppLanguage.en => "Kun'yomi",
        AppLanguage.ja => '訓読み',
      };

  String get sinoVietnamese => switch (language) {
        AppLanguage.vi => 'Hán Việt',
        AppLanguage.en => 'Sino-Vietnamese',
        AppLanguage.ja => '名のり / 漢音',
      };

  String get example => switch (language) {
        AppLanguage.vi => 'Ví dụ',
        AppLanguage.en => 'Example',
        AppLanguage.ja => '例文',
      };

  String get notes => switch (language) {
        AppLanguage.vi => 'Ghi chú',
        AppLanguage.en => 'Notes',
        AppLanguage.ja => 'メモ',
      };

  String get noNotesYet => switch (language) {
        AppLanguage.vi => 'Chưa có ghi chú đặc biệt cho mục này.',
        AppLanguage.en => 'No special notes for this item yet.',
        AppLanguage.ja => 'この項目の特別なメモはまだありません。',
      };

  String get lessonEmpty => switch (language) {
        AppLanguage.vi => 'Bài học chưa có nội dung.',
        AppLanguage.en => 'This lesson has no content yet.',
        AppLanguage.ja => 'このレッスンにはまだ内容がありません。',
      };

  String get cannotLoadLesson => switch (language) {
        AppLanguage.vi => 'Không thể tải bài học.',
        AppLanguage.en => 'Failed to load lesson.',
        AppLanguage.ja => 'レッスンを読み込めませんでした。',
      };

  String get savingProgress => switch (language) {
        AppLanguage.vi => 'Đang lưu tiến độ của bạn…',
        AppLanguage.en => 'Saving your progress…',
        AppLanguage.ja => '進捗を保存しています…',
      };

  String get progressSaved => switch (language) {
        AppLanguage.vi => 'Tiến độ đã được lưu.',
        AppLanguage.en => 'Progress saved.',
        AppLanguage.ja => '進捗が保存されました。',
      };

  String get syncError => switch (language) {
        AppLanguage.vi => 'Chưa thể đồng bộ lúc này. Bạn có thể thử lưu lại.',
        AppLanguage.en => 'Could not sync right now. You can try saving again.',
        AppLanguage.ja => '同期できませんでした。再試行してください。',
      };

  // --- LESSON COMPLETION SCREEN ---
  String get lessonCompletedTitle => switch (language) {
        AppLanguage.vi => 'Hoàn thành bài học',
        AppLanguage.en => 'Lesson Completed',
        AppLanguage.ja => 'レッスン完了',
      };

  String get congratulations => switch (language) {
        AppLanguage.vi => 'Tuyệt vời!',
        AppLanguage.en => 'Great Job!',
        AppLanguage.ja => '素晴らしいです！',
      };

  String lessonCompletedSubtitle(String lessonTitle) => switch (language) {
        AppLanguage.vi => '$lessonTitle đã hoàn thành.',
        AppLanguage.en => 'You completed $lessonTitle.',
        AppLanguage.ja => '$lessonTitle を完了しました。',
      };

  String get learningResults => switch (language) {
        AppLanguage.vi => 'Kết quả học tập',
        AppLanguage.en => 'Learning Results',
        AppLanguage.ja => '学習結果',
      };

  String get learnedWords => switch (language) {
        AppLanguage.vi => 'Số từ đã học',
        AppLanguage.en => 'Learned Words',
        AppLanguage.ja => '学習した単語',
      };

  String get rememberedCount => switch (language) {
        AppLanguage.vi => 'Số từ đã nhớ',
        AppLanguage.en => 'Remembered Words',
        AppLanguage.ja => '正解数',
      };

  String get memoryRate => switch (language) {
        AppLanguage.vi => 'Tỷ lệ ghi nhớ',
        AppLanguage.en => 'Memory Rate',
        AppLanguage.ja => '正答率',
      };

  String get studyTime => switch (language) {
        AppLanguage.vi => 'Thời gian học',
        AppLanguage.en => 'Study Time',
        AppLanguage.ja => '学習時間',
      };

  String formatMinutes(int minutes) => switch (language) {
        AppLanguage.vi => '$minutes phút',
        AppLanguage.en => '$minutes mins',
        AppLanguage.ja => '$minutes分',
      };

  String get nextLesson => switch (language) {
        AppLanguage.vi => 'Bài học tiếp theo',
        AppLanguage.en => 'Next Lesson',
        AppLanguage.ja => '次のレッスン',
      };

  String get returnToTopics => switch (language) {
        AppLanguage.vi => 'Quay về lộ trình',
        AppLanguage.en => 'Return to Topics',
        AppLanguage.ja => 'トピック一覧に戻る',
      };

  // --- PROFILE & SETTINGS ---
  String get profileTitle => switch (language) {
        AppLanguage.vi => 'Hồ sơ cá nhân',
        AppLanguage.en => 'Profile',
        AppLanguage.ja => 'マイページ',
      };

  String get appSettings => switch (language) {
        AppLanguage.vi => 'Cài đặt ứng dụng',
        AppLanguage.en => 'App Settings',
        AppLanguage.ja => 'アプリ設定',
      };

  String get displayLanguage => switch (language) {
        AppLanguage.vi => 'Ngôn ngữ hiển thị',
        AppLanguage.en => 'Display Language',
        AppLanguage.ja => '表示言語',
      };

  String get selectLanguageTitle => switch (language) {
        AppLanguage.vi => 'Chọn ngôn ngữ',
        AppLanguage.en => 'Select Language',
        AppLanguage.ja => '言語を選択',
      };

  String get studyStats => switch (language) {
        AppLanguage.vi => 'Thống kê học tập',
        AppLanguage.en => 'Study Stats',
        AppLanguage.ja => '学習統計',
      };

  String get knowledgeMap => switch (language) {
        AppLanguage.vi => 'Bản đồ năng lực',
        AppLanguage.en => 'Knowledge Graph',
        AppLanguage.ja => '能力マップ',
      };

  String get accountInfo => switch (language) {
        AppLanguage.vi => 'Thông tin tài khoản',
        AppLanguage.en => 'Account Info',
        AppLanguage.ja => 'アカウント情報',
      };

  String get edit => switch (language) {
        AppLanguage.vi => 'Chỉnh sửa',
        AppLanguage.en => 'Edit',
        AppLanguage.ja => '編集',
      };

  String get logout => switch (language) {
        AppLanguage.vi => 'Đăng xuất',
        AppLanguage.en => 'Log Out',
        AppLanguage.ja => 'ログアウト',
      };

  String get streakLabel => switch (language) {
        AppLanguage.vi => 'Chuỗi ngày',
        AppLanguage.en => 'Streak',
        AppLanguage.ja => '連続記録',
      };

  String get srsDueLabel => switch (language) {
        AppLanguage.vi => 'SRS đến hạn',
        AppLanguage.en => 'SRS Due',
        AppLanguage.ja => '復習予定',
      };

  // --- TOPICS & COURSES ---
  String get courseHeaderSubtitle => switch (language) {
        AppLanguage.vi => 'Chọn một chủ đề và học theo từng bài để giữ mạch kiến thức.',
        AppLanguage.en => 'Choose a topic and learn lesson by lesson to stay on track.',
        AppLanguage.ja => 'トピックを選んで、順を追って学習を進めましょう。',
      };

  String get lessonPathTitle => switch (language) {
        AppLanguage.vi => 'Lộ trình bài học',
        AppLanguage.en => 'Lesson Path',
        AppLanguage.ja => 'レッスンカリキュラム',
      };

  String get termsOfService => switch (language) {
        AppLanguage.vi => 'Điều khoản dịch vụ',
        AppLanguage.en => 'Terms of Service',
        AppLanguage.ja => '利用規約',
      };
}
