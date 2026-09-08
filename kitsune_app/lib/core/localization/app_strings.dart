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

  // ==========================================
  // --- NAVIGATION (Bottom Bar & Headers) ---
  // ==========================================
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

  // ==========================================
  // --- COMMON ACTIONS & STATES ---
  // ==========================================
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

  String get delete => switch (language) {
        AppLanguage.vi => 'Xóa',
        AppLanguage.en => 'Delete',
        AppLanguage.ja => '削除',
      };

  String get edit => switch (language) {
        AppLanguage.vi => 'Chỉnh sửa',
        AppLanguage.en => 'Edit',
        AppLanguage.ja => '編集',
      };

  String get create => switch (language) {
        AppLanguage.vi => 'Tạo',
        AppLanguage.en => 'Create',
        AppLanguage.ja => '作成',
      };

  String get loading => switch (language) {
        AppLanguage.vi => 'Đang tải...',
        AppLanguage.en => 'Loading...',
        AppLanguage.ja => '読み込み中...',
      };

  String get errorPrefix => switch (language) {
        AppLanguage.vi => 'Lỗi',
        AppLanguage.en => 'Error',
        AppLanguage.ja => 'エラー',
      };

  String get empty => switch (language) {
        AppLanguage.vi => 'Chưa có dữ liệu',
        AppLanguage.en => 'No data available',
        AppLanguage.ja => 'データがありません',
      };

  String get all => switch (language) {
        AppLanguage.vi => 'Tất cả',
        AppLanguage.en => 'All',
        AppLanguage.ja => 'すべて',
      };

  String get search => switch (language) {
        AppLanguage.vi => 'Tìm kiếm',
        AppLanguage.en => 'Search',
        AppLanguage.ja => '検索',
      };

  String get appErrorTitle => switch (language) {
        AppLanguage.vi => 'Có lỗi khi hiển thị phần này.',
        AppLanguage.en => 'An error occurred displaying this section.',
        AppLanguage.ja => 'このセクションの表示中にエラーが発生しました。',
      };

  String commonError(Object error) => switch (language) {
        AppLanguage.vi => 'Lỗi: $error',
        AppLanguage.en => 'Error: $error',
        AppLanguage.ja => 'エラー: $error',
      };

  String get splashTagline => switch (language) {
        AppLanguage.vi => 'Học tiếng Nhật mỗi ngày.',
        AppLanguage.en => 'Learn Japanese every day.',
        AppLanguage.ja => '毎日日本語を学びましょう。',
      };

  // ==========================================
  // --- AUTH (Login, Register, Forgot) ---
  // ==========================================
  String get loginTitle => switch (language) {
        AppLanguage.vi => 'Đăng nhập để tiếp tục hành trình học.',
        AppLanguage.en => 'Log in to continue your learning journey.',
        AppLanguage.ja => 'ログインして学習を続けましょう。',
      };

  String get loginSubtitle => switch (language) {
        AppLanguage.vi =>
            'Kitsune giữ sẵn từ vựng, kanji, quiz và lịch ôn tập của bạn ở cùng một nơi.',
        AppLanguage.en =>
            'Kitsune keeps your vocabulary, kanji, quizzes, and review schedule in one place.',
        AppLanguage.ja =>
            'Kitsuneは単語、漢字、クイズ、復習スケジュールを一括管理します。',
      };

  String get loginAccountLabel => switch (language) {
        AppLanguage.vi => 'Tên đăng nhập hoặc email',
        AppLanguage.en => 'Username or email',
        AppLanguage.ja => 'ユーザー名またはメール',
      };

  String get loginPasswordLabel => switch (language) {
        AppLanguage.vi => 'Mật khẩu',
        AppLanguage.en => 'Password',
        AppLanguage.ja => 'パスワード',
      };

  String get loginButton => switch (language) {
        AppLanguage.vi => 'Đăng nhập',
        AppLanguage.en => 'Log in',
        AppLanguage.ja => 'ログイン',
      };

  String get loginForgotPassword => switch (language) {
        AppLanguage.vi => 'Quên mật khẩu?',
        AppLanguage.en => 'Forgot password?',
        AppLanguage.ja => 'パスワードをお忘れですか？',
      };

  String get loginNoAccountPrompt => switch (language) {
        AppLanguage.vi =>
            'Chưa có tài khoản? Tạo ngay để lưu tiến độ ôn tập và quiz cá nhân.',
        AppLanguage.en =>
            "Don't have an account? Create one now to save your review and quiz progress.",
        AppLanguage.ja =>
            'アカウントをお持ちでないですか？登録して学習進捗を保存しましょう。',
      };

  String get loginRegisterButton => switch (language) {
        AppLanguage.vi => 'Đăng ký',
        AppLanguage.en => 'Sign up',
        AppLanguage.ja => '新規登録',
      };

  String get loginRequiredUsername => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập tên đăng nhập hoặc email',
        AppLanguage.en => 'Please enter username or email',
        AppLanguage.ja => 'ユーザー名またはメールアドレスを入力してください',
      };

  String get loginRequiredPassword => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập mật khẩu',
        AppLanguage.en => 'Please enter password',
        AppLanguage.ja => 'パスワードを入力してください',
      };

  String get loginFailedDefault => switch (language) {
        AppLanguage.vi => 'Tên đăng nhập hoặc mật khẩu không chính xác.',
        AppLanguage.en => 'Invalid username or password.',
        AppLanguage.ja => 'ユーザー名またはパスワードが正しくありません。',
      };

  String get loginUserNotFound => switch (language) {
        AppLanguage.vi => 'Tài khoản không tồn tại.',
        AppLanguage.en => 'Account does not exist.',
        AppLanguage.ja => 'アカウントが存在しません。',
      };

  // Register
  String get registerHeroTitle => switch (language) {
        AppLanguage.vi => 'Bắt đầu hành trình học tiếng Nhật của bạn.',
        AppLanguage.en => 'Start your Japanese learning journey.',
        AppLanguage.ja => '日本語学習の旅を始めましょう。',
      };

  String get registerHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Tạo tài khoản để đồng bộ tiến độ, thư mục riêng và các quiz bạn tự xây dựng.',
        AppLanguage.en =>
            'Create an account to sync progress, folders, and custom quizzes.',
        AppLanguage.ja =>
            'アカウントを作成して進捗、単語帳、自作クイズを同期しましょう。',
      };

  String get registerAccountInfo => switch (language) {
        AppLanguage.vi => 'Thông tin tài khoản',
        AppLanguage.en => 'Account Information',
        AppLanguage.ja => 'アカウント情報',
      };

  String get registerUsernameLabel => switch (language) {
        AppLanguage.vi => 'Tên đăng nhập',
        AppLanguage.en => 'Username',
        AppLanguage.ja => 'ユーザー名',
      };

  String get registerUsernameRequired => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập tên đăng nhập',
        AppLanguage.en => 'Please enter a username',
        AppLanguage.ja => 'ユーザー名を入力してください',
      };

  String get registerUsernameMinLength => switch (language) {
        AppLanguage.vi => 'Tên đăng nhập phải có ít nhất 2 ký tự',
        AppLanguage.en => 'Username must be at least 2 characters',
        AppLanguage.ja => 'ユーザー名は2文字以上である必要があります',
      };

  String get registerEmailLabel => switch (language) {
        AppLanguage.vi => 'Email',
        AppLanguage.en => 'Email',
        AppLanguage.ja => 'メールアドレス',
      };

  String get registerEmailRequired => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập email',
        AppLanguage.en => 'Please enter an email',
        AppLanguage.ja => 'メールアドレスを入力してください',
      };

  String get registerEmailInvalid => switch (language) {
        AppLanguage.vi => 'Email không hợp lệ',
        AppLanguage.en => 'Invalid email address',
        AppLanguage.ja => '無効なメールアドレスです',
      };

  String get registerPasswordLabel => switch (language) {
        AppLanguage.vi => 'Mật khẩu',
        AppLanguage.en => 'Password',
        AppLanguage.ja => 'パスワード',
      };

  String get registerPasswordRequired => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập mật khẩu',
        AppLanguage.en => 'Please enter a password',
        AppLanguage.ja => 'パスワードを入力してください',
      };

  String get registerPasswordMinLength => switch (language) {
        AppLanguage.vi => 'Mật khẩu phải có ít nhất 6 ký tự',
        AppLanguage.en => 'Password must be at least 6 characters',
        AppLanguage.ja => 'パスワードは6文字以上である必要があります',
      };

  String get registerFullNameLabel => switch (language) {
        AppLanguage.vi => 'Họ và tên',
        AppLanguage.en => 'Full Name',
        AppLanguage.ja => '氏名',
      };

  String get registerAgreeTerms => switch (language) {
        AppLanguage.vi => 'Tôi đồng ý với ',
        AppLanguage.en => 'I agree with the ',
        AppLanguage.ja => '利用規約に同意します：',
      };

  String get registerSubmitButton => switch (language) {
        AppLanguage.vi => 'Tạo tài khoản',
        AppLanguage.en => 'Create Account',
        AppLanguage.ja => 'アカウントを作成',
      };

  String get registerAlreadyHaveAccount => switch (language) {
        AppLanguage.vi => 'Đã có tài khoản? ',
        AppLanguage.en => 'Already have an account? ',
        AppLanguage.ja => 'アカウントをお持ちですか？ ',
      };

  String get registerLoginNow => switch (language) {
        AppLanguage.vi => 'Đăng nhập',
        AppLanguage.en => 'Log in',
        AppLanguage.ja => 'ログイン',
      };

  String get registerTermsRequired => switch (language) {
        AppLanguage.vi => 'Vui lòng đồng ý với Điều khoản dịch vụ',
        AppLanguage.en => 'Please agree to the Terms of Service',
        AppLanguage.ja => '利用規約に同意してください',
      };

  String get registerUserExists => switch (language) {
        AppLanguage.vi => 'Email hoặc tên người dùng đã tồn tại.',
        AppLanguage.en => 'Email or username already exists.',
        AppLanguage.ja => 'メールアドレスまたはユーザー名は既に存在します。',
      };

  // Forgot Password
  String get forgotPasswordTitle => switch (language) {
        AppLanguage.vi => 'Lấy lại quyền truy cập thật gọn.',
        AppLanguage.en => 'Recover your account easily.',
        AppLanguage.ja => 'アカウントを素早く復元。',
      };

  String get forgotPasswordSubtitle => switch (language) {
        AppLanguage.vi =>
            'Nhập email để nhận liên kết đặt lại mật khẩu và quay lại hành trình học ngay khi sẵn sàng.',
        AppLanguage.en =>
            'Enter your email to receive a password reset link and return to your learning path.',
        AppLanguage.ja =>
            'メールアドレスを入力してパスワード再設定リンクを受け取り、学習を再開しましょう。',
      };

  String get forgotPasswordEmailSection => switch (language) {
        AppLanguage.vi => 'Email khôi phục',
        AppLanguage.en => 'Recovery Email',
        AppLanguage.ja => '復旧用メールアドレス',
      };

  String get forgotPasswordSubmitButton => switch (language) {
        AppLanguage.vi => 'Gửi liên kết khôi phục',
        AppLanguage.en => 'Send Recovery Link',
        AppLanguage.ja => '再設定リンクを送信',
      };

  String get forgotPasswordBackToLogin => switch (language) {
        AppLanguage.vi => 'Quay lại đăng nhập',
        AppLanguage.en => 'Back to log in',
        AppLanguage.ja => 'ログインに戻る',
      };

  String get forgotPasswordSuccessTitle => switch (language) {
        AppLanguage.vi => 'Đã gửi hướng dẫn khôi phục',
        AppLanguage.en => 'Recovery instructions sent',
        AppLanguage.ja => '再設定の案内を送信しました',
      };

  String forgotPasswordSuccessSubtitle(String email) => switch (language) {
        AppLanguage.vi =>
            'Chúng tôi đã gửi email hướng dẫn đến $email. Vui lòng kiểm tra hộp thư (bao gồm cả thư rác).',
        AppLanguage.en =>
            'We sent instructions to $email. Please check your inbox (including spam).',
        AppLanguage.ja =>
            '$email 宛に案内を送信しました。受信箱（迷惑メール含む）をご確認ください。',
      };

  String get termsOfService => switch (language) {
        AppLanguage.vi => 'Điều khoản dịch vụ',
        AppLanguage.en => 'Terms of Service',
        AppLanguage.ja => '利用規約',
      };

  // Helper method to map raw backend auth errors
  String mapAuthError(String rawError) {
    final lower = rawError.toLowerCase();
    if (lower.contains('không chính xác') ||
        lower.contains('invalid login credentials') ||
        lower.contains('invalid_credentials') ||
        lower.contains('invalid grant')) {
      return loginFailedDefault;
    }
    if (lower.contains('đã tồn tại') ||
        lower.contains('already registered') ||
        lower.contains('already exists')) {
      return registerUserExists;
    }
    if (lower.contains('không tồn tại') || lower.contains('user not found')) {
      return loginUserNotFound;
    }
    if (lower.contains('đồng ý') || lower.contains('terms')) {
      return registerTermsRequired;
    }
    return rawError;
  }

  // ==========================================
  // --- HOME PAGE ---
  // ==========================================
  String get homeTitle => switch (language) {
        AppLanguage.vi => 'Trang chủ',
        AppLanguage.en => 'Home',
        AppLanguage.ja => 'ホーム',
      };

  String homeGreeting(String name) => switch (language) {
        AppLanguage.vi => 'Xin chào $name, hôm nay mình học gì tiếp?',
        AppLanguage.en => 'Hello $name, what will we learn today?',
        AppLanguage.ja => 'こんにちは $name さん、今日も一緒に学びましょう！',
      };

  String homeSrsDue(int count) => switch (language) {
        AppLanguage.vi =>
            'Bạn đang có $count thẻ đến hạn. Đây là lúc tốt nhất để giữ nhịp nhớ lâu.',
        AppLanguage.en =>
            'You have $count cards due for review. Great time to reinforce memory.',
        AppLanguage.ja =>
            '復習カードが $count 枚あります。記憶を定着させる絶好のタイミングです。',
      };

  String get homeNoSrsDue => switch (language) {
        AppLanguage.vi =>
            'Hôm nay chưa có thẻ đến hạn. Bạn có thể mở một bài học hoặc thử quiz mới.',
        AppLanguage.en =>
            'No cards due today. You can explore a new lesson or take a quiz.',
        AppLanguage.ja =>
            '本日復習するカードはありません。新しいレッスンやクイズを試してみましょう。',
      };

  String get reviewNow => switch (language) {
        AppLanguage.vi => 'Ôn ngay',
        AppLanguage.en => 'Review Now',
        AppLanguage.ja => '今すぐ復習',
      };

  String get quickActionSrs => switch (language) {
        AppLanguage.vi => 'Ôn tập',
        AppLanguage.en => 'Review',
        AppLanguage.ja => '復習',
      };

  String get quickActionSrsDetail => switch (language) {
        AppLanguage.vi => 'Giữ nhịp SRS',
        AppLanguage.en => 'SRS Pace',
        AppLanguage.ja => 'SRS間隔反復',
      };

  String get quickActionQuiz => switch (language) {
        AppLanguage.vi => 'Quiz',
        AppLanguage.en => 'Quiz',
        AppLanguage.ja => 'クイズ',
      };

  String get quickActionQuizDetail => switch (language) {
        AppLanguage.vi => 'Luyện phản xạ',
        AppLanguage.en => 'Practice Reflex',
        AppLanguage.ja => '反射神経を鍛える',
      };

  String get quickActionExam => switch (language) {
        AppLanguage.vi => 'Đề kiểm tra',
        AppLanguage.en => 'Exams',
        AppLanguage.ja => 'テスト',
      };

  String get quickActionExamDetail => switch (language) {
        AppLanguage.vi => 'Đo tiến bộ',
        AppLanguage.en => 'Track Progress',
        AppLanguage.ja => '実力測定',
      };

  String get quickActionCommunity => switch (language) {
        AppLanguage.vi => 'Cộng đồng',
        AppLanguage.en => 'Community',
        AppLanguage.ja => 'コミュニティ',
      };

  String get quickActionCommunityDetail => switch (language) {
        AppLanguage.vi => 'Xem xếp hạng',
        AppLanguage.en => 'View Leaderboard',
        AppLanguage.ja => 'ランキングを見る',
      };

  String get weekStudyPace => switch (language) {
        AppLanguage.vi => 'Nhịp học tuần này',
        AppLanguage.en => 'Weekly Study Rhythm',
        AppLanguage.ja => '今週の学習リズム',
      };

  String get totalTimeWeek => switch (language) {
        AppLanguage.vi => 'Tổng thời gian học trên thiết bị tuần này',
        AppLanguage.en => 'Total study time on device this week',
        AppLanguage.ja => '今週のデバイス上での総学習時間',
      };

  String formatHours(String hours) => switch (language) {
        AppLanguage.vi => '$hours giờ',
        AppLanguage.en => '$hours hrs',
        AppLanguage.ja => '$hours 時間',
      };

  String get dayToday => switch (language) {
        AppLanguage.vi => 'Hôm nay',
        AppLanguage.en => 'Today',
        AppLanguage.ja => '今日',
      };

  String get myQuizzesSectionTitle => switch (language) {
        AppLanguage.vi => 'Quiz của bạn',
        AppLanguage.en => 'Your Quizzes',
        AppLanguage.ja => 'あなたのクイズ',
      };

  String get myQuizzesSectionSubtitle => switch (language) {
        AppLanguage.vi => 'Ôn lại bộ đề bạn đã tạo hoặc chơi lại ngay.',
        AppLanguage.en => 'Review your created quizzes or play again now.',
        AppLanguage.ja => '作成したクイズを復習するか、今すぐ再挑戦しましょう。',
      };

  String get openQuizSet => switch (language) {
        AppLanguage.vi => 'Mở bộ quiz',
        AppLanguage.en => 'Open Quizzes',
        AppLanguage.ja => 'クイズ一覧',
      };

  String get noQuizzesYet => switch (language) {
        AppLanguage.vi => 'Bạn chưa tạo quiz nào',
        AppLanguage.en => 'No quizzes created yet',
        AppLanguage.ja => '作成されたクイズはまだありません',
      };

  String get noQuizzesPrompt => switch (language) {
        AppLanguage.vi =>
            'Tự tạo một quiz ngắn để lưu nhóm từ khó nhớ và luyện phản xạ.',
        AppLanguage.en =>
            'Create a short quiz to practice difficult words and reflex.',
        AppLanguage.ja =>
            '短時間のクイズを作成して苦手な単語を定着させましょう。',
      };

  String get createFirstQuiz => switch (language) {
        AppLanguage.vi => 'Tạo quiz đầu tiên',
        AppLanguage.en => 'Create First Quiz',
        AppLanguage.ja => '最初のクイズを作成',
      };

  String get leaderboardSectionTitle => switch (language) {
        AppLanguage.vi => 'Bảng xếp hạng',
        AppLanguage.en => 'Leaderboard',
        AppLanguage.ja => 'ランキング',
      };

  String get leaderboardSectionSubtitle => switch (language) {
        AppLanguage.vi => 'Nhìn nhanh mặt bằng chung của cộng đồng.',
        AppLanguage.en => 'Quick glimpse of community standings.',
        AppLanguage.ja => 'コミュニティのランキングを素早くチェック。',
      };

  String get viewDetails => switch (language) {
        AppLanguage.vi => 'Chi tiết',
        AppLanguage.en => 'Details',
        AppLanguage.ja => '詳細',
      };

  String get noLeaderboardData => switch (language) {
        AppLanguage.vi => 'Chưa có dữ liệu xếp hạng',
        AppLanguage.en => 'No leaderboard data yet',
        AppLanguage.ja => 'ランキングデータはまだありません',
      };

  String get playQuizPrompt => switch (language) {
        AppLanguage.vi => 'Hoàn thành quiz để xuất hiện tại đây.',
        AppLanguage.en => 'Complete quizzes to appear here.',
        AppLanguage.ja => 'クイズを完了してここにランクインしましょう。',
      };

  String formatAccuracy(int percent) => switch (language) {
        AppLanguage.vi => 'Độ chính xác $percent%',
        AppLanguage.en => 'Accuracy $percent%',
        AppLanguage.ja => '正答率 $percent%',
      };

  // ==========================================
  // --- SEARCH PAGE ---
  // ==========================================
  String get searchHeaderTitle => switch (language) {
        AppLanguage.vi => 'Tra cứu',
        AppLanguage.en => 'Search',
        AppLanguage.ja => '検索',
      };

  String get searchHeaderSubtitle => switch (language) {
        AppLanguage.vi => 'Một ô tìm kiếm cho từ vựng, Kanji và ngữ pháp.',
        AppLanguage.en => 'One search box for vocabulary, Kanji, and grammar.',
        AppLanguage.ja => '単語、漢字、文法をまとめて検索。',
      };

  String get searchPlaceholder => switch (language) {
        AppLanguage.vi => 'Nhập từ, Kanji, cách đọc hoặc mẫu ngữ pháp...',
        AppLanguage.en => 'Enter word, Kanji, reading or grammar pattern...',
        AppLanguage.ja => '単語、漢字、読み方、文法パターンを入力...',
      };

  String get categoryAll => switch (language) {
        AppLanguage.vi => 'Tất cả',
        AppLanguage.en => 'All',
        AppLanguage.ja => 'すべて',
      };

  String get categoryVocabulary => switch (language) {
        AppLanguage.vi => 'Từ vựng',
        AppLanguage.en => 'Vocabulary',
        AppLanguage.ja => '単語',
      };

  String get vocabulary => categoryVocabulary;

  String get categoryKanji => switch (language) {
        AppLanguage.vi => 'Kanji',
        AppLanguage.en => 'Kanji',
        AppLanguage.ja => '漢字',
      };

  String get categoryGrammar => switch (language) {
        AppLanguage.vi => 'Ngữ pháp',
        AppLanguage.en => 'Grammar',
        AppLanguage.ja => '文法',
      };

  String get searchingLibrary => switch (language) {
        AppLanguage.vi => 'Đang tìm trong thư viện...',
        AppLanguage.en => 'Searching library...',
        AppLanguage.ja => 'ライブラリを検索中...',
      };

  String get noSearchResults => switch (language) {
        AppLanguage.vi => 'Không tìm thấy kết quả phù hợp',
        AppLanguage.en => 'No matching results found',
        AppLanguage.ja => '該当する結果が見つかりませんでした',
      };

  String get noSearchResultsPrompt => switch (language) {
        AppLanguage.vi => 'Thử tìm với từ khóa khác, Romaji, Kanji hoặc Hiragana.',
        AppLanguage.en => 'Try searching with another keyword, Romaji, Kanji or Hiragana.',
        AppLanguage.ja => '他のキーワード、ローマ字、漢字、ひらがなでお試しください。',
      };

  String get discoverySuggestions => switch (language) {
        AppLanguage.vi => 'Gợi ý khám phá hôm nay',
        AppLanguage.en => "Today's Discovery Suggestions",
        AppLanguage.ja => '今日の発見おすすめ',
      };

  String searchCountFound(int count) => switch (language) {
        AppLanguage.vi => 'Tìm thấy $count kết quả',
        AppLanguage.en => 'Found $count results',
        AppLanguage.ja => '$count 件見つかりました',
      };

  String formatResultsCount(int count) => switch (language) {
        AppLanguage.vi => '$count kết quả',
        AppLanguage.en => '$count results',
        AppLanguage.ja => '$count 件',
      };

  String formatSearchError(Object error) => switch (language) {
        AppLanguage.vi => 'Không thể tìm kiếm: $error',
        AppLanguage.en => 'Search failed: $error',
        AppLanguage.ja => '検索できませんでした: $error',
      };

  String get examplesTitle => switch (language) {
        AppLanguage.vi => 'Ví dụ',
        AppLanguage.en => 'Examples',
        AppLanguage.ja => '例文',
      };

  // ==========================================
  // --- VOCABULARY DETAIL & SEARCH ---
  // ==========================================
  String get vocabDetailTitle => switch (language) {
        AppLanguage.vi => 'Chi tiết từ vựng',
        AppLanguage.en => 'Vocabulary Detail',
        AppLanguage.ja => '単語詳細',
      };

  String get vocabBadge => switch (language) {
        AppLanguage.vi => '語彙 · TỪ VỰNG',
        AppLanguage.en => '語彙 · VOCABULARY',
        AppLanguage.ja => '語彙 · 単語',
      };

  String get bookmarked => switch (language) {
        AppLanguage.vi => 'Đã lưu',
        AppLanguage.en => 'Saved',
        AppLanguage.ja => '保存済み',
      };

  String get notBookmarked => switch (language) {
        AppLanguage.vi => 'Chưa lưu',
        AppLanguage.en => 'Save',
        AppLanguage.ja => '保存',
      };

  String get pronounceAction => switch (language) {
        AppLanguage.vi => 'Phát âm',
        AppLanguage.en => 'Pronounce',
        AppLanguage.ja => '音声再生',
      };

  String get meaningTitle => switch (language) {
        AppLanguage.vi => 'Nghĩa',
        AppLanguage.en => 'Meaning',
        AppLanguage.ja => '意味',
      };

  String get meaningSubtitle => switch (language) {
        AppLanguage.vi => 'Ý nghĩa cốt lõi để nhận ra từ trong ngữ cảnh.',
        AppLanguage.en => 'Core meaning to understand the word in context.',
        AppLanguage.ja => '文脈で単語を理解するための主要な意味。',
      };

  String get kanjiBreakdownTitle => switch (language) {
        AppLanguage.vi => 'Kanji cấu thành từ này',
        AppLanguage.en => 'Kanji components in this word',
        AppLanguage.ja => 'この単語を構成する漢字',
      };

  String get kanjiBreakdownSubtitle => switch (language) {
        AppLanguage.vi => 'Bấm vào từng chữ để xem nét, nghĩa và các từ liên quan.',
        AppLanguage.en => 'Tap each character to see strokes, meanings, and related words.',
        AppLanguage.ja => '各漢字をタップして筆順、意味、関連単語を確認。',
      };

  String get examplesSectionTitle => switch (language) {
        AppLanguage.vi => 'Câu ví dụ',
        AppLanguage.en => 'Example Sentences',
        AppLanguage.ja => '例文',
      };

  String get examplesSectionSubtitle => switch (language) {
        AppLanguage.vi => 'Cách dùng từ trong câu thực tế.',
        AppLanguage.en => 'How this word is used in real sentences.',
        AppLanguage.ja => '実際の文章での使い方。',
      };

  String get noExamplesFound => switch (language) {
        AppLanguage.vi => 'Chưa có câu ví dụ cho từ này.',
        AppLanguage.en => 'No example sentences for this word yet.',
        AppLanguage.ja => 'この単語の例文はまだありません。',
      };

  String get bookmarkAdded => switch (language) {
        AppLanguage.vi => 'Đã lưu vào danh sách yêu thích.',
        AppLanguage.en => 'Saved to favorites.',
        AppLanguage.ja => 'お気に入りに追加しました。',
      };

  String get bookmarkRemoved => switch (language) {
        AppLanguage.vi => 'Đã bỏ lưu khỏi danh sách yêu thích.',
        AppLanguage.en => 'Removed from favorites.',
        AppLanguage.ja => 'お気に入りから削除しました。',
      };

  String get vocabHeroSubtitle => switch (language) {
        AppLanguage.vi => 'Đọc, nghe và kết nối các thành phần Kanji của từ.',
        AppLanguage.en => 'Read, listen, and connect the kanji components of the word.',
        AppLanguage.ja => '単語の読み、音声、漢字の構成を確認。',
      };

  String formatReading(String reading) => switch (language) {
        AppLanguage.vi => 'Cách đọc: $reading',
        AppLanguage.en => 'Reading: $reading',
        AppLanguage.ja => '読み方: $reading',
      };

  String get memorizeVocabTitle => switch (language) {
        AppLanguage.vi => 'Ghi nhớ từ này',
        AppLanguage.en => 'Memorize this word',
        AppLanguage.ja => 'この単語を覚える',
      };

  String get memorizeVocabSubtitle => switch (language) {
        AppLanguage.vi => 'Nghe lại phát âm hoặc lưu vào mục yêu thích.',
        AppLanguage.en => 'Listen to pronunciation or save to favorites.',
        AppLanguage.ja => '発音を聴くか、お気に入りに保存しましょう。',
      };

  String get unbookmarkAction => switch (language) {
        AppLanguage.vi => 'Bỏ lưu',
        AppLanguage.en => 'Unsave',
        AppLanguage.ja => '保存解除',
      };

  String get bookmarkAction => switch (language) {
        AppLanguage.vi => 'Lưu yêu thích',
        AppLanguage.en => 'Save favorite',
        AppLanguage.ja => 'お気に入り保存',
      };

  String get listenAgainAction => switch (language) {
        AppLanguage.vi => 'Nghe lại',
        AppLanguage.en => 'Listen again',
        AppLanguage.ja => 'もう一度聴く',
      };

  // ==========================================
  // --- KANJI SEARCH & DETAIL ---
  // ==========================================
  String get kanjiHeaderTitle => switch (language) {
        AppLanguage.vi => 'Kanji',
        AppLanguage.en => 'Kanji',
        AppLanguage.ja => '漢字',
      };

  String get kanjiSearchHeroTitle => switch (language) {
        AppLanguage.vi => 'Xem nét, nghĩa và bộ thủ trong cùng một nhịp đọc.',
        AppLanguage.en => 'View strokes, meanings, and radicals at a glance.',
        AppLanguage.ja => '筆順、意味、部首をひと目で確認。',
      };

  String get kanjiSearchHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Tập trung vào một ký tự tại một thời điểm để hiểu cách nó được tạo thành và được dùng ra sao.',
        AppLanguage.en =>
            'Focus on one character at a time to understand its structure and usage.',
        AppLanguage.ja =>
            '1文字ずつ集中して構成や使い方を深く理解しましょう。',
      };

  String get kanjiDetailTitle => switch (language) {
        AppLanguage.vi => 'Chi tiết Kanji',
        AppLanguage.en => 'Kanji Detail',
        AppLanguage.ja => '漢字詳細',
      };

  String get strokeCountLabel => switch (language) {
        AppLanguage.vi => 'Số nét',
        AppLanguage.en => 'Strokes',
        AppLanguage.ja => '画数',
      };

  String formatStrokes(int count) => switch (language) {
        AppLanguage.vi => '$count nét',
        AppLanguage.en => '$count strokes',
        AppLanguage.ja => '$count 画',
      };

  String get radicalSectionTitle => switch (language) {
        AppLanguage.vi => 'Bộ thủ',
        AppLanguage.en => 'Radical',
        AppLanguage.ja => '部首',
      };

  String get radicalSectionSubtitle => switch (language) {
        AppLanguage.vi => 'Thành phần gốc tạo nên ý nghĩa chữ Hán.',
        AppLanguage.en => 'Root radical providing the character meaning.',
        AppLanguage.ja => '漢字の意味を形成する基本要素。',
      };

  String get onyomiLabel => switch (language) {
        AppLanguage.vi => 'Âm On (Âm Hán)',
        AppLanguage.en => "On'yomi (Chinese reading)",
        AppLanguage.ja => '音読み',
      };

  String get kunyomiLabel => switch (language) {
        AppLanguage.vi => 'Âm Kun (Âm thuần Nhật)',
        AppLanguage.en => "Kun'yomi (Japanese reading)",
        AppLanguage.ja => '訓読み',
      };

  String get hanVietLabel => switch (language) {
        AppLanguage.vi => 'Hán Việt',
        AppLanguage.en => 'Sino-Vietnamese',
        AppLanguage.ja => '漢越音 / 名のり',
      };

  String get wordsWithKanjiTitle => switch (language) {
        AppLanguage.vi => 'Từ vựng chứa chữ này',
        AppLanguage.en => 'Vocabulary with this character',
        AppLanguage.ja => 'この漢字を含む単語',
      };

  String get wordsWithKanjiSubtitle => switch (language) {
        AppLanguage.vi => 'Xem cách chữ Hán này kết hợp tạo từ mới.',
        AppLanguage.en => 'See how this Kanji combines into new words.',
        AppLanguage.ja => 'この漢字がどのように組み合わさるか確認。',
      };

  String get mnemonicTitle => switch (language) {
        AppLanguage.vi => 'Mẹo nhớ chữ',
        AppLanguage.en => 'Mnemonic & Memory Tip',
        AppLanguage.ja => '覚え方のヒント',
      };

  String get strokePracticeTitle => switch (language) {
        AppLanguage.vi => 'Tập viết nét chữ',
        AppLanguage.en => 'Stroke Order Practice',
        AppLanguage.ja => '書き順の練習',
      };

  String get replayStrokeOrder => switch (language) {
        AppLanguage.vi => 'Xem lại thứ tự nét',
        AppLanguage.en => 'Replay Stroke Order',
        AppLanguage.ja => '書き順を再生',
      };

  String get kanjiSearchPlaceholder => switch (language) {
        AppLanguage.vi => 'Tìm theo chữ, âm Hán Việt hoặc nghĩa...',
        AppLanguage.en => 'Search by character, Sino-Vietnamese, or meaning...',
        AppLanguage.ja => '漢字、読み、または意味で検索...',
      };

  String get kanjiSearching => switch (language) {
        AppLanguage.vi => 'Đang tìm Kanji...',
        AppLanguage.en => 'Searching Kanji...',
        AppLanguage.ja => '漢字を検索中...',
      };

  String get kanjiLoading => switch (language) {
        AppLanguage.vi => 'Đang tải Kanji...',
        AppLanguage.en => 'Loading Kanji...',
        AppLanguage.ja => '漢字を読み込み中...',
      };

  String get kanjiInitialEmptyTitle => switch (language) {
        AppLanguage.vi => 'Tìm một kanji để bắt đầu',
        AppLanguage.en => 'Find a Kanji to start',
        AppLanguage.ja => '漢字を検索して始めましょう',
      };

  String get kanjiInitialEmptyMessage => switch (language) {
        AppLanguage.vi =>
            'Bạn có thể tra theo chữ, nghĩa hoặc âm Hán Việt để mở chi tiết ngay.',
        AppLanguage.en =>
            'You can search by character, meaning, or reading to open details.',
        AppLanguage.ja =>
            '漢字、意味、読み方から検索して詳細を確認できます。',
      };

  String get kanjiNotFoundTitle => switch (language) {
        AppLanguage.vi => 'Không tìm thấy Kanji',
        AppLanguage.en => 'No Kanji found',
        AppLanguage.ja => '漢字が見つかりませんでした',
      };

  String get kanjiNotFoundMessage => switch (language) {
        AppLanguage.vi =>
            'Thử lại bằng chữ kanji, nghĩa, âm Hán Việt hoặc cách đọc.',
        AppLanguage.en =>
            'Try again with kanji character, meaning, or reading.',
        AppLanguage.ja =>
            '漢字、意味、読み方を変えてもう一度お試しください。',
      };

  String get kanjiSearchResultsTitle => switch (language) {
        AppLanguage.vi => 'Kết quả tra cứu',
        AppLanguage.en => 'Search Results',
        AppLanguage.ja => '検索結果',
      };

  String get kanjiSearchResultsSubtitle => switch (language) {
        AppLanguage.vi =>
            'Chạm vào một mục để thay đổi bảng chi tiết bên trên.',
        AppLanguage.en =>
            'Tap an item to update the detail panel above.',
        AppLanguage.ja =>
            '項目をタップして上の詳細パネルを切り替えます。',
      };

  String get kanjiNoSelectionTitle => switch (language) {
        AppLanguage.vi => 'Chưa có ký tự nào được chọn',
        AppLanguage.en => 'No character selected yet',
        AppLanguage.ja => '文字が選択されていません',
      };

  String get kanjiNoSelectionMessage => switch (language) {
        AppLanguage.vi =>
            'Chạm vào một kết quả để mở bảng chi tiết và theo dõi nét viết.',
        AppLanguage.en =>
            'Tap a result to open the detail panel and view stroke animation.',
        AppLanguage.ja =>
            '検索結果をタップして詳細と筆順アニメーションを表示します。',
      };

  String get kanjiDetailMeaning => switch (language) {
        AppLanguage.vi => 'Nghĩa',
        AppLanguage.en => 'Meaning',
        AppLanguage.ja => '意味',
      };

  String get kanjiDetailOnyomi => switch (language) {
        AppLanguage.vi => 'Âm On',
        AppLanguage.en => "On'yomi",
        AppLanguage.ja => '音読み',
      };

  String get kanjiDetailKunyomi => switch (language) {
        AppLanguage.vi => 'Âm Kun',
        AppLanguage.en => "Kun'yomi",
        AppLanguage.ja => '訓読み',
      };

  String get kanjiDetailStrokes => switch (language) {
        AppLanguage.vi => 'Số nét',
        AppLanguage.en => 'Strokes',
        AppLanguage.ja => '画数',
      };

  String get kanjiDetailMnemonic => switch (language) {
        AppLanguage.vi => 'Ghi nhớ',
        AppLanguage.en => 'Mnemonic',
        AppLanguage.ja => '覚え方',
      };

  String get kanjiDetailHanViet => switch (language) {
        AppLanguage.vi => 'Hán Việt',
        AppLanguage.en => 'Sino-Vietnamese',
        AppLanguage.ja => '漢越音',
      };

  String get kanjiOpenDetailAction => switch (language) {
        AppLanguage.vi => 'Mở màn chi tiết',
        AppLanguage.en => 'Open details',
        AppLanguage.ja => '詳細を開く',
      };

  String get kanjiRadicalLabel => switch (language) {
        AppLanguage.vi => 'Bộ thủ',
        AppLanguage.en => 'Radical',
        AppLanguage.ja => '部首',
      };

  String formatKanjiSearchError(Object error) => switch (language) {
        AppLanguage.vi => 'Lỗi tìm kanji: $error',
        AppLanguage.en => 'Error searching kanji: $error',
        AppLanguage.ja => '漢字の検索エラー: $error',
      };

  String formatStrokesDetail(int count) => switch (language) {
        AppLanguage.vi => 'Số nét: $count',
        AppLanguage.en => 'Strokes: $count',
        AppLanguage.ja => '画数: $count',
      };

  String formatRadicalDetail(String char, String name) => switch (language) {
        AppLanguage.vi => 'Bộ thủ: $char · $name',
        AppLanguage.en => 'Radical: $char · $name',
        AppLanguage.ja => '部首: $char · $name',
      };

  String get openReviewSession => switch (language) {
        AppLanguage.vi => 'Mở phiên ôn tập',
        AppLanguage.en => 'Open review session',
        AppLanguage.ja => '復習セッションを開く',
      };

  String get loadExamplesError => switch (language) {
        AppLanguage.vi => 'Chưa thể tải từ vựng ví dụ.',
        AppLanguage.en => 'Could not load example vocabulary yet.',
        AppLanguage.ja => '例文単語を読み込めませんでした。',
      };

  String formatNoExamplesForKanji(String char) => switch (language) {
        AppLanguage.vi => 'Chưa tìm thấy từ ví dụ cho kanji $char.',
        AppLanguage.en => 'No example words found for kanji $char.',
        AppLanguage.ja => '漢字「$char」の例文単語が見つかりませんでした。',
      };

  // ==========================================
  // --- GRAMMAR PAGE ---
  // ==========================================
  String get grammarHeaderTitle => switch (language) {
        AppLanguage.vi => 'Học ngữ pháp',
        AppLanguage.en => 'Japanese Grammar',
        AppLanguage.ja => '文法学習',
      };

  String get grammarSearchHint => switch (language) {
        AppLanguage.vi => 'Tìm mẫu ngữ pháp hoặc nghĩa...',
        AppLanguage.en => 'Search grammar patterns or meanings...',
        AppLanguage.ja => '文法パターンや意味を検索...',
      };

  String get grammarStructureTitle => switch (language) {
        AppLanguage.vi => 'Cấu trúc',
        AppLanguage.en => 'Structure',
        AppLanguage.ja => '接続・構成',
      };

  String get grammarExplanationTitle => switch (language) {
        AppLanguage.vi => 'Giải thích ý nghĩa',
        AppLanguage.en => 'Explanation',
        AppLanguage.ja => '解説・意味',
      };

  String get grammarExamplesTitle => switch (language) {
        AppLanguage.vi => 'Ví dụ áp dụng',
        AppLanguage.en => 'Examples',
        AppLanguage.ja => '例文',
      };

  String get noGrammarFound => switch (language) {
        AppLanguage.vi => 'Không tìm thấy ngữ pháp phù hợp.',
        AppLanguage.en => 'No grammar patterns found.',
        AppLanguage.ja => '該当する文法が見つかりませんでした。',
      };

  String get grammarLoading => switch (language) {
        AppLanguage.vi => 'Đang tải ngữ pháp...',
        AppLanguage.en => 'Loading grammar...',
        AppLanguage.ja => '文法を読み込み中...',
      };

  String get grammarLoadErrorTitle => switch (language) {
        AppLanguage.vi => 'Không thể tải ngữ pháp',
        AppLanguage.en => 'Could not load grammar',
        AppLanguage.ja => '文法を読み込めませんでした',
      };

  String get grammarLoadErrorMessage => switch (language) {
        AppLanguage.vi => 'Kiểm tra kết nối rồi thử lại.',
        AppLanguage.en => 'Check your connection and try again.',
        AppLanguage.ja => '通信状態を確認して再試行してください。',
      };

  String get grammarNotFoundTitle => switch (language) {
        AppLanguage.vi => 'Chưa tìm thấy ngữ pháp',
        AppLanguage.en => 'No grammar found',
        AppLanguage.ja => '文法が見つかりませんでした',
      };

  String get grammarNotFoundMessage => switch (language) {
        AppLanguage.vi => 'Hãy thử mẫu khác hoặc đổi cấp độ JLPT.',
        AppLanguage.en => 'Try another pattern or change the JLPT level.',
        AppLanguage.ja => '別のパターンを試すか、JLPTレベルを変更してください。',
      };

  // ==========================================
  // --- TOPICS & LESSONS ---
  // ==========================================
  String get topicsHeaderTag => switch (language) {
        AppLanguage.vi => 'HỌC TẬP',
        AppLanguage.en => 'LEARNING',
        AppLanguage.ja => '学習コース',
      };

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

  String formatLessonsCount(int count) => switch (language) {
        AppLanguage.vi => '$count bài học',
        AppLanguage.en => '$count lessons',
        AppLanguage.ja => '$count レッスン',
      };

  String formatMinutes(int minutes) => switch (language) {
        AppLanguage.vi => '$minutes phút',
        AppLanguage.en => '$minutes mins',
        AppLanguage.ja => '$minutes 分',
      };

  String formatItemsCount(int count) => switch (language) {
        AppLanguage.vi => '$count mục',
        AppLanguage.en => '$count items',
        AppLanguage.ja => '$count 項目',
      };

  String formatTopicStats(int lessonCount, int totalMinutes) => switch (language) {
        AppLanguage.vi => '$lessonCount bài học · $totalMinutes phút',
        AppLanguage.en => '$lessonCount lessons · $totalMinutes mins',
        AppLanguage.ja => '$lessonCount レッスン · $totalMinutes 分',
      };

  String formatLessonMetric(int estimatedMinutes, int itemCount) => switch (language) {
        AppLanguage.vi => '$estimatedMinutes PHÚT · $itemCount MỤC',
        AppLanguage.en => '$estimatedMinutes MINS · $itemCount ITEMS',
        AppLanguage.ja => '$estimatedMinutes 分 · $itemCount 項目',
      };

  String get noTopicsPublished => switch (language) {
        AppLanguage.vi => 'Chưa có chủ đề được xuất bản.',
        AppLanguage.en => 'No topics published yet.',
        AppLanguage.ja => '公開されたトピックはまだありません。',
      };

  String get topicStudyHeader => switch (language) {
        AppLanguage.vi => 'CHỦ ĐỀ HỌC',
        AppLanguage.en => 'STUDY TOPIC',
        AppLanguage.ja => '学習トピック',
      };

  String formatTopicLessonCountHint(int count) => switch (language) {
        AppLanguage.vi => '$count bài học · học lần lượt để giữ đúng mạch kiến thức.',
        AppLanguage.en => '$count lessons · learn step by step to stay on track.',
        AppLanguage.ja => '$count レッスン · 順を追って学習を進めましょう。',
      };

  String get startLesson => switch (language) {
        AppLanguage.vi => 'Bắt đầu học',
        AppLanguage.en => 'Start Lesson',
        AppLanguage.ja => '学習を開始',
      };

  String get resumeLesson => switch (language) {
        AppLanguage.vi => 'Học tiếp',
        AppLanguage.en => 'Continue',
        AppLanguage.ja => '続ける',
      };

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

  // ==========================================
  // --- SRS REVIEW PAGE ---
  // ==========================================
  String get srsReviewTitle => switch (language) {
        AppLanguage.vi => 'Ôn tập SRS',
        AppLanguage.en => 'SRS Review',
        AppLanguage.ja => 'SRS復習',
      };

  String get srsHeroTitle => switch (language) {
        AppLanguage.vi => 'Lặp lại ngắt quãng để khắc sâu vào trí nhớ dài hạn.',
        AppLanguage.en => 'Spaced repetition for long-term retention.',
        AppLanguage.ja => '間隔反復で長期記憶にしっかり定着させます。',
      };

  String get srsHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Thuật toán Leitner sẽ tự động phân phối các thẻ đến hạn đúng thời điểm bạn sắp quên.',
        AppLanguage.en =>
            'The Leitner algorithm presents due cards right before you forget them.',
        AppLanguage.ja =>
            'ライトナー方式により、忘れかけた絶妙なタイミングで復習カードが出題されます。',
      };

  String srsCardsDueCount(int count) => switch (language) {
        AppLanguage.vi => '$count thẻ đến hạn',
        AppLanguage.en => '$count cards due',
        AppLanguage.ja => '$count 枚の復習予定',
      };

  String srsCardsNewCount(int count) => switch (language) {
        AppLanguage.vi => '$count thẻ mới',
        AppLanguage.en => '$count new cards',
        AppLanguage.ja => '$count 枚の新規カード',
      };

  String get startReviewSession => switch (language) {
        AppLanguage.vi => 'Bắt đầu phiên ôn tập',
        AppLanguage.en => 'Start Review Session',
        AppLanguage.ja => '復習セッションを開始',
      };

  String get showAnswer => switch (language) {
        AppLanguage.vi => 'Xem đáp án',
        AppLanguage.en => 'Show Answer',
        AppLanguage.ja => '答えを見る',
      };

  String get srsAgain => switch (language) {
        AppLanguage.vi => 'Chưa nhớ',
        AppLanguage.en => 'Again',
        AppLanguage.ja => 'もう一度',
      };

  String get srsHard => switch (language) {
        AppLanguage.vi => 'Khó',
        AppLanguage.en => 'Hard',
        AppLanguage.ja => '難しい',
      };

  String get srsGood => switch (language) {
        AppLanguage.vi => 'Nhớ',
        AppLanguage.en => 'Good',
        AppLanguage.ja => '普通',
      };

  String get srsEasy => switch (language) {
        AppLanguage.vi => 'Dễ',
        AppLanguage.en => 'Easy',
        AppLanguage.ja => '簡単',
      };

  String get srsCompletedTitle => switch (language) {
        AppLanguage.vi => 'Hoàn thành phiên ôn tập!',
        AppLanguage.en => 'Review Session Complete!',
        AppLanguage.ja => '復習セッション完了！',
      };

  String get srsCompletedSubtitle => switch (language) {
        AppLanguage.vi => 'Các thẻ đã được cập nhật khoảng thời gian ghi nhớ mới.',
        AppLanguage.en => 'Cards updated with new spaced review intervals.',
        AppLanguage.ja => '各カードの次回復習間隔が更新されました。',
      };

  String get srsBoxDistribution => switch (language) {
        AppLanguage.vi => 'Phân bố 5 hộp Leitner',
        AppLanguage.en => '5-Box Leitner Distribution',
        AppLanguage.ja => 'ライトナー5ボックスの分布',
      };

  String get srsPageAppBarTitle => switch (language) {
        AppLanguage.vi => 'Ôn tập',
        AppLanguage.en => 'Review',
        AppLanguage.ja => '復習',
      };

  String get loadingSrsData => switch (language) {
        AppLanguage.vi => 'Đang tải dữ liệu ôn tập...',
        AppLanguage.en => 'Loading review data...',
        AppLanguage.ja => '復習データを読み込み中...',
      };

  String get srsGeneral => switch (language) {
        AppLanguage.vi => 'SRS chung',
        AppLanguage.en => 'General SRS',
        AppLanguage.ja => '総合SRS',
      };

  String formatSrsHeaderCards(int total, int learned) => switch (language) {
        AppLanguage.vi => '$total thẻ tổng • $learned đã học',
        AppLanguage.en => '$total total cards • $learned learned',
        AppLanguage.ja => '全 $total 枚 • $learned 学習済',
      };

  String get srsDue => switch (language) {
        AppLanguage.vi => 'Đến hạn',
        AppLanguage.en => 'Due',
        AppLanguage.ja => '復習期日',
      };

  String get srsMastered => switch (language) {
        AppLanguage.vi => 'Master',
        AppLanguage.en => 'Mastered',
        AppLanguage.ja => 'マスター',
      };

  String get startReview => switch (language) {
        AppLanguage.vi => 'Bắt đầu ôn tập',
        AppLanguage.en => 'Start Review',
        AppLanguage.ja => '復習を始める',
      };

  String formatNextDueAfter(String text) => switch (language) {
        AppLanguage.vi => 'Lượt tiếp theo sau: $text',
        AppLanguage.en => 'Next review in: $text',
        AppLanguage.ja => '次の復習まで: $text',
      };

  String get srsEmptyTitle => switch (language) {
        AppLanguage.vi => 'Chọn bài học để ôn',
        AppLanguage.en => 'Select a lesson to review',
        AppLanguage.ja => '復習するレッスンを選択',
      };

  String get srsEmptyMessage => switch (language) {
        AppLanguage.vi =>
            'Mở một bài học trong Lộ trình, rồi chọn Ôn bài này để bắt đầu.',
        AppLanguage.en =>
            'Open a lesson in Topics, then select Review this lesson to begin.',
        AppLanguage.ja =>
            'コースからレッスンを開き、「復習する」を選択して開始してください。',
      };

  String get hideLevelDetails => switch (language) {
        AppLanguage.vi => 'Ẩn chi tiết từng cấp',
        AppLanguage.en => 'Hide level details',
        AppLanguage.ja => '詳細レベルを非表示',
      };

  String get showLevelDetails => switch (language) {
        AppLanguage.vi => 'Xem chi tiết từng cấp',
        AppLanguage.en => 'Show level details',
        AppLanguage.ja => '詳細レベルを表示',
      };

  String get backToDashboard => switch (language) {
        AppLanguage.vi => 'Về dashboard',
        AppLanguage.en => 'Back to dashboard',
        AppLanguage.ja => 'ダッシュボードへ',
      };

  String get dragToMove => switch (language) {
        AppLanguage.vi => 'Kéo để di chuyển',
        AppLanguage.en => 'Drag to move',
        AppLanguage.ja => 'ドラッグして移動',
      };

  String get correct => switch (language) {
        AppLanguage.vi => 'Chính xác!',
        AppLanguage.en => 'Correct!',
        AppLanguage.ja => '正解！',
      };

  String get incorrect => switch (language) {
        AppLanguage.vi => 'Chưa chính xác',
        AppLanguage.en => 'Incorrect',
        AppLanguage.ja => '不正解',
      };

  String get sampleStrokeToReview => switch (language) {
        AppLanguage.vi => 'MẪU NÉT CẦN XEM LẠI',
        AppLanguage.en => 'STROKE PATTERN TO REVIEW',
        AppLanguage.ja => '確認が必要な書き順',
      };

  String get okNextQuestion => switch (language) {
        AppLanguage.vi => 'OK · Câu tiếp theo',
        AppLanguage.en => 'OK · Next question',
        AppLanguage.ja => 'OK · 次の問題',
      };

  String get howManyNewWordsToday => switch (language) {
        AppLanguage.vi => 'Hôm nay bạn muốn học bao nhiêu từ mới?',
        AppLanguage.en => 'How many new words do you want to learn today?',
        AppLanguage.ja => '今日は新しい単語をいくつ学習しますか？',
      };

  String get srsDueCardNote => switch (language) {
        AppLanguage.vi =>
            'Thẻ đến hạn luôn được ôn riêng và không trừ vào số từ mới.',
        AppLanguage.en =>
            'Due cards are reviewed separately and not deducted from new words.',
        AppLanguage.ja =>
            '復習期日のカードは新出単語とは別に復習されます。',
      };

  String get allNewWords => switch (language) {
        AppLanguage.vi => 'Tất cả từ mới',
        AppLanguage.en => 'All new words',
        AppLanguage.ja => 'すべての新出単語',
      };

  String formatNewWordsCount(int count) => switch (language) {
        AppLanguage.vi => '$count từ mới',
        AppLanguage.en => '$count new words',
        AppLanguage.ja => '$count 個の新出単語',
      };

  String formatLearnedTodayGoal(int today, int goal) => switch (language) {
        AppLanguage.vi => 'Bạn đã học $today/$goal từ mới hôm nay',
        AppLanguage.en => 'You learned $today/$goal new words today',
        AppLanguage.ja => '今日は $goal 個中 $today 個学習しました',
      };

  String formatRemainingGoal(int remaining) => switch (language) {
        AppLanguage.vi =>
            'Còn $remaining từ để hoàn thành mục tiêu. Bạn có thể học tiếp hoặc chỉ ôn thẻ đến hạn.',
        AppLanguage.en =>
            '$remaining words left to reach goal. Keep learning or only review due cards.',
        AppLanguage.ja =>
            '目標まであと $remaining 単語。学習を続けるか復習のみ行えます。',
      };

  String get goalCompletedPrompt => switch (language) {
        AppLanguage.vi =>
            'Mục tiêu đã hoàn thành. Chỉ ôn tập để giữ đúng nhịp, hoặc chủ động học thêm.',
        AppLanguage.en =>
            'Goal reached! Keep your momentum with reviews, or learn more.',
        AppLanguage.ja =>
            '目標達成！復習で定着させるか、追加で学習しましょう。',
      };

  String continueLearningGoal(int count) => switch (language) {
        AppLanguage.vi => 'Học tiếp $count từ',
        AppLanguage.en => 'Continue learning $count words',
        AppLanguage.ja => 'あと $count 単語学習する',
      };

  String get reviewOnly => switch (language) {
        AppLanguage.vi => 'Chỉ ôn tập',
        AppLanguage.en => 'Review Only',
        AppLanguage.ja => '復習のみ行う',
      };

  String learnMoreCount(int count) => switch (language) {
        AppLanguage.vi => 'Học thêm $count',
        AppLanguage.en => 'Learn $count more',
        AppLanguage.ja => 'さらに $count 個学習',
      };

  String formatDuePrompt(int count) => switch (language) {
        AppLanguage.vi =>
            'Bạn có $count từ cần ôn tập trước khi bắt đầu học từ mới. Ôn tập ngay nha?',
        AppLanguage.en =>
            'You have $count cards to review before starting new words. Review now?',
        AppLanguage.ja =>
            '新出単語の前に復習が必要なカードが $count 枚あります。今すぐ復習しますか？',
      };

  String formatCardsNewRemaining(int count) => switch (language) {
        AppLanguage.vi => 'Còn $count thẻ mới',
        AppLanguage.en => '$count new cards left',
        AppLanguage.ja => '残り $count 枚の新出カード',
      };

  String get reviewAgain => switch (language) {
        AppLanguage.vi => 'Xem lại',
        AppLanguage.en => 'Review Again',
        AppLanguage.ja => 'もう一度',
      };

  String get alreadyRemembered => switch (language) {
        AppLanguage.vi => 'Đã nhớ',
        AppLanguage.en => 'Remembered',
        AppLanguage.ja => '覚えた',
      };

  String get tapToFlipCard => switch (language) {
        AppLanguage.vi => 'Chạm để xem mặt sau',
        AppLanguage.en => 'Tap to flip card',
        AppLanguage.ja => 'タップして裏面を表示',
      };

  String formatExamplesWithCharacter(String char) => switch (language) {
        AppLanguage.vi => 'Ví dụ có $char',
        AppLanguage.en => 'Examples with $char',
        AppLanguage.ja => '$char を含む例文・語彙',
      };

  String get noMatchingVocabInSystem => switch (language) {
        AppLanguage.vi => 'Chưa có từ vựng phù hợp trong hệ thống.',
        AppLanguage.en => 'No matching vocabulary in the system.',
        AppLanguage.ja => '該当する単語が登録されていません。',
      };

  String get confirmAnswer => switch (language) {
        AppLanguage.vi => 'Xác nhận đáp án',
        AppLanguage.en => 'Confirm Answer',
        AppLanguage.ja => '回答を確認',
      };

  String get srsSummaryHeroTitle => switch (language) {
        AppLanguage.vi => 'Bạn vừa khóa thêm một nhịp nhỏ.',
        AppLanguage.en => 'You completed another study rhythm!',
        AppLanguage.ja => '復習セッションが完了しました！',
      };

  String get srsSummaryHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Đã đi qua flashcard và quiz 7 mode. Bạn có thể ôn tiếp hoặc quay lại dashboard để đổi bài học.',
        AppLanguage.en =>
            'Finished flashcards and quizzes. You can review more or return to dashboard.',
        AppLanguage.ja =>
            'フラッシュカードとクイズを完了しました。続けて復習するか、戻ることができます。',
      };

  String get keepReviewing => switch (language) {
        AppLanguage.vi => 'Ôn tiếp',
        AppLanguage.en => 'Keep Reviewing',
        AppLanguage.ja => '復習を続ける',
      };

  String get reviewFinishedStartNew => switch (language) {
        AppLanguage.vi => 'Ôn tập xong. Bắt đầu học từ mới!',
        AppLanguage.en => 'Review finished. Starting new words!',
        AppLanguage.ja => '復習完了。新しい単語を学習します！',
      };

  String feedbackCorrect(String answer) => switch (language) {
        AppLanguage.vi => 'Chính xác. Đáp án: "$answer".',
        AppLanguage.en => 'Correct. Answer: "$answer".',
        AppLanguage.ja => '正解です。正解: "$answer"',
      };

  String get feedbackDrawingIncorrect => switch (language) {
        AppLanguage.vi =>
            'Nét viết chưa khớp. Thẻ này sẽ quay lại cuối hàng để luyện lại.',
        AppLanguage.en =>
            'Stroke pattern did not match. This card will be re-queued.',
        AppLanguage.ja =>
            '書き順が一致しませんでした。後ほどもう一度出題されます。',
      };

  String feedbackIncorrect(String answer) => switch (language) {
        AppLanguage.vi => 'Chưa đúng. Đáp án đúng là "$answer".',
        AppLanguage.en => 'Incorrect. The correct answer is "$answer".',
        AppLanguage.ja => '不正解。正解は "$answer" です。',
      };

  String get dueNow => switch (language) {
        AppLanguage.vi => 'Đến hạn rồi',
        AppLanguage.en => 'Due now',
        AppLanguage.ja => '期日到来',
      };

  String get srsModeMeanFromWord => switch (language) {
        AppLanguage.vi => 'Nghĩa của từ',
        AppLanguage.en => 'Word Meaning',
        AppLanguage.ja => '単語の意味',
      };

  String get srsModeWordFromMean => switch (language) {
        AppLanguage.vi => 'Từ từ nghĩa',
        AppLanguage.en => 'Word from Meaning',
        AppLanguage.ja => '意味から単語',
      };

  String get srsModeFillBlank => switch (language) {
        AppLanguage.vi => 'Điền từ',
        AppLanguage.en => 'Fill in Blank',
        AppLanguage.ja => '穴埋め',
      };

  String get srsModeOnRead => switch (language) {
        AppLanguage.vi => 'Âm On',
        AppLanguage.en => 'Onyomi',
        AppLanguage.ja => '音読み',
      };

  String get srsModeKunRead => switch (language) {
        AppLanguage.vi => 'Âm Kun',
        AppLanguage.en => 'Kunyomi',
        AppLanguage.ja => '訓読み',
      };

  String get srsModeHanViet => switch (language) {
        AppLanguage.vi => 'Âm Hán Việt',
        AppLanguage.en => 'Sino-Vietnamese',
        AppLanguage.ja => '漢越音',
      };

  String get srsModeComposeKanji => switch (language) {
        AppLanguage.vi => 'Nhận dạng Kanji',
        AppLanguage.en => 'Identify Kanji',
        AppLanguage.ja => '漢字識別',
      };

  String get srsModeKanjiInContext => switch (language) {
        AppLanguage.vi => 'Điền Kanji vào từ',
        AppLanguage.en => 'Kanji in Context',
        AppLanguage.ja => '文脈で漢字',
      };

  String get srsModeWordFromHiragana => switch (language) {
        AppLanguage.vi => 'Hiragana sang Kanji',
        AppLanguage.en => 'Hiragana to Kanji',
        AppLanguage.ja => 'ひらがなから漢字',
      };

  String get srsModeDrawKanji => switch (language) {
        AppLanguage.vi => 'Viết Kanji',
        AppLanguage.en => 'Draw Kanji',
        AppLanguage.ja => '漢字を書く',
      };

  String formatLevelCardsCount(String label, int count) => switch (language) {
        AppLanguage.vi => '$label: $count thẻ',
        AppLanguage.en => '$label: $count cards',
        AppLanguage.ja => '$label: $count 枚',
      };

  String formatLevelDetailKanjiVocab(String label, int kanji, int vocab) => switch (language) {
        AppLanguage.vi => '$label: $kanji Kanji · $vocab từ',
        AppLanguage.en => '$label: $kanji Kanji · $vocab words',
        AppLanguage.ja => '$label: $kanji 漢字 · $vocab 単語',
      };

  String get flashcardLabel => switch (language) {
        AppLanguage.vi => 'Flashcard',
        AppLanguage.en => 'Flashcard',
        AppLanguage.ja => '単語カード',
      };

  String get answeredLabel => switch (language) {
        AppLanguage.vi => 'Trả lời',
        AppLanguage.en => 'Answered',
        AppLanguage.ja => '回答数',
      };

  String get incorrectCountLabel => switch (language) {
        AppLanguage.vi => 'Sai',
        AppLanguage.en => 'Mistakes',
        AppLanguage.ja => '誤答数',
      };

  String get promptChooseWordForMeaning => switch (language) {
        AppLanguage.vi => 'Chọn từ tiếng Nhật đúng với nghĩa này',
        AppLanguage.en => 'Choose the Japanese word for this meaning',
        AppLanguage.ja => 'この意味に合う日本語を選択',
      };

  String get promptChooseHanVietForKanji => switch (language) {
        AppLanguage.vi => 'Chọn âm Hán Việt của kanji này',
        AppLanguage.en => 'Choose Sino-Vietnamese reading for this kanji',
        AppLanguage.ja => 'この漢字の漢越音を選択',
      };

  String get promptChooseMeaningForWord => switch (language) {
        AppLanguage.vi => 'Chọn nghĩa đúng của từ này',
        AppLanguage.en => 'Choose the correct meaning of this word',
        AppLanguage.ja => 'この単語の正しい意味を選択',
      };

  String get promptChooseKanjiForReading => switch (language) {
        AppLanguage.vi => 'Chọn từ Kanji đúng với cách đọc này',
        AppLanguage.en => 'Choose the Kanji word for this reading',
        AppLanguage.ja => 'この読みに合う漢字を選択',
      };

  String get promptFillBlankWord => switch (language) {
        AppLanguage.vi => 'Chọn từ đúng để điền vào chỗ trống',
        AppLanguage.en => 'Choose the word to fill in the blank',
        AppLanguage.ja => '空欄に入る単語を選択',
      };

  String get promptChooseJapaneseWord => switch (language) {
        AppLanguage.vi => 'Chọn từ tiếng Nhật đúng',
        AppLanguage.en => 'Choose the correct Japanese word',
        AppLanguage.ja => '正しい日本語を選択',
      };

  String get promptChooseOnyomi => switch (language) {
        AppLanguage.vi => 'Chọn âm On đúng',
        AppLanguage.en => 'Choose the correct Onyomi',
        AppLanguage.ja => '正しい音読みを選択',
      };

  String get promptChooseKunyomi => switch (language) {
        AppLanguage.vi => 'Chọn âm Kun đúng',
        AppLanguage.en => 'Choose the correct Kunyomi',
        AppLanguage.ja => '正しい訓読みを選択',
      };

  String get promptChooseHanVietReading => switch (language) {
        AppLanguage.vi => 'Chọn âm Hán Việt đúng',
        AppLanguage.en => 'Choose the correct Sino-Vietnamese reading',
        AppLanguage.ja => '正しい漢越音を選択',
      };

  String get promptChooseKanjiFromHanViet => switch (language) {
        AppLanguage.vi => 'Chọn đúng kanji theo âm Hán Việt',
        AppLanguage.en => 'Choose the correct Kanji from Sino-Vietnamese',
        AppLanguage.ja => '漢越音に合う漢字を選択',
      };

  String get promptChooseKanjiForBlank => switch (language) {
        AppLanguage.vi => 'Chọn Kanji phù hợp với chỗ trống',
        AppLanguage.en => 'Choose the Kanji that fits the blank',
        AppLanguage.ja => '空欄に当てはまる漢字を選択',
      };

  String promptStrokeCountHelper(Object? count) => switch (language) {
        AppLanguage.vi => 'Số nét: ${count ?? '-'}',
        AppLanguage.en => 'Strokes: ${count ?? '-'}',
        AppLanguage.ja => '画数: ${count ?? '-'}',
      };

  String get promptBasedOnDisplayedWord => switch (language) {
        AppLanguage.vi => 'Dựa trên từ đang hiển thị.',
        AppLanguage.en => 'Based on the displayed word.',
        AppLanguage.ja => '表示されている単語に基づく。',
      };

  String get promptMatchOnyomiOnly => switch (language) {
        AppLanguage.vi => 'Chỉ đối chiếu On-yomi (âm Hán Nhật).',
        AppLanguage.en => 'Match Onyomi only.',
        AppLanguage.ja => '音読みのみ対象。',
      };

  String get promptMatchKunyomiOnly => switch (language) {
        AppLanguage.vi => 'Chỉ đối chiếu Kun-yomi (âm Nhật).',
        AppLanguage.en => 'Match Kunyomi only.',
        AppLanguage.ja => '訓読みのみ対象。',
      };

  String get promptNoPronunciation => switch (language) {
        AppLanguage.vi => 'Chưa có phiên âm',
        AppLanguage.en => 'No pronunciation',
        AppLanguage.ja => '読み仮名なし',
      };

  String promptOptionFallback(int index) => switch (language) {
        AppLanguage.vi => 'Lựa chọn $index',
        AppLanguage.en => 'Option $index',
        AppLanguage.ja => '選択肢 $index',
      };

  String get promptBestFitHint => switch (language) {
        AppLanguage.vi => 'Chọn đáp án phù hợp nhất.',
        AppLanguage.en => 'Choose the best match.',
        AppLanguage.ja => '最も適切な回答を選択。',
      };

  String get promptSpellingHint => switch (language) {
        AppLanguage.vi => 'Ưu tiên đúng chính tả.',
        AppLanguage.en => 'Prioritize exact spelling.',
        AppLanguage.ja => '正確な表記を選択。',
      };

  String promptPronunciationHint(String reading) => switch (language) {
        AppLanguage.vi => 'Gợi ý: $reading',
        AppLanguage.en => 'Hint: $reading',
        AppLanguage.ja => 'ヒント: $reading',
      };

  String get promptWriteKanjiFromHanViet => switch (language) {
        AppLanguage.vi => 'Viết Kanji theo âm Hán Việt',
        AppLanguage.en => 'Write Kanji from Sino-Vietnamese',
        AppLanguage.ja => '漢越音から漢字を書く',
      };

  String get promptNoHanVietYet => switch (language) {
        AppLanguage.vi => 'Âm Hán Việt chưa có',
        AppLanguage.en => 'No Sino-Vietnamese reading yet',
        AppLanguage.ja => '漢越音未登録',
      };

  String promptRadicalHint(String radical, String? name) => switch (language) {
        AppLanguage.vi =>
            'Gợi ý bộ thủ: $radical${name != null && name.trim().isNotEmpty ? ' · $name' : ''}',
        AppLanguage.en =>
            'Radical hint: $radical${name != null && name.trim().isNotEmpty ? ' · $name' : ''}',
        AppLanguage.ja =>
            '部首ヒント: $radical${name != null && name.trim().isNotEmpty ? ' · $name' : ''}',
      };

  String get promptMeaningAndRadicalHint => switch (language) {
        AppLanguage.vi => 'Gợi ý: đối chiếu nghĩa và bộ thủ bạn đã học.',
        AppLanguage.en => 'Hint: check meaning and radicals you have learned.',
        AppLanguage.ja => 'ヒント: 学習済みの意味と部首を参照してください。',
      };

  String get noDueCardsToReview => switch (language) {
        AppLanguage.vi => 'Chưa có thẻ nào đến hạn để ôn tập.',
        AppLanguage.en => 'No cards are due for review yet.',
        AppLanguage.ja => '復習予定のカードはありません。',
      };

  String formatReviewCountdown(String time) => switch (language) {
        AppLanguage.vi => 'Chưa đến lượt ôn. Còn $time.',
        AppLanguage.en => 'Not due yet. In $time.',
        AppLanguage.ja => 'まだ復習期日ではありません。残り $time',
      };

  // ==========================================
  // --- QUIZZES ---
  // ==========================================
  String get communityQuizzesTitle => switch (language) {
        AppLanguage.vi => 'Quiz cộng đồng',
        AppLanguage.en => 'Community Quizzes',
        AppLanguage.ja => 'コミュニティクイズ',
      };

  String get communityQuizzesSubtitle => switch (language) {
        AppLanguage.vi => 'Khám phá những bộ đề người khác đang chia sẻ.',
        AppLanguage.en => 'Explore quizzes shared by the community.',
        AppLanguage.ja => 'コミュニティで共有されたクイズを挑戦。',
      };

  String get myQuizzesTitle => switch (language) {
        AppLanguage.vi => 'Quiz của tôi',
        AppLanguage.en => 'My Quizzes',
        AppLanguage.ja => 'マイクイズ',
      };

  String get myQuizzesHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Những bộ đề bạn tự thiết kế để học theo cách riêng. Chơi lại bất cứ lúc nào.',
        AppLanguage.en =>
            'Custom quizzes designed by you. Play anytime to test yourself.',
        AppLanguage.ja =>
            'あなた専用に作成されたクイズ。いつでも復習・挑戦できます。',
      };

  String get createQuizFAB => switch (language) {
        AppLanguage.vi => 'Tạo quiz',
        AppLanguage.en => 'Create Quiz',
        AppLanguage.ja => 'クイズ作成',
      };

  String get playButton => switch (language) {
        AppLanguage.vi => 'Làm bài',
        AppLanguage.en => 'Play',
        AppLanguage.ja => '挑戦する',
      };

  String formatQuestionsCount(int count) => switch (language) {
        AppLanguage.vi => '$count câu hỏi',
        AppLanguage.en => '$count questions',
        AppLanguage.ja => '$count 問',
      };

  String questionCounter(int current, int total) => switch (language) {
        AppLanguage.vi => 'Câu $current / $total',
        AppLanguage.en => 'Question $current / $total',
        AppLanguage.ja => '問題 $current / $total',
      };

  String get quizCompletedTitle => switch (language) {
        AppLanguage.vi => 'Hoàn thành quiz!',
        AppLanguage.en => 'Quiz Completed!',
        AppLanguage.ja => 'クイズ完了！',
      };

  String quizScoreSummary(int correct, int total) => switch (language) {
        AppLanguage.vi => 'Bạn đã trả lời đúng $correct / $total câu.',
        AppLanguage.en => 'You answered $correct out of $total correctly.',
        AppLanguage.ja => '$total 問中 $correct 問正解しました。',
      };

  String get playAgain => switch (language) {
        AppLanguage.vi => 'Chơi lại',
        AppLanguage.en => 'Play Again',
        AppLanguage.ja => 'もう一度挑戦',
      };

  String get backToQuizzes => switch (language) {
        AppLanguage.vi => 'Quay về danh sách quiz',
        AppLanguage.en => 'Back to Quizzes',
        AppLanguage.ja => 'クイズ一覧に戻る',
      };

  String get createQuizTitle => switch (language) {
        AppLanguage.vi => 'Tạo bộ quiz mới',
        AppLanguage.en => 'Create New Quiz',
        AppLanguage.ja => '新しいクイズを作成',
      };

  String get quizTitleFieldLabel => switch (language) {
        AppLanguage.vi => 'Tiêu đề bộ quiz',
        AppLanguage.en => 'Quiz Title',
        AppLanguage.ja => 'クイズのタイトル',
      };

  String get quizDescFieldLabel => switch (language) {
        AppLanguage.vi => 'Mô tả ngắn (tùy chọn)',
        AppLanguage.en => 'Short Description (optional)',
        AppLanguage.ja => '簡単な説明（任意）',
      };

  String get quizTimeLimitLabel => switch (language) {
        AppLanguage.vi => 'Thời gian mỗi câu (giây)',
        AppLanguage.en => 'Time per question (seconds)',
        AppLanguage.ja => '1問あたりの時間（秒）',
      };

  String get quizValidationRequired => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập tiêu đề và chọn ít nhất một chế độ',
        AppLanguage.en => 'Please enter a title and select at least one mode',
        AppLanguage.ja => 'タイトルを入力し、1つ以上のモードを選択してください',
      };

  String get communityQuizzesHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Chọn nhanh một quiz để kiểm tra vốn từ, tốc độ nhớ và cảm giác học hiện tại.',
        AppLanguage.en =>
            'Pick a quiz to test your vocabulary, recall speed, and study pace.',
        AppLanguage.ja =>
            'クイズを選んで語彙力や記憶の定着度、学習ペースを確認しましょう。',
      };

  String get noCommunityQuizzesTitle => switch (language) {
        AppLanguage.vi => 'Chưa có quiz công khai nào',
        AppLanguage.en => 'No public quizzes available',
        AppLanguage.ja => '公開クイズはまだありません',
      };

  String get noCommunityQuizzesMessage => switch (language) {
        AppLanguage.vi =>
            'Hãy quay lại sau hoặc tự tạo quiz của bạn để mở màn.',
        AppLanguage.en =>
            'Check back later or create your own quiz to get started.',
        AppLanguage.ja =>
            '後で確認するか、自分で最初のクイズを作成してみましょう。',
      };

  String get communityCreatorLabel => switch (language) {
        AppLanguage.vi => 'Cộng đồng',
        AppLanguage.en => 'Community',
        AppLanguage.ja => 'コミュニティ',
      };

  String formatQuizItemSubtitle(int count, String creator) => switch (language) {
        AppLanguage.vi => '$count câu hỏi • $creator',
        AppLanguage.en => '$count questions • $creator',
        AppLanguage.ja => '$count 問 • $creator',
      };

  String get loadingQuiz => switch (language) {
        AppLanguage.vi => 'Đang tải quiz...',
        AppLanguage.en => 'Loading quizzes...',
        AppLanguage.ja => 'クイズを読み込み中...',
      };

  String get myQuizzesHeroTitle => switch (language) {
        AppLanguage.vi => 'Những bộ đề bạn tự thiết kế để học theo cách riêng.',
        AppLanguage.en => 'Custom quizzes designed by you to learn your way.',
        AppLanguage.ja => 'あなた専用にカスタマイズされた学習クイズ。',
      };

  String get myQuizzesHeroDesc => switch (language) {
        AppLanguage.vi =>
            'Tập trung vào đúng nhóm từ hoặc kanji bạn muốn luyện, rồi chơi lại bất cứ lúc nào.',
        AppLanguage.en =>
            'Focus on specific words or kanji you want to practice, then replay anytime.',
        AppLanguage.ja =>
            '復習したい単語や漢字に集中して、いつでも挑戦できます。',
      };

  String get noMyQuizzesTitle => switch (language) {
        AppLanguage.vi => 'Bạn chưa có quiz nào',
        AppLanguage.en => 'No custom quizzes yet',
        AppLanguage.ja => '作成したクイズはまだありません',
      };

  String get noMyQuizzesMessage => switch (language) {
        AppLanguage.vi =>
            'Tạo bộ quiz đầu tiên để kiểm tra đúng phần kiến thức mình đang học.',
        AppLanguage.en =>
            'Create your first quiz to test the exact content you are studying.',
        AppLanguage.ja =>
            '最初のクイズを作成して、学習中の知識をチェックしましょう。',
      };

  String get createQuizNow => switch (language) {
        AppLanguage.vi => 'Tạo quiz ngay',
        AppLanguage.en => 'Create Quiz Now',
        AppLanguage.ja => '今すぐ作成',
      };

  String formatMyQuizSubtitle(int modes, int items) => switch (language) {
        AppLanguage.vi => '$modes chế độ • $items mục',
        AppLanguage.en => '$modes modes • $items items',
        AppLanguage.ja => '$modes モード • $items 項目',
      };

  String get playQuizButton => switch (language) {
        AppLanguage.vi => 'Chơi',
        AppLanguage.en => 'Play',
        AppLanguage.ja => '挑戦',
      };

  String get loadingMyQuizzes => switch (language) {
        AppLanguage.vi => 'Đang tải quiz của bạn...',
        AppLanguage.en => 'Loading your quizzes...',
        AppLanguage.ja => 'マイクイズを読み込み中...',
      };

  String get loadingPreparingQuiz => switch (language) {
        AppLanguage.vi => 'Đang chuẩn bị quiz...',
        AppLanguage.en => 'Preparing quiz...',
        AppLanguage.ja => 'クイズを準備中...',
      };

  String get noQuestions => switch (language) {
        AppLanguage.vi => 'Không có câu hỏi',
        AppLanguage.en => 'No questions',
        AppLanguage.ja => '問題がありません',
      };

  String get quizResultTitle => switch (language) {
        AppLanguage.vi => 'Kết quả',
        AppLanguage.en => 'Results',
        AppLanguage.ja => '結果',
      };

  String get quizResultGoodTitle => switch (language) {
        AppLanguage.vi => 'Bạn giữ nhịp khá tốt.',
        AppLanguage.en => 'You kept up a great pace!',
        AppLanguage.ja => '素晴らしいペースを維持できています！',
      };

  String get quizResultKeepPracticingTitle => switch (language) {
        AppLanguage.vi => 'Lượt này vẫn còn chỗ để cải thiện.',
        AppLanguage.en => 'Room for improvement in this round.',
        AppLanguage.ja => 'まだ改善の余地があります。',
      };

  String get quizResultAdvice => switch (language) {
        AppLanguage.vi =>
            'Dùng kết quả này để quyết định nên quay lại quiz hay chuyển sang ôn SRS ngay bây giờ.',
        AppLanguage.en =>
            'Use this result to decide whether to retry or switch to SRS review.',
        AppLanguage.ja =>
            'この結果をもとに、もう一度挑戦するかSRS復習に進むか判断しましょう。',
      };

  String get correctAnswersLabel => switch (language) {
        AppLanguage.vi => 'Câu đúng',
        AppLanguage.en => 'Correct Answers',
        AppLanguage.ja => '正解数',
      };

  String get accuracyLabel => switch (language) {
        AppLanguage.vi => 'Độ chính xác',
        AppLanguage.en => 'Accuracy',
        AppLanguage.ja => '正答率',
      };

  String get quizCreateTitle => switch (language) {
        AppLanguage.vi => 'Tạo quiz mới',
        AppLanguage.en => 'Create New Quiz',
        AppLanguage.ja => '新しいクイズを作成',
      };

  String get quizCreateValidation => switch (language) {
        AppLanguage.vi => 'Vui lòng nhập tiêu đề và chọn ít nhất một chế độ',
        AppLanguage.en => 'Please enter a title and select at least one question mode',
        AppLanguage.ja => 'タイトルを入力し、出題モードを1つ以上選択してください',
      };

  String get createQuizHeaderTitle => switch (language) {
        AppLanguage.vi => 'Dựng một bộ quiz vừa sức và đúng mục tiêu học.',
        AppLanguage.en => 'Build a quiz fitted to your goals.',
        AppLanguage.ja => '学習目標に合わせたクイズを作成。',
      };

  String get createQuizHeaderSubtitle => switch (language) {
        AppLanguage.vi =>
            'Chọn nội dung, chọn chế độ hỏi và đóng gói thành một quiz có thể chơi lại nhiều lần.',
        AppLanguage.en =>
            'Select items, choose question modes, and create a repeatable quiz.',
        AppLanguage.ja =>
            '項目と出題モードを選んで、何度でも解けるクイズにまとめます。',
      };

  String get quizStepInfo => switch (language) {
        AppLanguage.vi => 'Thông tin',
        AppLanguage.en => 'Info',
        AppLanguage.ja => '基本情報',
      };

  String get quizStepContent => switch (language) {
        AppLanguage.vi => 'Nội dung',
        AppLanguage.en => 'Content',
        AppLanguage.ja => '出題内容',
      };

  String get quizStepModes => switch (language) {
        AppLanguage.vi => 'Chế độ',
        AppLanguage.en => 'Modes',
        AppLanguage.ja => '出題モード',
      };

  String get quizStepNext => switch (language) {
        AppLanguage.vi => 'Tiếp theo',
        AppLanguage.en => 'Next',
        AppLanguage.ja => '次へ',
      };

  String get quizTitleRequired => switch (language) {
        AppLanguage.vi => 'Tiêu đề quiz *',
        AppLanguage.en => 'Quiz Title *',
        AppLanguage.ja => 'クイズのタイトル *',
      };

  String get quizDescOptional => switch (language) {
        AppLanguage.vi => 'Mô tả',
        AppLanguage.en => 'Description',
        AppLanguage.ja => '説明',
      };

  String get quizTimeLimitOptional => switch (language) {
        AppLanguage.vi => 'Giới hạn thời gian (giây)',
        AppLanguage.en => 'Time limit (seconds)',
        AppLanguage.ja => '制限時間（秒）',
      };

  String get quizTimeLimitHint => switch (language) {
        AppLanguage.vi => 'Để trống nếu không giới hạn',
        AppLanguage.en => 'Leave blank for unlimited',
        AppLanguage.ja => '無制限の場合は空欄',
      };

  String get quizSelectContentTitle => switch (language) {
        AppLanguage.vi => 'Chọn nội dung',
        AppLanguage.en => 'Select Content',
        AppLanguage.ja => '出題内容を選択',
      };

  String get quizSelectContentSubtitle => switch (language) {
        AppLanguage.vi =>
            'Bạn có thể import nhanh từ thư mục hoặc chọn tay từng mục từ ô tìm kiếm.',
        AppLanguage.en =>
            'Import quickly from folders or manually select items from search.',
        AppLanguage.ja =>
            '単語帳からインポートするか、検索から手動で選択できます。',
      };

  String get searchVocabToAddHint => switch (language) {
        AppLanguage.vi => 'Tìm từ vựng để thêm...',
        AppLanguage.en => 'Search vocabulary to add...',
        AppLanguage.ja => '追加する単語を検索...',
      };

  String get searchingVocabLoading => switch (language) {
        AppLanguage.vi => 'Đang tìm từ vựng...',
        AppLanguage.en => 'Searching vocabulary...',
        AppLanguage.ja => '単語を検索中...',
      };

  String get noSearchResultsQuiz => switch (language) {
        AppLanguage.vi =>
            'Chưa có kết quả. Hãy gõ một từ khóa để bắt đầu thêm nội dung vào quiz.',
        AppLanguage.en =>
            'No results. Type a keyword to start adding items.',
        AppLanguage.ja =>
            '該当なし。キーワードを入力して単語を追加してください。',
      };

  String get quizSelectModesTitle => switch (language) {
        AppLanguage.vi => 'Chọn chế độ hỏi',
        AppLanguage.en => 'Select Question Modes',
        AppLanguage.ja => '出題モードを選択',
      };

  String get quizSelectModesSubtitle => switch (language) {
        AppLanguage.vi =>
            'Mỗi chế độ tạo ra một kiểu câu hỏi khác nhau. Chọn ít nhất một để hoàn tất quiz.',
        AppLanguage.en =>
            'Each mode produces a different question format. Choose at least one.',
        AppLanguage.ja =>
            '各モードで異なる形式の問題が出題されます。1つ以上選択してください。',
      };

  String quizModeTitle(String code) => switch (code) {
        'MEAN_FROM_WORD' => switch (language) {
            AppLanguage.vi => 'Nghĩa từ từ vựng',
            AppLanguage.en => 'Meaning from word',
            AppLanguage.ja => '単語から意味',
          },
        'WORD_FROM_MEAN' => switch (language) {
            AppLanguage.vi => 'Từ vựng từ nghĩa',
            AppLanguage.en => 'Word from meaning',
            AppLanguage.ja => '意味から単語',
          },
        'FILL_BLANK' => switch (language) {
            AppLanguage.vi => 'Điền vào chỗ trống',
            AppLanguage.en => 'Fill in the blank',
            AppLanguage.ja => '穴埋め問題',
          },
        'ON_KUN_READ' => switch (language) {
            AppLanguage.vi => 'Âm On / Kun',
            AppLanguage.en => 'On/Kun readings',
            AppLanguage.ja => '音読み・訓読み',
          },
        'HAN_VIET' => switch (language) {
            AppLanguage.vi => 'Âm Hán Việt',
            AppLanguage.en => 'Sino-Vietnamese',
            AppLanguage.ja => '漢字の読み',
          },
        'COMPOSE_KANJI' => switch (language) {
            AppLanguage.vi => 'Ghép bộ Kanji',
            AppLanguage.en => 'Compose Kanji',
            AppLanguage.ja => '漢字組み立て',
          },
        'DRAW_KANJI' => switch (language) {
            AppLanguage.vi => 'Tập viết Kanji',
            AppLanguage.en => 'Draw Kanji',
            AppLanguage.ja => '漢字の書き取り',
          },
        _ => code,
      };

  // ==========================================
  // --- EXAMS ---
  // ==========================================
  String get examsListTitle => switch (language) {
        AppLanguage.vi => 'Đề kiểm tra',
        AppLanguage.en => 'JLPT Exams',
        AppLanguage.ja => '模擬試験',
      };

  String get searchExamsHint => switch (language) {
        AppLanguage.vi => 'Tìm đề theo tên...',
        AppLanguage.en => 'Search exams by title...',
        AppLanguage.ja => '試験名で検索...',
      };

  String get examNoExamsTitle => switch (language) {
        AppLanguage.vi => 'Chưa có đề kiểm tra',
        AppLanguage.en => 'No exams available',
        AppLanguage.ja => '試験はまだありません',
      };

  String get examNoExamsSubtitle => switch (language) {
        AppLanguage.vi => 'Các đề công khai sẽ xuất hiện tại đây.',
        AppLanguage.en => 'Public exams will appear here.',
        AppLanguage.ja => '公開された試験がここに表示されます。',
      };

  String get examPlayTitle => switch (language) {
        AppLanguage.vi => 'Làm đề kiểm tra',
        AppLanguage.en => 'Take Exam',
        AppLanguage.ja => '試験を受ける',
      };

  String get submitExam => switch (language) {
        AppLanguage.vi => 'Nộp bài',
        AppLanguage.en => 'Submit Exam',
        AppLanguage.ja => '提出する',
      };

  String get examResultTitle => switch (language) {
        AppLanguage.vi => 'Kết quả đề kiểm tra',
        AppLanguage.en => 'Exam Results',
        AppLanguage.ja => '試験結果',
      };

  String formatCorrectCount(int correct, int total) => switch (language) {
        AppLanguage.vi => '$correct / $total câu đúng',
        AppLanguage.en => '$correct / $total correct',
        AppLanguage.ja => '$total 問中 $correct 問正解',
      };

  String get retakeExam => switch (language) {
        AppLanguage.vi => 'Làm lại đề',
        AppLanguage.en => 'Retake Exam',
        AppLanguage.ja => '再挑戦する',
      };

  String get chooseOtherExam => switch (language) {
        AppLanguage.vi => 'Chọn đề khác',
        AppLanguage.en => 'Choose Another Exam',
        AppLanguage.ja => '他の試験を選ぶ',
      };

  String get cannotSubmitExam => switch (language) {
        AppLanguage.vi => 'Không thể nộp bài. Hãy thử lại.',
        AppLanguage.en => 'Could not submit exam. Please try again.',
        AppLanguage.ja => '提出できませんでした。再試行してください。',
      };

  String get loadingExams => switch (language) {
        AppLanguage.vi => 'Đang tải đề kiểm tra...',
        AppLanguage.en => 'Loading exams...',
        AppLanguage.ja => '試験を読み込み中...',
      };

  String get cannotLoadExams => switch (language) {
        AppLanguage.vi => 'Không thể tải đề',
        AppLanguage.en => 'Could not load exams',
        AppLanguage.ja => '試験を読み込めませんでした',
      };

  String get checkConnectionRetry => switch (language) {
        AppLanguage.vi => 'Kiểm tra kết nối rồi thử lại.',
        AppLanguage.en => 'Check your connection and try again.',
        AppLanguage.ja => '通信状態を確認して再試行してください。',
      };

  String formatExamMeta(int questions, int? minutes) => switch (language) {
        AppLanguage.vi =>
            '$questions câu • ${minutes == null ? "Không giới hạn" : "$minutes phút"}',
        AppLanguage.en =>
            '$questions questions • ${minutes == null ? "No limit" : "$minutes mins"}',
        AppLanguage.ja =>
            '$questions 問 • ${minutes == null ? "無制限" : "$minutes 分"}',
      };

  String get cannotLoadExamDetail => switch (language) {
        AppLanguage.vi => 'Đề có thể không còn công khai hoặc kết nối đang gặp lỗi.',
        AppLanguage.en => 'This exam may no longer be public or there is a connection error.',
        AppLanguage.ja => 'この試験は非公開になったか、接続エラーが発生しています。',
      };

  String get chooseAnotherExamPrompt => switch (language) {
        AppLanguage.vi => 'Hãy chọn một đề khác.',
        AppLanguage.en => 'Please choose another exam.',
        AppLanguage.ja => '他の試験を選択してください。',
      };

  String formatExamQuestionProgress(int current, int total, int answered) => switch (language) {
        AppLanguage.vi => 'Câu $current/$total • $answered đã trả lời',
        AppLanguage.en => 'Question $current/$total • $answered answered',
        AppLanguage.ja => '第 $current/$total 問 • $answered 問回答済み',
      };

  String get submitting => switch (language) {
        AppLanguage.vi => 'Đang nộp...',
        AppLanguage.en => 'Submitting...',
        AppLanguage.ja => '提出中...',
      };

  String get buildingKnowledgeMap => switch (language) {
        AppLanguage.vi => 'Đang dựng bản đồ năng lực...',
        AppLanguage.en => 'Generating knowledge graph...',
        AppLanguage.ja => '能力マップを生成中...',
      };

  // ==========================================
  // --- FOLDERS ---
  // ==========================================
  String get foldersListTitle => switch (language) {
        AppLanguage.vi => 'Thư mục',
        AppLanguage.en => 'Folders',
        AppLanguage.ja => '単語帳',
      };

  String get createFolderFAB => switch (language) {
        AppLanguage.vi => 'Tạo thư mục',
        AppLanguage.en => 'New Folder',
        AppLanguage.ja => 'フォルダ作成',
      };

  String foldersCountSubtitle(int count) => switch (language) {
        AppLanguage.vi => '$count ngăn học đang chờ được mở lại.',
        AppLanguage.en => '$count study folders waiting for review.',
        AppLanguage.ja => '$count 個の単語帳が復習を待っています。',
      };

  String get foldersHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Sắp xếp từ vựng theo chủ đề, theo bài hoặc theo mục tiêu cá nhân để việc ôn tập rõ ràng hơn.',
        AppLanguage.en =>
            'Organize vocabulary by topic, lesson, or goal for clearer reviews.',
        AppLanguage.ja =>
            'トピックや目標ごとに単語を分類して効率的に復習しましょう。',
      };

  String get noFoldersTitle => switch (language) {
        AppLanguage.vi => 'Chưa có thư mục nào',
        AppLanguage.en => 'No folders yet',
        AppLanguage.ja => 'フォルダがありません',
      };

  String get noFoldersPrompt => switch (language) {
        AppLanguage.vi =>
            'Tạo thư mục đầu tiên để gom từ vựng theo chủ đề và lên nhịp ôn tập riêng.',
        AppLanguage.en =>
            'Create your first folder to organize words and practice your way.',
        AppLanguage.ja =>
            '最初の単語帳を作成して独自の学習セットを構築しましょう。',
      };

  String get folderDetailTitle => switch (language) {
        AppLanguage.vi => 'Chi tiết thư mục',
        AppLanguage.en => 'Folder Detail',
        AppLanguage.ja => 'フォルダ詳細',
      };

  String get createNewFolderTitle => switch (language) {
        AppLanguage.vi => 'Tạo thư mục mới',
        AppLanguage.en => 'Create New Folder',
        AppLanguage.ja => '新規フォルダ作成',
      };

  String get folderNameLabel => switch (language) {
        AppLanguage.vi => 'Tên thư mục',
        AppLanguage.en => 'Folder Name',
        AppLanguage.ja => 'フォルダ名',
      };

  String get folderDescLabel => switch (language) {
        AppLanguage.vi => 'Mô tả (tùy chọn)',
        AppLanguage.en => 'Description (optional)',
        AppLanguage.ja => '説明（任意）',
      };

  String get wordRemovedFromFolder => switch (language) {
        AppLanguage.vi => 'Đã xóa từ vựng khỏi thư mục',
        AppLanguage.en => 'Removed vocabulary from folder',
        AppLanguage.ja => 'フォルダから単語を削除しました',
      };

  String get loadingFolders => switch (language) {
        AppLanguage.vi => 'Đang tải thư mục...',
        AppLanguage.en => 'Loading folders...',
        AppLanguage.ja => 'フォルダを読み込み中...',
      };

  String get editFolder => switch (language) {
        AppLanguage.vi => 'Sửa thư mục',
        AppLanguage.en => 'Edit Folder',
        AppLanguage.ja => 'フォルダを編集',
      };

  String get deleteFolder => switch (language) {
        AppLanguage.vi => 'Xóa thư mục',
        AppLanguage.en => 'Delete Folder',
        AppLanguage.ja => 'フォルダを削除',
      };

  String formatFolderVocabCount(int count) => switch (language) {
        AppLanguage.vi => '$count từ vựng trong thư mục này',
        AppLanguage.en => '$count words in this folder',
        AppLanguage.ja => 'このフォルダ内に $count 単語',
      };

  String get folderNameRequired => switch (language) {
        AppLanguage.vi => 'Tên thư mục *',
        AppLanguage.en => 'Folder Name *',
        AppLanguage.ja => 'フォルダ名 *',
      };

  String confirmDeleteFolder(String name) => switch (language) {
        AppLanguage.vi =>
            'Bạn có chắc muốn xóa "$name"? Tất cả từ vựng trong thư mục sẽ bị xóa.',
        AppLanguage.en =>
            'Are you sure you want to delete "$name"? All words in this folder will be deleted.',
        AppLanguage.ja =>
            '「$name」を削除してもよろしいですか？フォルダ内のすべての単語が削除されます。',
      };

  String formatFolderItemsSummary(int vocabs, int kanjis) => switch (language) {
        AppLanguage.vi => '$vocabs từ • $kanjis kanji trong bộ học này.',
        AppLanguage.en => '$vocabs words • $kanjis kanji in this set.',
        AppLanguage.ja => '$vocabs 単語 • $kanjis 漢字の学習セット。',
      };

  String get folderDetailHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Kanji độc lập chỉ xuất hiện ở khu vực Kanji, không bị lặp trong danh sách từ vựng.',
        AppLanguage.en =>
            'Standalone Kanji only appears in the Kanji section, without duplicating in vocabulary.',
        AppLanguage.ja =>
            '単独の漢字は漢字エリアにのみ表示され、単語一覧と重複しません。',
      };

  String get folderEmptyTitle => switch (language) {
        AppLanguage.vi => 'Thư mục này đang trống',
        AppLanguage.en => 'This folder is empty',
        AppLanguage.ja => 'このフォルダは空です',
      };

  String get folderEmptySubtitle => switch (language) {
        AppLanguage.vi =>
            'Thêm từ vựng từ màn hình tìm kiếm để bắt đầu biến thư mục này thành một bộ học thực sự.',
        AppLanguage.en =>
            'Add vocabulary from search to start building your study set.',
        AppLanguage.ja =>
            '検索画面から単語を追加して学習セットを作りましょう。',
      };

  String formatLearningCount(int count) => switch (language) {
        AppLanguage.vi => '$count mục đang học',
        AppLanguage.en => '$count items learning',
        AppLanguage.ja => '$count 項目を学習中',
      };

  String get folderKanjiSectionTitle => switch (language) {
        AppLanguage.vi => 'Kanji trong thư mục',
        AppLanguage.en => 'Kanji in Folder',
        AppLanguage.ja => 'フォルダ内の漢字',
      };

  String formatFolderKanjiSubtitle(int count) => switch (language) {
        AppLanguage.vi => '$count chữ • không lặp vào bảng từ vựng',
        AppLanguage.en => '$count characters • not duplicated in vocabulary',
        AppLanguage.ja => '$count 文字 • 単語リストと重複なし',
      };

  String formatRelatedWords(int count, String examples) => switch (language) {
        AppLanguage.vi =>
            '$count từ liên quan${examples.isEmpty ? "" : " • $examples"}',
        AppLanguage.en =>
            '$count related words${examples.isEmpty ? "" : " • $examples"}',
        AppLanguage.ja =>
            '$count 件の関連単語${examples.isEmpty ? "" : " • $examples"}',
      };

  String get removeKanjiFromFolderTooltip => switch (language) {
        AppLanguage.vi => 'Xóa Kanji khỏi thư mục',
        AppLanguage.en => 'Remove Kanji from folder',
        AppLanguage.ja => 'フォルダから漢字を削除',
      };

  String get deleteKanjiTitle => switch (language) {
        AppLanguage.vi => 'Xóa Kanji',
        AppLanguage.en => 'Remove Kanji',
        AppLanguage.ja => '漢字を削除',
      };

  String get deleteVocabTitle => switch (language) {
        AppLanguage.vi => 'Xóa từ vựng',
        AppLanguage.en => 'Remove Word',
        AppLanguage.ja => '単語を削除',
      };

  String confirmRemoveItemFromFolder(String label) => switch (language) {
        AppLanguage.vi => 'Xóa "$label" khỏi thư mục này?',
        AppLanguage.en => 'Remove "$label" from this folder?',
        AppLanguage.ja => '「$label」をこのフォルダから削除しますか？',
      };

  // ==========================================
  // --- LEADERBOARD ---
  // ==========================================
  String get leaderboardTitle => switch (language) {
        AppLanguage.vi => 'Bảng xếp hạng',
        AppLanguage.en => 'Leaderboard',
        AppLanguage.ja => 'ランキング',
      };

  String get leaderboardHeroTitle => switch (language) {
        AppLanguage.vi => 'Những người đang giữ nhịp quiz tốt nhất.',
        AppLanguage.en => 'Learners with the highest quiz momentum.',
        AppLanguage.ja => 'クイズでトップの成果を収めている学習者。',
      };

  String get leaderboardHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Một cái nhìn nhanh vào độ chính xác, số lượt làm và ai đang dẫn đầu trong cộng đồng.',
        AppLanguage.en =>
            'A quick glance at accuracy, attempts, and who leads the community.',
        AppLanguage.ja =>
            '正答率、挑戦回数、コミュニティのリーダーを素早くチェック。',
      };

  String get leaderboardRemainingPositions => switch (language) {
        AppLanguage.vi => 'Các vị trí còn lại',
        AppLanguage.en => 'Other Standings',
        AppLanguage.ja => 'その他の順位',
      };

  String get leaderboardRemainingSubtitle => switch (language) {
        AppLanguage.vi => 'Theo dõi phần còn lại của bảng mà không mất nhịp.',
        AppLanguage.en => 'Track the rest of the board without missing a beat.',
        AppLanguage.ja => 'ランキングの続きを確認しましょう。',
      };

  String get leaderboardEmptyMessage => switch (language) {
        AppLanguage.vi =>
            'Hoàn thành quiz để xuất hiện trong đường đua cộng đồng.',
        AppLanguage.en =>
            'Complete quizzes to appear on the community leaderboard.',
        AppLanguage.ja =>
            'クイズを完了してコミュニティランキングにランクインしましょう。',
      };

  String get loadingLeaderboard => switch (language) {
        AppLanguage.vi => 'Đang tải bảng xếp hạng...',
        AppLanguage.en => 'Loading leaderboard...',
        AppLanguage.ja => 'ランキングを読み込み中...',
      };

  String formatQuizStats(int quizCount, int correctCount) => switch (language) {
        AppLanguage.vi => '$quizCount quiz • $correctCount câu đúng',
        AppLanguage.en => '$quizCount quizzes • $correctCount correct',
        AppLanguage.ja => '$quizCount 回クイズ • $correctCount 正解',
      };

  // ==========================================
  // --- PROFILE & SETTINGS ---
  // ==========================================
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

  String get roleLabel => switch (language) {
        AppLanguage.vi => 'Vai trò',
        AppLanguage.en => 'Role',
        AppLanguage.ja => '権限・役割',
      };

  String get fullNameLabel => switch (language) {
        AppLanguage.vi => 'Họ tên',
        AppLanguage.en => 'Full Name',
        AppLanguage.ja => '氏名',
      };

  String get editProfileTitle => switch (language) {
        AppLanguage.vi => 'Chỉnh sửa hồ sơ',
        AppLanguage.en => 'Edit Profile',
        AppLanguage.ja => 'プロフィール編集',
      };

  String get avatarUploadError => switch (language) {
        AppLanguage.vi => 'Không tải được ảnh đại diện.',
        AppLanguage.en => 'Failed to upload profile picture.',
        AppLanguage.ja => 'プロフィール画像のアップロードに失敗しました。',
      };

  String get logoutConfirmTitle => switch (language) {
        AppLanguage.vi => 'Đăng xuất tài khoản',
        AppLanguage.en => 'Log Out',
        AppLanguage.ja => 'ログアウト',
      };

  String get logoutConfirmMessage => switch (language) {
        AppLanguage.vi => 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Kitsune?',
        AppLanguage.en => 'Are you sure you want to log out of Kitsune?',
        AppLanguage.ja => 'Kitsuneからログアウトしてもよろしいですか？',
      };

  String get notLoggedIn => switch (language) {
        AppLanguage.vi => 'Chưa đăng nhập',
        AppLanguage.en => 'Not logged in',
        AppLanguage.ja => '未ログイン',
      };

  String profileHeroSubtitle(String username) => switch (language) {
        AppLanguage.vi =>
            '@$username • giữ nhịp học của bạn đồng bộ trên mọi màn từ vựng, kanji và quiz.',
        AppLanguage.en =>
            '@$username • keeping your study momentum in sync across vocabulary, kanji, and quizzes.',
        AppLanguage.ja =>
            '@$username • 単語、漢字、クイズの学習記録を同期中。',
      };

  String get loadingStats => switch (language) {
        AppLanguage.vi => 'Đang tải thống kê...',
        AppLanguage.en => 'Loading stats...',
        AppLanguage.ja => '統計を読み込み中...',
      };

  String get connectingKnowledgeGraph => switch (language) {
        AppLanguage.vi => 'Đang nối các bằng chứng học tập...',
        AppLanguage.en => 'Connecting learning evidence...',
        AppLanguage.ja => '学習記録を連携中...',
      };

  String get cannotLoadKnowledgeGraph => switch (language) {
        AppLanguage.vi => 'Chưa tải được bản đồ năng lực.',
        AppLanguage.en => 'Could not load knowledge graph.',
        AppLanguage.ja => '能力マップを読み込めませんでした。',
      };

  String get termsTitle1 => switch (language) {
        AppLanguage.vi => '1. Chấp nhận điều khoản',
        AppLanguage.en => '1. Acceptance of Terms',
        AppLanguage.ja => '1. 利用規約の同意',
      };

  String get termsBody1 => switch (language) {
        AppLanguage.vi =>
            'Bằng việc đăng ký tài khoản và sử dụng Kitsune, bạn đồng ý tuân thủ các điều khoản này.',
        AppLanguage.en =>
            'By registering and using Kitsune, you agree to comply with these terms.',
        AppLanguage.ja =>
            'アカウント登録およびKitsuneの利用により、本規約に同意したものとみなされます。',
      };

  String get termsTitle2 => switch (language) {
        AppLanguage.vi => '2. Quyền riêng tư & Dữ liệu',
        AppLanguage.en => '2. Privacy & Data',
        AppLanguage.ja => '2. プライバシーとデータ',
      };

  String get termsBody2 => switch (language) {
        AppLanguage.vi =>
            'Chúng tôi lưu trữ thông tin cơ bản (email, tên) và tiến trình học tập của bạn để đồng bộ trên các thiết bị. Dữ liệu của bạn được bảo mật và không chia sẻ cho bên thứ ba vì mục đích quảng cáo.',
        AppLanguage.en =>
            'We store basic info and learning progress to sync across devices. Your data is secure and never sold to third parties.',
        AppLanguage.ja =>
            '基本情報と学習進捗を保存し、デバイス間で同期します。データは保護され第三者に提供されることはありません。',
      };

  String get termsTitle3 => switch (language) {
        AppLanguage.vi => '3. Sử dụng hợp lý',
        AppLanguage.en => '3. Fair Use',
        AppLanguage.ja => '3. 適正利用',
      };

  String get termsBody3 => switch (language) {
        AppLanguage.vi =>
            'Bạn không được sử dụng các công cụ tự động (bot) để tạo tải giả hoặc phá hoại dịch vụ. Mọi hành vi vi phạm có thể dẫn đến việc khóa tài khoản vĩnh viễn mà không cần báo trước.',
        AppLanguage.en =>
            'You must not use automated bots to create false load or disrupt services. Violations may result in immediate suspension.',
        AppLanguage.ja =>
            'bot等を用いた不正アクセスや過度な負荷をかける行為は禁止されています。違反時はアカウント停止となる場合があります。',
      };

  String get termsTitle4 => switch (language) {
        AppLanguage.vi => '4. Quyền sở hữu nội dung',
        AppLanguage.en => '4. Content Ownership',
        AppLanguage.ja => '4. コンテンツの所有権',
      };

  String get termsBody4 => switch (language) {
        AppLanguage.vi =>
            'Dữ liệu từ vựng và ngữ pháp do cộng đồng đóng góp thuộc quyền sở hữu chung. Mã nguồn và thiết kế của Kitsune thuộc quyền sở hữu của tác giả Nguyễn Duy Linh.',
        AppLanguage.en =>
            'Community-contributed vocabulary belongs to open domain. Kitsune codebase and design belong to author Nguyen Duy Linh.',
        AppLanguage.ja =>
            'コミュニティ貢献コンテンツは共有財産です。Kitsuneのコードおよびデザインは作者Nguyen Duy Linhに帰属します。',
      };

  // Vocabulary Search Page
  String get vocabSearchHeroTitle => switch (language) {
        AppLanguage.vi => 'Tra nhanh, lưu đúng và quay lại ôn sau.',
        AppLanguage.en => 'Quick search, accurate saves, review later.',
        AppLanguage.ja => 'すばやく検索し、保存して後で復習。',
      };

  String get vocabSearchHeroSubtitle => switch (language) {
        AppLanguage.vi =>
            'Tìm theo chữ Nhật, romaji hoặc nghĩa tiếng Việt rồi tiếp tục học ngay trong cùng một nhịp.',
        AppLanguage.en =>
            'Search by Japanese, Romaji, or English meaning and study seamlessly.',
        AppLanguage.ja =>
            '日本語、ローマ字、または意味で検索し、スムーズに学習を続けられます。',
      };

  String get vocabSearchPlaceholder => switch (language) {
        AppLanguage.vi => 'Tìm từ vựng...',
        AppLanguage.en => 'Search vocabulary...',
        AppLanguage.ja => '単語を検索...',
      };

  String get vocabSearchEmptyMessage => switch (language) {
        AppLanguage.vi =>
            'Bạn có thể tìm theo tiếng Nhật, cách đọc hoặc nghĩa tiếng Việt.',
        AppLanguage.en =>
            'You can search by Japanese, pronunciation, or meaning.',
        AppLanguage.ja => '日本語、読み方、または意味で検索できます。',
      };

  String get vocabSearchNoResultsMessage => switch (language) {
        AppLanguage.vi =>
            'Thử đổi cách viết, romaji hoặc nghĩa để mở rộng kết quả.',
        AppLanguage.en =>
            'Try different spelling, romaji, or meaning to broaden results.',
        AppLanguage.ja => '表記、ローマ字、意味を変えて再度検索してください。',
      };

  String get vocabExploreRandomTitle => switch (language) {
        AppLanguage.vi => 'Khám phá ngẫu nhiên',
        AppLanguage.en => 'Random Discovery',
        AppLanguage.ja => 'ランダム発見',
      };

  String get vocabExploreRandomSubtitle => switch (language) {
        AppLanguage.vi =>
            'Một vài thẻ để bạn mở rộng vốn từ khi chưa nhập từ khóa.',
        AppLanguage.en => 'Cards to expand your vocabulary before searching.',
        AppLanguage.ja => 'キーワード入力前に語彙を広げるカード。',
      };

  String get vocabMatchingResultsTitle => switch (language) {
        AppLanguage.vi => 'Kết quả phù hợp',
        AppLanguage.en => 'Matching Results',
        AppLanguage.ja => '検索結果',
      };

  String vocabMatchingResultsSubtitle(int count) => switch (language) {
        AppLanguage.vi => '$count mục khớp với truy vấn hiện tại.',
        AppLanguage.en => '$count items match the current query.',
        AppLanguage.ja => '現在の条件に一致する $count 件の項目。',
      };

  String get kanjiLoadFailed => switch (language) {
        AppLanguage.vi => 'Không thể tải thông tin Kanji.',
        AppLanguage.en => 'Failed to load Kanji information.',
        AppLanguage.ja => '漢字情報を読み込めませんでした。',
      };

  String get searchHintEmpty => switch (language) {
        AppLanguage.vi => 'Bắt đầu bằng một từ khóa',
        AppLanguage.en => 'Start with a keyword',
        AppLanguage.ja => 'キーワードを入力してください',
      };

  String get noVocabFound => switch (language) {
        AppLanguage.vi => 'Không tìm thấy từ vựng',
        AppLanguage.en => 'No vocabulary found',
        AppLanguage.ja => '単語が見つかりませんでした',
      };

  String get mnemonic => kanjiDetailMnemonic;
  String get strokeCount => strokeCountLabel;

  String get strokeUnit => switch (language) {
        AppLanguage.vi => 'nét',
        AppLanguage.en => 'strokes',
        AppLanguage.ja => '画',
      };

  // Kanji Drawing & Stroke Review
  String get kanjiDrawInstruction => switch (language) {
        AppLanguage.vi => 'Vẽ từng nét vào ô trống, không có chữ mờ làm mẫu.',
        AppLanguage.en =>
            'Draw each stroke in the blank box without background guide.',
        AppLanguage.ja => 'ガイドなしで枠内に一画ずつ書いてください。',
      };

  String get kanjiDrawNoData => switch (language) {
        AppLanguage.vi => 'Không có dữ liệu Kanji để luyện viết.',
        AppLanguage.en => 'No Kanji data available for writing practice.',
        AppLanguage.ja => '書き取り練習用の漢字データがありません。',
      };

  String get kanjiDrawNoStrokes => switch (language) {
        AppLanguage.vi => 'Không có dữ liệu nét viết cho chữ này.',
        AppLanguage.en => 'No stroke data available for this character.',
        AppLanguage.ja => 'この漢字の書き順データがありません。',
      };

  String get kanjiDrawLoadFailed => switch (language) {
        AppLanguage.vi => 'Không tải được dữ liệu nét viết.',
        AppLanguage.en => 'Failed to load stroke data.',
        AppLanguage.ja => '書き順データを読み込めませんでした。',
      };

  String kanjiDrawStrokeMismatch(int expected, int actual) => switch (language) {
        AppLanguage.vi =>
            'Cần viết đủ $expected nét. Bạn đã viết $actual nét.',
        AppLanguage.en =>
            'Expected $expected strokes. You drew $actual strokes.',
        AppLanguage.ja =>
            '$expected 画必要です（現在 $actual 画）。',
      };

  String get kanjiDrawSuccess => switch (language) {
        AppLanguage.vi => 'Chính xác! Các nét viết đã tạo đúng chữ Kanji.',
        AppLanguage.en => 'Correct! Your strokes match the Kanji character.',
        AppLanguage.ja => '正解です！綺麗な書き順で漢字が書けました。',
      };

  String get kanjiDrawFail => switch (language) {
        AppLanguage.vi =>
            'Nét viết chưa khớp. Xem gợi ý để đối chiếu rồi luyện lại ở lần sau.',
        AppLanguage.en =>
            'Strokes do not match. Check the hint and try again next time.',
        AppLanguage.ja =>
            '画が一致しません。ヒントを確認して次回再挑戦してください。',
      };

  String get clearStrokes => switch (language) {
        AppLanguage.vi => 'Xóa nét',
        AppLanguage.en => 'Clear',
        AppLanguage.ja => 'クリア',
      };

  String get showHint => switch (language) {
        AppLanguage.vi => 'Xem gợi ý',
        AppLanguage.en => 'Show Hint',
        AppLanguage.ja => 'ヒント',
      };

  String get checkStrokes => switch (language) {
        AppLanguage.vi => 'Kiểm tra nét',
        AppLanguage.en => 'Check Strokes',
        AppLanguage.ja => '判定',
      };

  String get strokeOrderHeader => switch (language) {
        AppLanguage.vi => 'THỨ TỰ NÉT',
        AppLanguage.en => 'STROKE ORDER',
        AppLanguage.ja => '書き順',
      };

  String get strokeOrderSub => switch (language) {
        AppLanguage.vi => 'Từng nét được vẽ chậm để dễ quan sát.',
        AppLanguage.en => 'Each stroke is drawn slowly for clear observation.',
        AppLanguage.ja => '書き順がゆっくりアニメーションされます。',
      };

  String get replayStroke => switch (language) {
        AppLanguage.vi => 'Phát lại nét viết',
        AppLanguage.en => 'Replay strokes',
        AppLanguage.ja => 'もう一度再生',
      };

  // Knowledge Graph
  String knowledgeInsightLearning(int attempts) => switch (language) {
        AppLanguage.vi =>
            'Mới có $attempts bằng chứng — tiếp tục luyện để đánh giá chính xác.',
        AppLanguage.en =>
            'Only $attempts attempts recorded — keep practicing for accurate assessment.',
        AppLanguage.ja =>
            'データがまだ $attempts 回分です。練習を重ねて精度を上げましょう。',
      };

  String knowledgeInsightStrong(int score) => switch (language) {
        AppLanguage.vi => 'Điểm mạnh ổn định ($score% đúng).',
        AppLanguage.en => 'Strong proficiency ($score% correct).',
        AppLanguage.ja => '安定した強みです（正答率 $score%）。',
      };

  String knowledgeInsightWeak(int score) => switch (language) {
        AppLanguage.vi => 'Nên ưu tiên ôn lại ($score% đúng).',
        AppLanguage.en => 'Needs review priority ($score% correct).',
        AppLanguage.ja => '重点的な復習を推奨（正答率 $score%）。',
      };

  String knowledgeInsightGrowing(int score) => switch (language) {
        AppLanguage.vi =>
            'Đang tiến bộ, cần thêm vài lượt củng cố ($score% đúng).',
        AppLanguage.en =>
            'Progressing well, reinforce with a few more sessions ($score% correct).',
        AppLanguage.ja =>
            '成長中です。定着のためもう少し練習しましょう（正答率 $score%）。',
      };

  String get knowledgeEmptyGraph => switch (language) {
        AppLanguage.vi =>
            'Chưa đủ dữ liệu. Làm vài câu ôn tập hoặc một đề kiểm tra để mở bản đồ.',
        AppLanguage.en =>
            'Not enough data. Complete reviews or an exam to unlock the map.',
        AppLanguage.ja =>
            'データ不足です。復習やテストを受けてマップをアンロックしましょう。',
      };

  String srsLevelLabel(int level) => switch (language) {
        AppLanguage.vi => switch (level) {
            0 => 'Mới',
            1 => 'Học 1',
            2 => 'Học 2',
            3 => 'Học 3',
            4 => 'Ôn 1',
            5 => 'Ôn 2',
            6 => 'Ôn 3',
            7 => 'Thành thạo',
            _ => 'Cấp $level',
          },
        AppLanguage.en => switch (level) {
            0 => 'New',
            1 => 'Learn 1',
            2 => 'Learn 2',
            3 => 'Learn 3',
            4 => 'Review 1',
            5 => 'Review 2',
            6 => 'Review 3',
            7 => 'Mastered',
            _ => 'Level $level',
          },
        AppLanguage.ja => switch (level) {
            0 => '新規',
            1 => '学習 1',
            2 => '学習 2',
            3 => '学習 3',
            4 => '復習 1',
            5 => '復習 2',
            6 => '復習 3',
            7 => '習得済み',
            _ => 'レベル $level',
          },
      };

  // Topic Learning & Playground / Mini Games
  String get playgroundTitle => switch (language) {
        AppLanguage.vi => 'Kitsune Playground',
        AppLanguage.en => 'Kitsune Playground',
        AppLanguage.ja => 'きつねの遊び場',
      };

  String get gameBubbleTitle => switch (language) {
        AppLanguage.vi => 'Bong bóng từ vựng',
        AppLanguage.en => 'Vocab Bubbles',
        AppLanguage.ja => '単語バブル',
      };

  String get gameBubbleSubtitle => switch (language) {
        AppLanguage.vi => '60 giây · sai trừ 2 giây',
        AppLanguage.en => '60 seconds · -2s per penalty',
        AppLanguage.ja => '60秒 · 誤答で-2秒',
      };

  String get gameKanaTitle => switch (language) {
        AppLanguage.vi => 'Kéo từ thành nghĩa',
        AppLanguage.en => 'Match Word to Meaning',
        AppLanguage.ja => '単語と意味をマッチ',
      };

  String get gameKanaSubtitle => switch (language) {
        AppLanguage.vi => 'Nối kana thành cách đọc',
        AppLanguage.en => 'Connect kana into readings',
        AppLanguage.ja => 'かなを繋げて読み方に',
      };

  String get gameMemoryTitle => switch (language) {
        AppLanguage.vi => 'Siêu trí nhớ',
        AppLanguage.en => 'Memory Match',
        AppLanguage.ja => '神経衰弱',
      };

  String get gameMemorySubtitle => switch (language) {
        AppLanguage.vi => '10 cặp · 90 giây',
        AppLanguage.en => '10 pairs · 90 seconds',
        AppLanguage.ja => '10組 · 90秒',
      };

  String get gameListeningTitle => switch (language) {
        AppLanguage.vi => 'Nghe đoán từ',
        AppLanguage.en => 'Listen & Guess',
        AppLanguage.ja => 'リスニング当て',
      };

  String get gameListeningSubtitle => switch (language) {
        AppLanguage.vi => 'Nghe và chọn nghĩa',
        AppLanguage.en => 'Listen and pick the meaning',
        AppLanguage.ja => '音声を聴いて意味を選択',
      };

  String get gameShiritoriTitle => switch (language) {
        AppLanguage.vi => 'Nối từ với máy',
        AppLanguage.en => 'Shiritori vs Bot',
        AppLanguage.ja => 'きつねとしりとり',
      };

  String get gameShiritoriSubtitle => switch (language) {
        AppLanguage.vi => '10 giây mỗi lượt · nhập bằng Kanji',
        AppLanguage.en => '10s per turn · type with Kanji',
        AppLanguage.ja => '各ターン10秒 · 漢字で入力',
      };

  String get pointsUnit => switch (language) {
        AppLanguage.vi => 'điểm',
        AppLanguage.en => 'pts',
        AppLanguage.ja => '点',
      };

  String get correctWord => switch (language) {
        AppLanguage.vi => 'đúng',
        AppLanguage.en => 'correct',
        AppLanguage.ja => '正解',
      };

  String get wrongWord => switch (language) {
        AppLanguage.vi => 'sai',
        AppLanguage.en => 'wrong',
        AppLanguage.ja => '不正解',
      };

  String get chooseAnotherGame => switch (language) {
        AppLanguage.vi => 'Chọn trò khác',
        AppLanguage.en => 'Choose another game',
        AppLanguage.ja => '他のゲームを選ぶ',
      };

  String get clear => switch (language) {
        AppLanguage.vi => 'Xóa',
        AppLanguage.en => 'Clear',
        AppLanguage.ja => 'クリア',
      };

  String get check => switch (language) {
        AppLanguage.vi => 'Kiểm tra',
        AppLanguage.en => 'Check',
        AppLanguage.ja => '判定',
      };

  String get startsWith => switch (language) {
        AppLanguage.vi => 'Bắt đầu bằng',
        AppLanguage.en => 'Starts with',
        AppLanguage.ja => '先頭文字：',
      };

  String get you => switch (language) {
        AppLanguage.vi => 'Bạn',
        AppLanguage.en => 'You',
        AppLanguage.ja => 'あなた',
      };

  String get kitsuneThinking => switch (language) {
        AppLanguage.vi => 'Kitsune đang nghĩ…',
        AppLanguage.en => 'Kitsune is thinking…',
        AppLanguage.ja => 'きつねが考え中…',
      };

  String secondsRemaining(int sec) => switch (language) {
        AppLanguage.vi => 'Bạn còn $sec giây',
        AppLanguage.en => '$sec seconds left',
        AppLanguage.ja => '残り $sec 秒',
      };

  String get shiritoriInputHint => switch (language) {
        AppLanguage.vi => 'Nhập từ bằng Kanji…',
        AppLanguage.en => 'Enter word in Kanji…',
        AppLanguage.ja => '漢字で単語を入力…',
      };

  String get shiritoriInsufficientData => switch (language) {
        AppLanguage.vi => 'Kho từ chưa đủ dữ liệu Kanji.',
        AppLanguage.en => 'Insufficient Kanji vocabulary in database.',
        AppLanguage.ja => '語彙データ内の漢字が不足しています。',
      };

  String get shiritoriMustContainKanji => switch (language) {
        AppLanguage.vi => 'Hãy nhập một từ có Kanji.',
        AppLanguage.en => 'Please enter a word containing Kanji.',
        AppLanguage.ja => '漢字を含む単語を入力してください。',
      };

  String get shiritoriNotInDictOrUsed => switch (language) {
        AppLanguage.vi => 'Từ không có trong kho hoặc đã được dùng.',
        AppLanguage.en => 'Word not found or already used.',
        AppLanguage.ja => '辞書にないか、既に使用された単語です。',
      };

  String shiritoriMustStartWith(String char) => switch (language) {
        AppLanguage.vi => 'Từ phải bắt đầu bằng “$char”.',
        AppLanguage.en => 'Word must start with "$char".',
        AppLanguage.ja => '単語は「$char」で始まる必要があります。',
      };

  String get listenAndPickMeaning => switch (language) {
        AppLanguage.vi => 'Nghe và chọn nghĩa đúng',
        AppLanguage.en => 'Listen and pick the correct meaning',
        AppLanguage.ja => '音声を聴いて正しい意味を選択',
      };

  String get findWordForMeaning => switch (language) {
        AppLanguage.vi => 'Tìm từ có nghĩa',
        AppLanguage.en => 'Find the word with meaning',
        AppLanguage.ja => '意味に一致する単語を見つける',
      };

  String get syncProgressFailed => switch (language) {
        AppLanguage.vi => 'Chưa thể đồng bộ tiến độ. Lượt tiếp theo sẽ thử lại.',
        AppLanguage.en => 'Could not sync progress. Will retry next session.',
        AppLanguage.ja => '進捗を同期できませんでした。次回再試行します。',
      };

  String get topicLoadError => switch (language) {
        AppLanguage.vi => 'Không thể tải chủ đề. Hãy thử lại sau.',
        AppLanguage.en => 'Failed to load topics. Please try again later.',
        AppLanguage.ja => 'トピックを読み込めませんでした。後ほど再試行してください。',
      };
}
