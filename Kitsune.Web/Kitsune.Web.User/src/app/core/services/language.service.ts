// frontend/Kitsune.Web.User/src/app/core/services/language.service.ts
import { Injectable, signal, computed } from '@angular/core';

export type AppLanguage = 'vi' | 'en' | 'ja';

export interface LanguageOption {
  code: AppLanguage;
  displayName: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'vi', displayName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', displayName: 'English', flag: '🇺🇸' },
  { code: 'ja', displayName: '日本語', flag: '🇯🇵' },
];

export interface AppTranslation {
  // Legacy top-level keys for backward compatibility
  homeTitle: string;
  home: string;
  lookup: string;
  topics: string;
  review: string;
  quizzes: string;
  exams: string;
  community: string;
  leaderboard: string;
  minigames: string;
  profile: string;
  searchPlaceholder: string;
  searching: string;
  searchResults: string;
  items: string;
  noResults: string;
  dueCards: string;
  accountSettings: string;
  profileAndAvatar: string;
  logout: string;
  displayLanguage: string;

  // Structured Namespaces
  common: {
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    retry: string;
    close: string;
    back: string;
    confirm: string;
    search: string;
    loading: string;
    noData: string;
    all: string;
    filter: string;
    sort: string;
    share: string;
    bookmark: string;
    detail: string;
    viewAll: string;
    days: string;
    hours: string;
    minutes: string;
    today: string;
  };

  homePage: {
    greetingEyebrow: string;
    greetingPrefix: string;
    greetingSub: string;
    consecutiveDays: string;
    todayRitualKicker: string;
    reviewReadyTitle: string;
    newReadyTitle: string;
    reviewReadySub: string;
    newReadySub: string;
    todayProgress: string;
    cardsTouched: string;
    startReviewBtn: string;
    learnNewBtn: string;
    weekRhythm: string;
    past7Days: string;
    onlyKitsuneTime: string;
    priorityNow: string;
    reviewDueAction: string;
    srsWaiting: string;
    continuePath: string;
    learnLesson: string;
    followRoadmap: string;
    quickWarmup: string;
    quiz5Min: string;
    checkRecall: string;
    achievements: string;
    yourRhythm: string;
    totalXp: string;
    todayGoal: string;
    habitQuote: string;
    communityChallenge: string;
    steadyProgress: string;
    challengeDesc: string;
    joinChallenge: string;
  };

  vocab: {
    searchPlaceholder: string;
    allLevels: string;
    bookmarksOnly: string;
    allFolders: string;
    resultsCount: string;
    noResults: string;
    addToSrs: string;
    addedToSrs: string;
    inSrs: string;
    bookmark: string;
    bookmarked: string;
    meaning: string;
    meaningLabel: string;
    readings: string;
    examples: string;
    kanjiComponents: string;
    addToFolder: string;
    comments: string;
    onyomi: string;
    kunyomi: string;
    hanViet: string;
    emptyTitle: string;
    emptySubtitle: string;
    noResultTitle: string;
    noResultSubtitle: string;
    additionalInfo: string;
    actions: string;
    selectToView: string;
    kanjiSplit: string;
    touchEachStroke: string;
    charactersForming: string;
    viewReadingsRadical: string;
    kanaOnlyNote: string;
    railTip: string;
    railPlaceholder: string;
    kanjiModalLoading: string;
    strokeCount: string;
    strokesUnit: string;
    radical: string;
    mnemonic: string;
    audioTitle: string;
    pronounce: string;
    viewDetails: string;
    folderBadge: string;
  };

  kanji: {
    searchPlaceholder: string;
    strokes: string;
    radical: string;
    onyomi: string;
    kunyomi: string;
    hanViet: string;
    practiceWriting: string;
    clearCanvas: string;
    strokeOrder: string;
    components: string;
    examples: string;
    searchRadical: string;
    noResultTitle: string;
    noResultSubtitle: string;
    todaySuggestions: string;
    searchResults: string;
    selectToView: string;
    strokeOrderHint: string;
    replayStroke: string;
    drawingStrokes: string;
    unselected: string;
  };

  grammar: {
    searchPlaceholder: string;
    level: string;
    structure: string;
    explanation: string;
    examples: string;
    allLevels: string;
    loading: string;
    noResults: string;
    foundCount: string;
    examplesCount: string;
    noExamples: string;
    selectToView: string;
  };

  topicsPage: {
    roadmapTitle: string;
    roadmapSub: string;
    lessons: string;
    progress: string;
    start: string;
    continueText: string;
    completed: string;
    estimatedMinutes: string;
    studyHeader: string;
    quickPractice: string;
    currentTopics: string;
    noPublishedTopics: string;
    allLevels: string;
    loadingRoadmap: string;
    items: string;
    noLessons: string;
    preparingLesson: string;
    lessonWord: string;
    lessonCompleted: string;
    completedSummary: string;
    learned: string;
    duration: string;
    savingProgress: string;
    progressSaved: string;
    syncError: string;
    retrySave: string;
    backToRoadmap: string;
    completeLesson: string;
    noLessonContent: string;
  };

  srsPage: {
    title: string;
    dueNotice: string;
    startReview: string;
    allDoneTitle: string;
    allDoneSub: string;
    showAnswer: string;
    again: string;
    hard: string;
    good: string;
    easy: string;
    nextReview: string;
    globalSrs: string;
    cardsDueToday: string;
    levelDistribution: string;
    cardsFromAllLearned: string;
    needReview: string;
    mastered: string;
    cards: string;
    hideLevelDetails: string;
    showLevelDetails: string;
    learnedCount: string;
    masteredCount: string;
    completedTodayGoal: string;
    timeUntilNextReview: string;
    noFolderHint: string;
    accuracy: string;
    howManyNewWords: string;
    newWordsNotice: string;
    newWords: string;
    allNewWords: string;
    todayRhythm: string;
    learnedSoFar: string;
    flipCard: string;
    finishSession: string;
  };

  quizPage: {
    allQuizzes: string;
    myQuizzes: string;
    createQuiz: string;
    play: string;
    question: string;
    submit: string;
    result: string;
    retake: string;
    score: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    resultsCount: string;
    ofQuizzes: string;
    emptyTitle: string;
    emptyDesc: string;
    noResultTitle: string;
    noResultDesc: string;
    clearSearch: string;
    noDescription: string;
    startQuiz: string;
    questionsUnit: string;
    unlimitedTime: string;
    noQuestions: string;
    start: string;
    preparing: string;
    exit: string;
    questionCounter: string;
    correct: string;
    wrong: string;
    fillPlaceholder: string;
    answer: string;
    nextQuestion: string;
    viewResult: string;
    completed: string;
    back: string;
  };

  examPage: {
    allExams: string;
    duration: string;
    minutes: string;
    startExam: string;
    submitExam: string;
    confirmSubmit: string;
    passed: string;
    failed: string;
    score: string;
    reviewAnswers: string;
    timeRemaining: string;
    title: string;
    subtitle: string;
    myExams: string;
    createExam: string;
    searchPlaceholder: string;
    allLevels: string;
    emptyTitle: string;
    emptyDesc: string;
    createFirst: string;
    foundPublic: string;
    questionsUnit: string;
    noDescription: string;
    start: string;
    loading: string;
    backToList: string;
    exit: string;
    answered: string;
    questionNum: string;
    orderHint: string;
    clearOrder: string;
    prevQuestion: string;
    nextQuestion: string;
    submitting: string;
    loadingResult: string;
    completed: string;
    accuracy: string;
    correctAnswers: string;
    wrongAnswers: string;
    timeSpent: string;
    retake: string;
    otherExams: string;
    showAll: string;
    showOnlyWrong: string;
    reviewDetail: string;
    allCorrectMessage: string;
    yourChoice: string;
    correctAnswer: string;
    explanation: string;
  };

  leaderboardPage: {
    title: string;
    subtitle: string;
    weeklyXp: string;
    streakRank: string;
    rank: string;
    learner: string;
    yourRank: string;
    xp: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
    attempts: string;
    fullTable: string;
    quizzesDone: string;
    avgAccuracy: string;
    lastAttempt: string;
  };

  postsPage: {
    title: string;
    subtitle: string;
    createPost: string;
    writeComment: string;
    comments: string;
    allPosts: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
    createFirst: string;
    viewMore: string;
    backToForum: string;
    like: string;
    share: string;
    attachedQuiz: string;
    modalTitle: string;
    postTitleLabel: string;
    postTitlePlaceholder: string;
    postContentLabel: string;
    postContentPlaceholder: string;
    imageLabel: string;
    publishBtn: string;
    cancelBtn: string;
    sendComment: string;
    deleting: string;
    deletePost: string;
    deleteComment: string;
  };

  profilePage: {
    title: string;
    accountInfo: string;
    studyStats: string;
    knowledgeMap: string;
    appSettings: string;
    displayLanguage: string;
    termsOfService: string;
    logout: string;
    editProfile: string;
    fullName: string;
    email: string;
    role: string;
    streak: string;
    totalXp: string;
    srsDue: string;
    tabInfo: string;
    tabAvatar: string;
    tabFolders: string;
    tabStats: string;
    tabSettings: string;
    verified: string;
    unverified: string;
    username: string;
    status: string;
    saveChanges: string;
    saving: string;
    vocabLearned: string;
    kanjiLearned: string;
    quizzesTaken: string;
    avatarHint1: string;
    avatarHint2: string;
    removeAvatar: string;
    myFolders: string;
    foldersDesc: string;
    viewAllFolders: string;
    overview: string;
    consecutiveDays: string;
    totalReviews: string;
    accuracyRate: string;
    boxDistribution: string;
    noCardsHint: string;
    mostWrong: string;
    noWrongHint: string;
    wrongCountUnit: string;
    accuracyTrend: string;
    noTrendHint: string;
    interfaceTheme: string;
    lightTheme: string;
    darkTheme: string;
    viewTerms: string;
    emailVerification: string;
    dangerZone: string;
    dangerDesc: string;
    logoutAllDevices: string;
    close: string;
  };

  authPage: {
    loginTitle: string;
    loginSubtitle: string;
    heroTitle: string;
    heroSubtitle: string;
    featureEffective: string;
    featureEffectiveDesc: string;
    featureProgress: string;
    featureProgressDesc: string;
    quoteTranslation: string;
    tabLogin: string;
    tabRegister: string;
    loginFieldLabel: string;
    loginFieldPlaceholder: string;
    loginFieldError: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordError: string;
    forgotPasswordLink: string;
    rememberMe: string;
    submitLogin: string;
    submittingLogin: string;
    orContinueWith: string;
    continueGoogle: string;
    continueFacebook: string;
    securityNote: string;
    registerTitle: string;
    registerSubtitle: string;
    registerHeroTitle: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    registerPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    passwordMismatch: string;
    agreeTermsPrefix: string;
    termsOfService: string;
    submitRegister: string;
    submittingRegister: string;
    orRegisterWith: string;
    forgotTitle: string;
    forgotSubtitle: string;
    forgotHeroTitle: string;
    forgotHeroSub: string;
    sendLink: string;
    sendLinkDesc: string;
    accountSec: string;
    accountSecDesc: string;
    submitForgot: string;
    submittingForgot: string;
    backToLogin: string;
    spamCheckNote: string;
  };

  foldersPage: {
    kicker: string;
    title: string;
    subtitle: string;
    createFolder: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
    createFirst: string;
    vocabUnit: string;
    public: string;
    private: string;
    options: string;
    rename: string;
    delete: string;
    open: string;
    noDesc: string;
    modalCreateTitle: string;
    modalRenameTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    publicLabel: string;
    creating: string;
    create: string;
    saving: string;
    save: string;
    allFolders: string;
    searchFolder: string;
    radical: string;
    unselected: string;
    searchRadical: string;
    mentionsUnit: string;
    emptyFolder: string;
  };

  minigamesPage: {
    backToRoadmap: string;
    heroTitle: string;
    heroSub: string;
    playNow: string;
    preparing: string;
    exit: string;
    score: string;
    findMeaning: string;
    matchReading: string;
    undo: string;
    check: string;
    matchKanjiHira: string;
    pairs: string;
    listenPrompt: string;
    listenHint: string;
    shiritoriTitle: string;
    shiritoriReq: string;
    shiritoriTurn: string;
    seconds: string;
    shiritoriInputPh: string;
    shiritoriBtn: string;
    correct: string;
    wrong: string;
    playAgain: string;
    chooseOther: string;
    correctUnit: string;
    wrongUnit: string;
  };

  myQuizzesPage: {
    title: string;
    subtitle: string;
    createQuiz: string;
    searchPlaceholder: string;
    loading: string;
    showing: string;
    of: string;
    emptyTitle: string;
    emptyDesc: string;
    createFirst: string;
    noResultsTitle: string;
    noResultsDesc: string;
    clearSearch: string;
    attempts: string;
    public: string;
    private: string;
    startQuiz: string;
    dialogTitle: string;
    dialogDesc: string;
    dialogCancel: string;
    dialogDanger: string;
    deleting: string;
  };

  myExamsPage: {
    title: string;
    subtitle: string;
    explore: string;
    createBtn: string;
    loading: string;
    emptyTitle: string;
    emptyDesc: string;
    createFirst: string;
    statusPublic: string;
    statusHidden: string;
    questionsCount: string;
    tryPlay: string;
    hide: string;
    publish: string;
    delete: string;
    dialogTitle: string;
    dialogDesc: string;
    dialogCancel: string;
    dialogConfirm: string;
  };

  messagesPage: {
    inDevelopment: string;
    heading: string;
    subheading: string;
    description: string;
    featPrivate: string;
    featGroup: string;
    featRealtime: string;
    releaseLabel: string;
  };
}

const TRANSLATIONS: Record<AppLanguage, AppTranslation> = {
  vi: {
    homeTitle: 'Tổng quan',
    home: 'Tổng quan',
    lookup: 'Tra cứu',
    topics: 'Học tập',
    review: 'Ôn tập',
    quizzes: 'Quizzes',
    exams: 'Đề kiểm tra',
    community: 'Cộng đồng',
    leaderboard: 'Bảng xếp hạng',
    minigames: 'Minigame',
    profile: 'Tài khoản',
    searchPlaceholder: 'Tìm bài viết, quiz, từ vựng, kanji...',
    searching: 'Đang tìm trong Kitsune…',
    searchResults: 'Kết quả trong Kitsune',
    items: 'mục',
    noResults: 'Không tìm thấy nội dung phù hợp.',
    dueCards: 'thẻ chờ',
    accountSettings: 'Cài đặt tài khoản',
    profileAndAvatar: 'Thông tin & ảnh đại diện',
    logout: 'Đăng xuất',
    displayLanguage: 'Ngôn ngữ hiển thị',

    common: {
      save: 'Lưu',
      cancel: 'Hủy',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      retry: 'Thử lại',
      close: 'Đóng',
      back: 'Quay lại',
      confirm: 'Xác nhận',
      search: 'Tìm kiếm',
      loading: 'Đang tải...',
      noData: 'Chưa có dữ liệu',
      all: 'Tất cả',
      filter: 'Bộ lọc',
      sort: 'Sắp xếp',
      share: 'Chia sẻ',
      bookmark: 'Lưu',
      detail: 'Chi tiết',
      viewAll: 'Xem tất cả',
      days: 'ngày',
      hours: 'giờ',
      minutes: 'phút',
      today: 'Hôm nay',
    },

    homePage: {
      greetingEyebrow: 'Nghi thức học tập hôm nay',
      greetingPrefix: 'Chào',
      greetingSub: 'Chỉ cần một phiên ngắn để viết tiếp hành trình tiếng Nhật của bạn.',
      consecutiveDays: 'ngày liên tiếp',
      todayRitualKicker: 'Hành trình hôm nay',
      reviewReadyTitle: 'Một bước để giữ nhịp học',
      newReadyTitle: 'Bạn đã sẵn sàng cho điều mới',
      reviewReadySub: 'thẻ đang chờ bạn quay lại.',
      newReadySub: 'Không còn thẻ đến hạn — hãy mở một bài học mới.',
      todayProgress: 'Tiến độ hôm nay',
      cardsTouched: 'thẻ đã chạm',
      startReviewBtn: 'Ôn tập ngay',
      learnNewBtn: 'Mở bài học mới',
      weekRhythm: 'Nhịp học',
      past7Days: '7 ngày vừa qua',
      onlyKitsuneTime: 'Chỉ tính thời gian bạn đang học trên Kitsune.',
      priorityNow: 'Ưu tiên ngay',
      reviewDueAction: 'Ôn thẻ',
      srsWaiting: 'SRS đang chờ bạn',
      continuePath: 'Tiếp nối',
      learnLesson: 'Học một bài',
      followRoadmap: 'Đi theo lộ trình của bạn',
      quickWarmup: 'Khởi động nhanh',
      quiz5Min: 'Quiz 5 phút',
      checkRecall: 'Kiểm tra điều vừa nhớ',
      achievements: 'Thành quả',
      yourRhythm: 'Nhịp của bạn',
      totalXp: 'Tổng XP',
      todayGoal: 'Mục tiêu hôm nay',
      habitQuote: 'Mỗi phiên học ngắn đều tích luỹ thành phản xạ lâu dài.',
      communityChallenge: 'Thử thách cộng đồng',
      steadyProgress: 'Học đều — tiến xa',
      challengeDesc: 'Hoàn thành một quiz hôm nay để tham gia bảng xếp hạng tuần.',
      joinChallenge: 'Tham gia thử thách',
    },

    vocab: {
      searchPlaceholder: 'Tìm theo từ vựng, kana, romaji, nghĩa...',
      allLevels: 'Tất cả cấp độ',
      bookmarksOnly: 'Đã lưu',
      allFolders: 'Tất cả thư mục',
      resultsCount: 'Kết quả ({count})',
      noResults: 'Không tìm thấy từ vựng phù hợp.',
      addToSrs: 'Thêm vào SRS',
      addedToSrs: 'Đã thêm vào Ôn tập',
      inSrs: 'Đã có trong SRS',
      bookmark: 'Yêu thích',
      bookmarked: 'Đã yêu thích',
      meaning: 'Ý nghĩa',
      meaningLabel: 'Nghĩa',
      readings: 'Cách đọc',
      examples: 'Câu ví dụ',
      kanjiComponents: 'Thành phần Kanji',
      addToFolder: 'Thêm vào thư mục',
      comments: 'Bình luận',
      onyomi: 'Âm On (音読み)',
      kunyomi: 'Âm Kun (訓読み)',
      hanViet: 'Hán Việt',
      emptyTitle: 'Tra cứu từ vựng',
      emptySubtitle: 'Nhập từ khóa để tìm kiếm trong kho từ vựng tiếng Nhật',
      noResultTitle: 'Không tìm thấy kết quả',
      noResultSubtitle: 'Thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả',
      additionalInfo: 'Thông tin thêm',
      actions: 'Hành động',
      selectToView: 'Chọn một từ vựng để xem chi tiết',
      kanjiSplit: 'TÁCH KANJI',
      touchEachStroke: 'Chạm từng nét nghĩa',
      charactersForming: 'Những ký tự tạo nên',
      viewReadingsRadical: 'Xem âm đọc và bộ thủ',
      kanaOnlyNote: 'Từ này được viết bằng kana, không có Kanji cần tách.',
      railTip: 'Bài học của bạn quyết định nội dung được đưa vào phiên ôn tập.',
      railPlaceholder: 'Kết quả bạn chọn sẽ mở thành phần Kanji tại đây.',
      kanjiModalLoading: 'Đang tải thông tin Kanji...',
      strokeCount: 'Số nét',
      strokesUnit: 'nét',
      radical: 'Bộ thủ (部首)',
      mnemonic: 'Cách ghi nhớ',
      audioTitle: 'Nghe cách đọc',
      pronounce: 'Phát âm',
      viewDetails: 'Mở chi tiết',
      folderBadge: 'Từ vựng',
    },

    kanji: {
      searchPlaceholder: 'Tìm chữ Hán, âm Hán Việt, On, Kun...',
      strokes: 'nét',
      radical: 'Bộ thủ',
      onyomi: 'Âm On',
      kunyomi: 'Âm Kun',
      hanViet: 'Âm Hán Việt',
      practiceWriting: 'Luyện viết chữ Hán',
      clearCanvas: 'Xóa nét',
      strokeOrder: 'Thứ tự nét',
      components: 'Bộ phận cấu thành',
      examples: 'Từ vựng chứa chữ này',
      searchRadical: 'Tìm bộ thủ...',
      noResultTitle: 'Không tìm thấy Kanji phù hợp',
      noResultSubtitle: 'Thử nhập một chữ Kanji, âm Hán Việt hoặc nghĩa ngắn hơn.',
      todaySuggestions: 'Gợi ý hôm nay',
      searchResults: 'Kết quả tìm kiếm',
      selectToView: 'Chọn một Kanji để xem chi tiết',
      strokeOrderHint: 'Từng nét được vẽ chậm để dễ quan sát.',
      replayStroke: 'Phát lại nét viết',
      drawingStrokes: 'Đang dựng nét viết...',
      unselected: 'Chưa chọn',
    },

    grammar: {
      searchPlaceholder: 'Tìm kiếm mẫu ngữ pháp, cấu trúc...',
      level: 'Cấp độ',
      structure: 'Cấu trúc',
      explanation: 'Giải thích',
      examples: 'Câu ví dụ minh họa',
      allLevels: 'Tất cả cấp độ',
      loading: 'Đang tải ngữ pháp...',
      noResults: 'Không tìm thấy ngữ pháp phù hợp.',
      foundCount: 'Tìm thấy {count} mẫu ngữ pháp',
      examplesCount: 'Ví dụ ({count})',
      noExamples: 'Chưa có ví dụ cho mẫu ngữ pháp này.',
      selectToView: 'Chọn một mẫu ngữ pháp để xem chi tiết.',
    },

    topicsPage: {
      roadmapTitle: 'Lộ trình bài học',
      roadmapSub: 'Chọn một chủ đề và học theo từng bài để giữ mạch kiến thức.',
      lessons: 'bài học',
      progress: 'Tiến độ',
      start: 'Bắt đầu',
      continueText: 'Tiếp tục',
      completed: 'Đã hoàn thành',
      estimatedMinutes: 'phút ước tính',
      studyHeader: 'Học tập',
      quickPractice: 'Luyện nhanh',
      currentTopics: 'Chủ đề đang học',
      noPublishedTopics: 'Chưa có chủ đề được xuất bản.',
      allLevels: 'Mọi trình độ',
      loadingRoadmap: 'Đang mở lộ trình bài học…',
      items: 'mục học',
      noLessons: 'Chủ đề này chưa có bài học.',
      preparingLesson: 'Đang chuẩn bị bài học…',
      lessonWord: 'Bài',
      lessonCompleted: 'Bài học đã hoàn thành',
      completedSummary: 'Bạn đã đi qua tất cả mục học. Từ vựng sẽ sẵn sàng cho các lượt ôn tập tiếp theo.',
      learned: 'Đã học',
      duration: 'Thời lượng',
      savingProgress: 'Đang lưu tiến độ của bạn…',
      progressSaved: 'Tiến độ đã được lưu.',
      syncError: 'Chưa thể đồng bộ lúc này. Bạn có thể thử lưu lại.',
      retrySave: 'Thử lưu lại',
      backToRoadmap: 'Quay về lộ trình',
      completeLesson: 'Hoàn thành bài học',
      noLessonContent: 'Bài học chưa có nội dung.',
    },

    srsPage: {
      title: 'Ôn tập ngắt quãng (SRS)',
      dueNotice: 'thẻ đang chờ bạn ôn tập hôm nay.',
      startReview: 'Bắt đầu ôn tập',
      allDoneTitle: 'Tuyệt vời! Bạn đã hoàn thành hết thẻ hôm nay',
      allDoneSub: 'Hãy nghỉ ngơi hoặc khám phá thêm các từ vựng mới.',
      showAnswer: 'Xem đáp án',
      again: 'Học lại',
      hard: 'Khó',
      good: 'Nhớ tốt',
      easy: 'Dễ',
      nextReview: 'Lần ôn tiếp',
      globalSrs: 'SRS chung',
      cardsDueToday: 'Thẻ cần ôn hôm nay',
      levelDistribution: 'Phân bố cấp độ',
      cardsFromAllLearned: 'thẻ từ tất cả bài đã học',
      needReview: 'cần ôn',
      mastered: 'thành thạo',
      cards: 'thẻ',
      hideLevelDetails: 'Ẩn chi tiết từng cấp',
      showLevelDetails: 'Xem chi tiết từng cấp',
      learnedCount: 'đã học',
      masteredCount: 'thành thạo',
      completedTodayGoal: 'Bạn đã hoàn thành mục tiêu hôm nay!',
      timeUntilNextReview: 'Thời gian đến lượt ôn tiếp',
      noFolderHint: 'Học từ một Lesson để thêm thẻ vào SRS chung',
      accuracy: 'Độ chính xác',
      howManyNewWords: 'Hôm nay bạn muốn học bao nhiêu từ mới?',
      newWordsNotice: 'Thẻ đến hạn luôn được ôn riêng và không trừ vào số từ mới.',
      newWords: 'từ mới',
      allNewWords: 'Tất cả từ mới',
      todayRhythm: 'NHỊP HỌC HÔM NAY',
      learnedSoFar: 'từ mới đã học',
      flipCard: 'Lật thẻ',
      finishSession: 'Kết thúc phiên ôn',
    },

    quizPage: {
      allQuizzes: 'Tất cả Quiz',
      myQuizzes: 'Quiz của tôi',
      createQuiz: 'Tạo Quiz mới',
      play: 'Làm Quiz',
      question: 'Câu hỏi',
      submit: 'Nộp bài',
      result: 'Kết quả Quiz',
      retake: 'Làm lại',
      score: 'Điểm số',
      title: 'Khám Phá Quiz',
      subtitle: 'Luyện tập tiếng Nhật với các bài kiểm tra công khai',
      searchPlaceholder: 'Tìm kiếm quiz theo tên, mô tả, người tạo...',
      resultsCount: 'Hiển thị',
      ofQuizzes: 'quiz',
      emptyTitle: 'Chưa có quiz nào',
      emptyDesc: 'Hiện tại chưa có quiz công khai nào. Hãy quay lại sau nhé!',
      noResultTitle: 'Không tìm thấy quiz',
      noResultDesc: 'Không có quiz nào khớp với',
      clearSearch: 'Xóa tìm kiếm',
      noDescription: 'Không có mô tả',
      startQuiz: 'Làm bài →',
      questionsUnit: 'câu hỏi',
      unlimitedTime: 'Không giới hạn thời gian',
      noQuestions: 'Quiz này chưa có câu hỏi nào. Vui lòng liên hệ người tạo.',
      start: 'Bắt đầu',
      preparing: 'Đang chuẩn bị...',
      exit: 'Thoát',
      questionCounter: 'Câu',
      correct: 'Đúng! Xuất sắc!',
      wrong: 'Sai! Đáp án đúng:',
      fillPlaceholder: 'Nhập câu trả lời...',
      answer: 'Trả lời',
      nextQuestion: 'Câu tiếp theo →',
      viewResult: 'Xem kết quả →',
      completed: 'Hoàn thành quiz!',
      back: 'Quay lại',
    },

    examPage: {
      allExams: 'Danh sách đề kiểm tra',
      duration: 'Thời gian',
      minutes: 'phút',
      startExam: 'Bắt đầu thi',
      submitExam: 'Nộp bài thi',
      confirmSubmit: 'Bạn có chắc chắn muốn nộp bài thi ngay?',
      passed: 'ĐẠT (PASS)',
      failed: 'CHƯA ĐẠT (FAIL)',
      score: 'Điểm số',
      reviewAnswers: 'Xem lại bài làm',
      timeRemaining: 'Thời gian còn lại',
      title: 'Đề kiểm tra',
      subtitle: 'Luyện thi JLPT với các đề do cộng đồng chia sẻ',
      myExams: 'Đề của tôi',
      createExam: '+ Tạo đề',
      searchPlaceholder: 'Tìm đề theo tên...',
      allLevels: 'Tất cả',
      emptyTitle: 'Chưa có đề nào',
      emptyDesc: 'Hãy là người đầu tiên tạo và chia sẻ một đề kiểm tra cho cộng đồng.',
      createFirst: 'Tạo đề đầu tiên',
      foundPublic: 'Tìm thấy',
      questionsUnit: 'câu',
      noDescription: 'Không có mô tả',
      start: 'Làm bài →',
      loading: 'Đang tải đề...',
      backToList: 'Về danh sách đề',
      exit: 'Thoát',
      answered: 'đã trả lời',
      questionNum: 'Câu',
      orderHint: 'Nhấn vào các thành phần theo thứ tự đúng:',
      clearOrder: 'Xóa lựa chọn',
      prevQuestion: '← Câu trước',
      nextQuestion: 'Câu tiếp →',
      submitting: 'Đang nộp...',
      loadingResult: 'Đang tải kết quả...',
      completed: 'Hoàn thành!',
      accuracy: 'Chính xác',
      correctAnswers: 'Câu đúng',
      wrongAnswers: 'Câu sai',
      timeSpent: 'Thời gian',
      retake: 'Làm lại',
      otherExams: 'Đề khác',
      showAll: 'Hiện tất cả',
      showOnlyWrong: 'Chỉ xem câu sai',
      reviewDetail: 'Xem lại chi tiết',
      allCorrectMessage: '🎉 Tuyệt vời! Không có câu nào sai.',
      yourChoice: 'Bạn chọn',
      correctAnswer: 'Đáp án đúng',
      explanation: 'Giải thích:',
    },

    leaderboardPage: {
      title: 'Bảng xếp hạng',
      subtitle: 'Nhìn nhanh thứ hạng học tập của cộng đồng Kitsune.',
      weeklyXp: 'XP Tuần',
      streakRank: 'Chuỗi ngày',
      rank: 'Hạng',
      learner: 'Người học',
      yourRank: 'Thứ hạng của bạn',
      xp: 'XP',
      loading: 'Đang tải bảng xếp hạng...',
      emptyTitle: 'Chưa có dữ liệu',
      emptyDesc: 'Hãy hoàn thành quiz đầu tiên để lên bảng xếp hạng!',
      attempts: 'lần làm',
      fullTable: 'Bảng xếp hạng đầy đủ',
      quizzesDone: 'Số quiz',
      avgAccuracy: 'Độ chính xác TB',
      lastAttempt: 'Lần cuối',
    },

    postsPage: {
      title: 'Diễn đàn cộng đồng',
      subtitle: 'Chia sẻ kinh nghiệm học tiếng Nhật cùng mọi người',
      createPost: '✏️ Viết bài',
      writeComment: 'Viết bình luận của bạn...',
      comments: 'bình luận',
      allPosts: 'Tất cả bài viết',
      loading: 'Đang tải bài viết...',
      emptyTitle: 'Chưa có bài viết nào',
      emptyDesc: 'Hãy là người đầu tiên chia sẻ!',
      createFirst: 'Viết bài đầu tiên',
      viewMore: 'Xem thêm',
      backToForum: 'Quay lại diễn đàn',
      like: 'Thích',
      share: 'Chia sẻ',
      attachedQuiz: 'Quiz đính kèm',
      modalTitle: 'Viết bài mới',
      postTitleLabel: 'Tiêu đề',
      postTitlePlaceholder: 'Nhập tiêu đề bài viết...',
      postContentLabel: 'Nội dung',
      postContentPlaceholder: 'Chia sẻ nội dung của bạn...',
      imageLabel: 'Hình ảnh (tuỳ chọn)',
      publishBtn: 'Đăng bài',
      cancelBtn: 'Hủy',
      sendComment: 'Gửi',
      deleting: 'Đang xóa...',
      deletePost: 'Xóa bài viết',
      deleteComment: 'Xóa bình luận',
    },

    profilePage: {
      title: 'Hồ sơ cá nhân',
      accountInfo: 'Thông tin cá nhân',
      studyStats: 'Thống kê học tập',
      knowledgeMap: 'Bản đồ năng lực',
      appSettings: 'Cài đặt tài khoản',
      displayLanguage: 'Ngôn ngữ hiển thị',
      termsOfService: 'Điều khoản dịch vụ',
      logout: 'Đăng xuất',
      editProfile: 'Chỉnh sửa hồ sơ',
      fullName: 'Họ và tên',
      email: 'Email',
      role: 'Vai trò',
      streak: 'Chuỗi ngày',
      totalXp: 'Tổng XP',
      srsDue: 'SRS đến hạn',
      tabInfo: 'Thông tin',
      tabAvatar: 'Ảnh đại diện',
      tabFolders: 'Thư mục',
      tabStats: 'Thống kê',
      tabSettings: 'Cài đặt',
      verified: 'Đã xác thực',
      unverified: 'Chưa xác thực',
      username: 'Tên đăng nhập',
      status: 'Trạng thái',
      saveChanges: 'Lưu thay đổi',
      saving: 'Đang lưu...',
      vocabLearned: 'Từ vựng đã học',
      kanjiLearned: 'Kanji đã học',
      quizzesTaken: 'Quiz đã làm',
      avatarHint1: 'Nhấn vào ảnh để chọn ảnh mới',
      avatarHint2: 'Định dạng: JPG, PNG, GIF. Kích thước tối đa: 5MB',
      removeAvatar: 'Xóa ảnh đại diện',
      myFolders: 'Thư mục của bạn',
      foldersDesc: 'Quản lý các thư mục từ vựng của bạn',
      viewAllFolders: 'Xem tất cả thư mục',
      overview: 'Tổng quan',
      consecutiveDays: 'Ngày liên tiếp',
      totalReviews: 'Lượt ôn tập',
      accuracyRate: 'Tỷ lệ đúng',
      boxDistribution: 'Phân bố mức độ (Box Level)',
      noCardsHint: 'Chưa có thẻ SRS nào. Hãy thêm từ vựng/kanji vào thư mục và bắt đầu ôn tập.',
      mostWrong: 'Hay sai nhất',
      noWrongHint: 'Chưa có dữ liệu — bạn chưa trả lời sai lần nào gần đây. Tuyệt vời!',
      wrongCountUnit: 'lần sai',
      accuracyTrend: 'Xu hướng độ chính xác (14 ngày gần nhất)',
      noTrendHint: 'Chưa có dữ liệu ôn tập gần đây.',
      interfaceTheme: 'Giao diện',
      lightTheme: '☀️ Sáng',
      darkTheme: '🌙 Tối',
      viewTerms: 'Xem điều khoản dịch vụ',
      emailVerification: 'Xác thực email',
      dangerZone: 'Khu vực nguy hiểm',
      dangerDesc: 'Các hành động dưới đây không thể hoàn tác. Hãy cân nhắc kỹ trước khi thực hiện.',
      logoutAllDevices: 'Đăng xuất khỏi tất cả thiết bị',
      close: 'Đóng',
    },

    authPage: {
      loginTitle: 'Đăng nhập',
      loginSubtitle: 'Chào mừng bạn quay trở lại!',
      heroTitle: 'Học ngôn ngữ thông minh\nCùng Kitsune mỗi ngày',
      heroSubtitle: 'Học từ vựng, Kanji và ngữ pháp với phương pháp khoa học giúp bạn tiến bộ vượt bậc.',
      featureEffective: 'Học hiệu quả',
      featureEffectiveDesc: 'Phương pháp SRS tối ưu trí nhớ',
      featureProgress: 'Theo dõi tiến độ',
      featureProgressDesc: 'Thống kê chi tiết, đánh giá hiệu suất',
      quoteTranslation: 'Kiên trì là sức mạnh.',
      tabLogin: 'Đăng nhập',
      tabRegister: 'Đăng ký',
      loginFieldLabel: 'Email hoặc tên đăng nhập',
      loginFieldPlaceholder: 'Nhập email hoặc tên đăng nhập',
      loginFieldError: 'Vui lòng nhập email hoặc tên đăng nhập.',
      passwordLabel: 'Mật khẩu',
      passwordPlaceholder: 'Nhập mật khẩu',
      passwordError: 'Mật khẩu phải có ít nhất 6 ký tự.',
      forgotPasswordLink: 'Quên mật khẩu?',
      rememberMe: 'Ghi nhớ đăng nhập',
      submitLogin: 'Đăng nhập →',
      submittingLogin: 'Đang đăng nhập...',
      orContinueWith: 'Hoặc đăng nhập với',
      continueGoogle: 'Tiếp tục với Google',
      continueFacebook: 'Tiếp tục với Facebook',
      securityNote: 'Thông tin của bạn được bảo mật tuyệt đối',
      registerTitle: 'Tạo tài khoản',
      registerSubtitle: 'Chào mừng bạn đến với Kitsune!',
      registerHeroTitle: 'Bắt đầu hành trình\nCùng Kitsune ngay hôm nay',
      fullNameLabel: 'Họ và tên',
      fullNamePlaceholder: 'Nhập họ và tên',
      emailLabel: 'Email',
      emailPlaceholder: 'Nhập địa chỉ email',
      usernameLabel: 'Tên đăng nhập',
      usernamePlaceholder: 'Chọn tên đăng nhập',
      registerPasswordPlaceholder: 'Tạo mật khẩu (ít nhất 8 ký tự)',
      confirmPasswordLabel: 'Xác nhận mật khẩu',
      confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
      passwordMismatch: 'Mật khẩu xác nhận không khớp.',
      agreeTermsPrefix: 'Tôi đồng ý với',
      termsOfService: 'Điều khoản dịch vụ',
      submitRegister: 'Tạo tài khoản →',
      submittingRegister: 'Đang tạo tài khoản...',
      orRegisterWith: 'Hoặc đăng ký với',
      forgotTitle: 'Quên mật khẩu',
      forgotSubtitle: 'Chúng tôi sẽ giúp bạn quay lại học ngay.',
      forgotHeroTitle: 'Khôi phục tài khoản\nCùng Kitsune',
      forgotHeroSub: 'Nhập email đã đăng ký, chúng tôi sẽ gửi hướng dẫn giúp bạn đặt lại mật khẩu an toàn.',
      sendLink: 'Gửi liên kết',
      sendLinkDesc: 'Nhận hướng dẫn đặt lại mật khẩu qua email',
      accountSec: 'Bảo mật tài khoản',
      accountSecDesc: 'Quy trình xác minh giúp bảo vệ thông tin của bạn',
      submitForgot: 'Gửi liên kết đặt lại mật khẩu →',
      submittingForgot: 'Đang gửi...',
      backToLogin: 'Quay lại đăng nhập',
      spamCheckNote: 'Không nhận được email? Kiểm tra thư mục Spam hoặc Thư rác.',
    },

    foldersPage: {
      kicker: 'Study Repository',
      title: 'Thư Mục Của Tôi',
      subtitle: 'Quản lý và tổ chức các nhóm từ vựng của bạn theo chủ đề.',
      createFolder: 'Tạo hồ sơ mới',
      loading: 'Đang tải thư mục...',
      emptyTitle: 'Chưa có thư mục nào',
      emptyDesc: 'Hãy tạo thư mục đầu tiên để bắt đầu tổ chức từ vựng của bạn.',
      createFirst: 'Tạo thư mục đầu tiên',
      vocabUnit: 'từ vựng',
      public: 'Công khai',
      private: 'Riêng tư',
      options: 'Tùy chọn',
      rename: 'Đổi tên',
      delete: 'Xóa',
      open: 'Mở',
      noDesc: 'Không có mô tả',
      modalCreateTitle: 'Tạo thư mục mới',
      modalRenameTitle: 'Đổi tên thư mục',
      nameLabel: 'Tên thư mục',
      namePlaceholder: 'Nhập tên thư mục...',
      descLabel: 'Mô tả',
      descPlaceholder: 'Nhập mô tả (tuỳ chọn)...',
      publicLabel: 'Hiển thị công khai',
      creating: 'Đang tạo...',
      create: 'Tạo thư mục',
      saving: 'Đang lưu...',
      save: 'Lưu thay đổi',
      allFolders: '← Tất cả thư mục',
      searchFolder: 'Lọc theo từ, nghĩa, âm Hán Việt hay kanji...',
      radical: 'Bộ thủ:',
      unselected: 'Chưa chọn',
      searchRadical: 'Tìm bộ thủ...',
      mentionsUnit: 'Lượt dùng',
      emptyFolder: 'Thư mục này chưa có từ vựng nào.',
    },

    minigamesPage: {
      backToRoadmap: '← Trở lại lộ trình',
      heroTitle: 'Chơi nhanh. Nhớ thật lâu.',
      heroSub: 'Năm thử thách ngắn, dùng chính kho từ vựng đang học.',
      playNow: 'Chơi ngay →',
      preparing: 'Đang chuẩn bị…',
      exit: '× Thoát',
      score: 'điểm',
      findMeaning: 'Tìm từ có nghĩa',
      matchReading: 'Ghép cách đọc cho',
      undo: 'Xóa một ô',
      check: 'Kiểm tra',
      matchKanjiHira: 'Ghép Kanji và Hiragana',
      pairs: 'cặp',
      listenPrompt: 'Nghe và chọn nghĩa đúng',
      listenHint: 'Chạm để nghe lại',
      shiritoriTitle: 'Nối từ với Kitsune',
      shiritoriReq: 'Từ của bạn phải bắt đầu bằng',
      shiritoriTurn: 'Đến lượt bạn · còn',
      seconds: 'giây',
      shiritoriInputPh: 'Nhập từ bằng Kanji…',
      shiritoriBtn: 'Nối từ',
      correct: 'Chính xác!',
      wrong: 'Chưa đúng — tiếp tục nào.',
      playAgain: 'Chơi lại',
      chooseOther: 'Chọn trò khác',
      correctUnit: 'đúng',
      wrongUnit: 'sai',
    },

    myQuizzesPage: {
      title: 'Quiz Của Tôi',
      subtitle: 'Quản lý tất cả các bài kiểm tra bạn đã tạo',
      createQuiz: 'Tạo quiz',
      searchPlaceholder: 'Tìm kiếm trong quiz của bạn...',
      loading: 'Đang tải quiz của bạn...',
      showing: 'Hiển thị',
      of: 'quiz',
      emptyTitle: 'Bạn chưa tạo quiz nào',
      emptyDesc: 'Hãy tạo bài kiểm tra đầu tiên để chia sẻ với cộng đồng học tiếng Nhật!',
      createFirst: 'Tạo quiz ngay',
      noResultsTitle: 'Không tìm thấy kết quả',
      noResultsDesc: 'Không có quiz nào khớp với',
      clearSearch: 'Xóa tìm kiếm',
      attempts: 'lượt làm',
      public: '🌐 Công khai',
      private: '🔒 Riêng tư',
      startQuiz: 'Làm bài →',
      dialogTitle: 'Xóa quiz?',
      dialogDesc: 'Bạn sắp xóa quiz này. Hành động này không thể hoàn tác.',
      dialogCancel: 'Hủy',
      dialogDanger: 'Xóa vĩnh viễn',
      deleting: 'Đang xóa...',
    },

    myExamsPage: {
      title: 'Đề của tôi',
      subtitle: 'Quản lý các đề kiểm tra bạn đã tạo',
      explore: 'Khám phá đề',
      createBtn: '+ Tạo đề',
      loading: 'Đang tải đề của bạn...',
      emptyTitle: 'Bạn chưa tạo đề nào',
      emptyDesc: 'Tạo đề bằng cách nhập thủ công hoặc import từ file Excel/JSON.',
      createFirst: 'Tạo đề đầu tiên',
      statusPublic: 'Công khai',
      statusHidden: 'Đang ẩn',
      questionsCount: 'câu',
      tryPlay: 'Làm thử',
      hide: 'Ẩn',
      publish: 'Công khai',
      delete: 'Xóa',
      dialogTitle: 'Xóa đề kiểm tra?',
      dialogDesc: 'Đề sẽ bị ẩn khỏi bạn và cộng đồng (xóa mềm). Hành động này không thể tự hoàn tác từ giao diện.',
      dialogCancel: 'Hủy',
      dialogConfirm: 'Xóa đề',
    },

    messagesPage: {
      inDevelopment: 'Đang phát triển',
      heading: 'Tính năng đang phát triển',
      subheading: 'Nhắn tin với cộng đồng sẽ sớm ra mắt',
      description: 'Chúng tôi đang xây dựng một hệ thống nhắn tin thời gian thực để bạn có thể kết nối và giao tiếp với cộng đồng học tiếng Nhật. Hãy đón chờ nhé!',
      featPrivate: 'Tin nhắn riêng tư',
      featGroup: 'Nhóm học tập',
      featRealtime: 'Thời gian thực',
      releaseLabel: 'Dự kiến ra mắt',
    },
  },

  en: {
    homeTitle: 'Overview',
    home: 'Overview',
    lookup: 'Dictionary',
    topics: 'Study',
    review: 'Review',
    quizzes: 'Quizzes',
    exams: 'Mock Tests',
    community: 'Community',
    leaderboard: 'Leaderboard',
    minigames: 'Minigames',
    profile: 'Account',
    searchPlaceholder: 'Search posts, quizzes, words, kanji...',
    searching: 'Searching Kitsune…',
    searchResults: 'Results in Kitsune',
    items: 'items',
    noResults: 'No matching content found.',
    dueCards: 'due cards',
    accountSettings: 'Account Settings',
    profileAndAvatar: 'Profile & Avatar',
    logout: 'Log Out',
    displayLanguage: 'Display Language',

    common: {
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      retry: 'Retry',
      close: 'Close',
      back: 'Back',
      confirm: 'Confirm',
      search: 'Search',
      loading: 'Loading...',
      noData: 'No data available',
      all: 'All',
      filter: 'Filter',
      sort: 'Sort',
      share: 'Share',
      bookmark: 'Bookmark',
      detail: 'Details',
      viewAll: 'View All',
      days: 'days',
      hours: 'hrs',
      minutes: 'mins',
      today: 'Today',
    },

    homePage: {
      greetingEyebrow: "Today's Study Ritual",
      greetingPrefix: 'Hello',
      greetingSub: 'Just a short session to continue your Japanese journey.',
      consecutiveDays: 'days streak',
      todayRitualKicker: "Today's Journey",
      reviewReadyTitle: 'One step to keep your momentum',
      newReadyTitle: 'Ready for something new',
      reviewReadySub: 'cards are waiting for you.',
      newReadySub: 'No cards due — time for a new lesson.',
      todayProgress: "Today's Progress",
      cardsTouched: 'cards touched',
      startReviewBtn: 'Start Review',
      learnNewBtn: 'Open New Lesson',
      weekRhythm: 'Study Rhythm',
      past7Days: 'Past 7 Days',
      onlyKitsuneTime: 'Only counts active study time on Kitsune.',
      priorityNow: 'Priority',
      reviewDueAction: 'Review cards',
      srsWaiting: 'SRS is waiting for you',
      continuePath: 'Continue',
      learnLesson: 'Take a lesson',
      followRoadmap: 'Follow your curriculum',
      quickWarmup: 'Quick Warmup',
      quiz5Min: '5-minute Quiz',
      checkRecall: 'Test what you recall',
      achievements: 'Achievements',
      yourRhythm: 'Your Rhythm',
      totalXp: 'Total XP',
      todayGoal: "Today's Goal",
      habitQuote: 'Short daily sessions build long-lasting reflexes.',
      communityChallenge: 'Community Challenge',
      steadyProgress: 'Steady & Far',
      challengeDesc: 'Complete a quiz today to join the weekly leaderboard.',
      joinChallenge: 'Join Challenge',
    },

    vocab: {
      searchPlaceholder: 'Search by word, kana, romaji, meaning...',
      allLevels: 'All Levels',
      bookmarksOnly: 'Bookmarked',
      allFolders: 'All Folders',
      resultsCount: 'Results ({count})',
      noResults: 'No vocabulary found.',
      addToSrs: 'Add to SRS',
      addedToSrs: 'Added to Review',
      inSrs: 'In SRS',
      bookmark: 'Bookmark',
      bookmarked: 'Bookmarked',
      meaning: 'Meaning',
      meaningLabel: 'Meaning',
      readings: 'Readings',
      examples: 'Example Sentences',
      kanjiComponents: 'Kanji Components',
      addToFolder: 'Add to Folder',
      comments: 'Comments',
      onyomi: "On'yomi (音読み)",
      kunyomi: "Kun'yomi (訓読み)",
      hanViet: 'Sino-Vietnamese',
      emptyTitle: 'Vocabulary Lookup',
      emptySubtitle: 'Enter keywords to search the Japanese vocabulary bank',
      noResultTitle: 'No results found',
      noResultSubtitle: 'Try searching with a different keyword or check spelling',
      additionalInfo: 'Additional Info',
      actions: 'Actions',
      selectToView: 'Select a word to view details',
      kanjiSplit: 'KANJI BREAKDOWN',
      touchEachStroke: 'Touch Each Component',
      charactersForming: 'Characters forming',
      viewReadingsRadical: 'View readings & radicals',
      kanaOnlyNote: 'This word is written in kana with no Kanji components.',
      railTip: 'Your lesson choice determines the items added to reviews.',
      railPlaceholder: 'The selected word will reveal its Kanji components here.',
      kanjiModalLoading: 'Loading Kanji info...',
      strokeCount: 'Strokes',
      strokesUnit: 'strokes',
      radical: 'Radical (部首)',
      mnemonic: 'Mnemonic',
      audioTitle: 'Listen to pronunciation',
      pronounce: 'Pronounce',
      viewDetails: 'View Details',
      folderBadge: 'Vocabulary',
    },

    kanji: {
      searchPlaceholder: 'Search kanji, Sino-Vietnamese, On, Kun...',
      strokes: 'strokes',
      radical: 'Radical',
      onyomi: "On'yomi",
      kunyomi: "Kun'yomi",
      hanViet: 'Sino-Vietnamese Reading',
      practiceWriting: 'Practice Writing Kanji',
      clearCanvas: 'Clear',
      strokeOrder: 'Stroke Order',
      components: 'Components',
      examples: 'Vocabulary with this Kanji',
      searchRadical: 'Search radical...',
      noResultTitle: 'No matching Kanji found',
      noResultSubtitle: 'Try entering a Kanji character, Sino-Vietnamese reading, or shorter meaning.',
      todaySuggestions: "Today's Suggestions",
      searchResults: 'Search Results',
      selectToView: 'Select a Kanji to view details',
      strokeOrderHint: 'Each stroke is drawn slowly for clear observation.',
      replayStroke: 'Replay Stroke Order',
      drawingStrokes: 'Drawing strokes...',
      unselected: 'Not selected',
    },

    grammar: {
      searchPlaceholder: 'Search grammar patterns, structures...',
      level: 'Level',
      structure: 'Structure',
      explanation: 'Explanation',
      examples: 'Example Sentences',
      allLevels: 'All Levels',
      loading: 'Loading grammar...',
      noResults: 'No grammar patterns found.',
      foundCount: 'Found {count} grammar patterns',
      examplesCount: 'Examples ({count})',
      noExamples: 'No examples available for this pattern.',
      selectToView: 'Select a grammar pattern to view details.',
    },

    topicsPage: {
      roadmapTitle: 'Lesson Roadmap',
      roadmapSub: 'Choose a topic and follow each lesson to stay on track.',
      lessons: 'lessons',
      progress: 'Progress',
      start: 'Start',
      continueText: 'Continue',
      completed: 'Completed',
      estimatedMinutes: 'estimated mins',
      studyHeader: 'Learning',
      quickPractice: 'Quick Practice',
      currentTopics: 'Current Topics',
      noPublishedTopics: 'No published topics yet.',
      allLevels: 'All Levels',
      loadingRoadmap: 'Loading lesson roadmap…',
      items: 'items',
      noLessons: 'This topic has no lessons yet.',
      preparingLesson: 'Preparing lesson…',
      lessonWord: 'Lesson',
      lessonCompleted: 'Lesson Completed',
      completedSummary: 'You have gone through all items. Vocabulary is ready for future review rounds.',
      learned: 'Learned',
      duration: 'Duration',
      savingProgress: 'Saving your progress…',
      progressSaved: 'Progress saved successfully.',
      syncError: 'Could not sync at this time. You can retry saving.',
      retrySave: 'Retry Save',
      backToRoadmap: 'Back to Roadmap',
      completeLesson: 'Complete Lesson',
      noLessonContent: 'This lesson has no content.',
    },

    srsPage: {
      title: 'Spaced Repetition (SRS)',
      dueNotice: 'cards waiting for review today.',
      startReview: 'Start Review Session',
      allDoneTitle: 'Great Job! All cards reviewed for today',
      allDoneSub: 'Take a break or explore new vocabulary.',
      showAnswer: 'Show Answer',
      again: 'Again',
      hard: 'Hard',
      good: 'Good',
      easy: 'Easy',
      nextReview: 'Next review',
      globalSrs: 'Global SRS',
      cardsDueToday: 'Cards Due Today',
      levelDistribution: 'Level Distribution',
      cardsFromAllLearned: 'cards from all completed lessons',
      needReview: 'due',
      mastered: 'mastered',
      cards: 'cards',
      hideLevelDetails: 'Hide Level Details',
      showLevelDetails: 'View Level Details',
      learnedCount: 'learned',
      masteredCount: 'mastered',
      completedTodayGoal: 'You completed your daily goal!',
      timeUntilNextReview: 'Time until next review',
      noFolderHint: 'Study a lesson to add cards into Global SRS',
      accuracy: 'Accuracy',
      howManyNewWords: 'How many new words do you want to learn today?',
      newWordsNotice: 'Due cards are always reviewed separately and do not count against new words.',
      newWords: 'new words',
      allNewWords: 'All new words',
      todayRhythm: "TODAY'S RHYTHM",
      learnedSoFar: 'new words learned',
      flipCard: 'Flip Card',
      finishSession: 'Finish Review Session',
    },

    quizPage: {
      allQuizzes: 'All Quizzes',
      myQuizzes: 'My Quizzes',
      createQuiz: 'Create Quiz',
      play: 'Play Quiz',
      question: 'Question',
      submit: 'Submit',
      result: 'Quiz Result',
      retake: 'Retake',
      score: 'Score',
      title: 'Explore Quizzes',
      subtitle: 'Practice Japanese with public quizzes created by the community',
      searchPlaceholder: 'Search quizzes by title, description, creator...',
      resultsCount: 'Showing',
      ofQuizzes: 'quizzes',
      emptyTitle: 'No Quizzes Yet',
      emptyDesc: 'There are no public quizzes available yet. Please check back later!',
      noResultTitle: 'No Quizzes Found',
      noResultDesc: 'No quizzes matching',
      clearSearch: 'Clear Search',
      noDescription: 'No description provided',
      startQuiz: 'Take Quiz →',
      questionsUnit: 'questions',
      unlimitedTime: 'No time limit',
      noQuestions: 'This quiz has no questions yet. Please contact the creator.',
      start: 'Start',
      preparing: 'Preparing...',
      exit: 'Exit',
      questionCounter: 'Question',
      correct: 'Correct! Well done!',
      wrong: 'Incorrect! Correct answer:',
      fillPlaceholder: 'Type your answer...',
      answer: 'Submit',
      nextQuestion: 'Next Question →',
      viewResult: 'View Results →',
      completed: 'Quiz Completed!',
      back: 'Back',
    },

    examPage: {
      allExams: 'Mock Exams',
      duration: 'Duration',
      minutes: 'mins',
      startExam: 'Start Exam',
      submitExam: 'Submit Exam',
      confirmSubmit: 'Are you sure you want to submit your exam now?',
      passed: 'PASSED',
      failed: 'FAILED',
      score: 'Score',
      reviewAnswers: 'Review Answers',
      timeRemaining: 'Time Remaining',
      title: 'Mock Exams',
      subtitle: 'Practice for the JLPT with community shared tests',
      myExams: 'My Exams',
      createExam: '+ Create Exam',
      searchPlaceholder: 'Search exams by title...',
      allLevels: 'All Levels',
      emptyTitle: 'No Exams Yet',
      emptyDesc: 'Be the first to create and share an exam with the community.',
      createFirst: 'Create First Exam',
      foundPublic: 'Found',
      questionsUnit: 'questions',
      noDescription: 'No description provided',
      start: 'Take Test →',
      loading: 'Loading exam...',
      backToList: 'Back to Exam List',
      exit: 'Exit',
      answered: 'answered',
      questionNum: 'Question',
      orderHint: 'Tap components in the correct sentence order:',
      clearOrder: 'Clear Selection',
      prevQuestion: '← Previous',
      nextQuestion: 'Next →',
      submitting: 'Submitting...',
      loadingResult: 'Loading result...',
      completed: 'Completed!',
      accuracy: 'Accuracy',
      correctAnswers: 'Correct',
      wrongAnswers: 'Wrong',
      timeSpent: 'Time',
      retake: 'Retake',
      otherExams: 'Other Exams',
      showAll: 'Show All',
      showOnlyWrong: 'Show Wrong Only',
      reviewDetail: 'Detailed Review',
      allCorrectMessage: '🎉 Great job! You had zero incorrect answers.',
      yourChoice: 'Your Choice',
      correctAnswer: 'Correct Answer',
      explanation: 'Explanation:',
    },

    leaderboardPage: {
      title: 'Leaderboard',
      subtitle: 'Top achievers in the Kitsune learning community.',
      weeklyXp: 'Weekly XP',
      streakRank: 'Streak',
      rank: 'Rank',
      learner: 'Learner',
      yourRank: 'Your Rank',
      xp: 'XP',
      loading: 'Loading leaderboard...',
      emptyTitle: 'No Data Yet',
      emptyDesc: 'Complete your first quiz to appear on the leaderboard!',
      attempts: 'attempts',
      fullTable: 'Full Leaderboard',
      quizzesDone: 'Quizzes',
      avgAccuracy: 'Avg Accuracy',
      lastAttempt: 'Last Active',
    },

    postsPage: {
      title: 'Community Forum',
      subtitle: 'Share tips and Japanese study experiences with fellow learners',
      createPost: '✏️ New Post',
      writeComment: 'Write a comment...',
      comments: 'comments',
      allPosts: 'All Posts',
      loading: 'Loading posts...',
      emptyTitle: 'No Posts Yet',
      emptyDesc: 'Be the first one to share something!',
      createFirst: 'Create First Post',
      viewMore: 'Read More',
      backToForum: 'Back to Forum',
      like: 'Like',
      share: 'Share',
      attachedQuiz: 'Attached Quiz',
      modalTitle: 'Create New Post',
      postTitleLabel: 'Title',
      postTitlePlaceholder: 'Enter post title...',
      postContentLabel: 'Content',
      postContentPlaceholder: 'Share your thoughts or questions...',
      imageLabel: 'Image (optional)',
      publishBtn: 'Publish',
      cancelBtn: 'Cancel',
      sendComment: 'Send',
      deleting: 'Deleting...',
      deletePost: 'Delete Post',
      deleteComment: 'Delete Comment',
    },

    profilePage: {
      title: 'Profile & Account',
      accountInfo: 'Personal Info',
      studyStats: 'Study Statistics',
      knowledgeMap: 'Knowledge Map',
      appSettings: 'Account Settings',
      displayLanguage: 'Display Language',
      termsOfService: 'Terms of Service',
      logout: 'Log Out',
      editProfile: 'Edit Profile',
      fullName: 'Full Name',
      email: 'Email',
      role: 'Role',
      streak: 'Streak',
      totalXp: 'Total XP',
      srsDue: 'SRS Due',
      tabInfo: 'Info',
      tabAvatar: 'Avatar',
      tabFolders: 'Folders',
      tabStats: 'Stats',
      tabSettings: 'Settings',
      verified: 'Verified',
      unverified: 'Unverified',
      username: 'Username',
      status: 'Status',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      vocabLearned: 'Words Learned',
      kanjiLearned: 'Kanji Learned',
      quizzesTaken: 'Quizzes Taken',
      avatarHint1: 'Click avatar to choose a new picture',
      avatarHint2: 'Formats: JPG, PNG, GIF. Max file size: 5MB',
      removeAvatar: 'Remove Avatar',
      myFolders: 'Your Folders',
      foldersDesc: 'Manage your personal vocabulary folders',
      viewAllFolders: 'View All Folders',
      overview: 'Overview',
      consecutiveDays: 'Consecutive Days',
      totalReviews: 'Total Reviews',
      accuracyRate: 'Accuracy Rate',
      boxDistribution: 'SRS Box Level Distribution',
      noCardsHint: 'No SRS cards yet. Add vocabulary or kanji to a folder and start reviewing.',
      mostWrong: 'Most Challenging',
      noWrongHint: 'No recent errors found. Excellent work!',
      wrongCountUnit: 'errors',
      accuracyTrend: 'Accuracy Trend (Last 14 Days)',
      noTrendHint: 'No recent review activity recorded.',
      interfaceTheme: 'Appearance',
      lightTheme: '☀️ Light',
      darkTheme: '🌙 Dark',
      viewTerms: 'View Terms of Service',
      emailVerification: 'Email Verification',
      dangerZone: 'Danger Zone',
      dangerDesc: 'These actions cannot be undone. Please proceed with caution.',
      logoutAllDevices: 'Log Out on All Devices',
      close: 'Close',
    },

    authPage: {
      loginTitle: 'Sign In',
      loginSubtitle: 'Welcome back!',
      heroTitle: 'Smart Language Learning\nWith Kitsune Every Day',
      heroSubtitle: 'Learn vocabulary, Kanji, and grammar with proven scientific methods to accelerate your progress.',
      featureEffective: 'Effective Learning',
      featureEffectiveDesc: 'SRS method for optimized memory retention',
      featureProgress: 'Track Progress',
      featureProgressDesc: 'Detailed stats and performance reviews',
      quoteTranslation: 'Consistency is power.',
      tabLogin: 'Sign In',
      tabRegister: 'Sign Up',
      loginFieldLabel: 'Email or username',
      loginFieldPlaceholder: 'Enter email or username',
      loginFieldError: 'Please enter your email or username.',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter password',
      passwordError: 'Password must be at least 6 characters.',
      forgotPasswordLink: 'Forgot password?',
      rememberMe: 'Remember me',
      submitLogin: 'Sign In →',
      submittingLogin: 'Signing in...',
      orContinueWith: 'Or continue with',
      continueGoogle: 'Continue with Google',
      continueFacebook: 'Continue with Facebook',
      securityNote: 'Your information is completely encrypted and secure',
      registerTitle: 'Create Account',
      registerSubtitle: 'Welcome to Kitsune!',
      registerHeroTitle: 'Begin Your Journey\nWith Kitsune Today',
      fullNameLabel: 'Full name',
      fullNamePlaceholder: 'Enter your full name',
      emailLabel: 'Email',
      emailPlaceholder: 'Enter your email address',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Choose a username',
      registerPasswordPlaceholder: 'Create a password (min 8 chars)',
      confirmPasswordLabel: 'Confirm password',
      confirmPasswordPlaceholder: 'Re-enter your password',
      passwordMismatch: 'Passwords do not match.',
      agreeTermsPrefix: 'I agree to the',
      termsOfService: 'Terms of Service',
      submitRegister: 'Create Account →',
      submittingRegister: 'Creating account...',
      orRegisterWith: 'Or register with',
      forgotTitle: 'Forgot Password',
      forgotSubtitle: 'We will help you get back on track right away.',
      forgotHeroTitle: 'Recover Account\nWith Kitsune',
      forgotHeroSub: 'Enter your registered email and we will send instructions to securely reset your password.',
      sendLink: 'Send Link',
      sendLinkDesc: 'Receive password reset instructions via email',
      accountSec: 'Account Security',
      accountSecDesc: 'Verification process keeps your information safe',
      submitForgot: 'Send Reset Link →',
      submittingForgot: 'Sending...',
      backToLogin: 'Back to Sign In',
      spamCheckNote: "Didn't receive the email? Check your Spam or Junk folder.",
    },

    foldersPage: {
      kicker: 'Study Repository',
      title: 'My Folders',
      subtitle: 'Manage and organize your vocabulary decks by topic.',
      createFolder: 'Create New Folder',
      loading: 'Loading folders...',
      emptyTitle: 'No folders yet',
      emptyDesc: 'Create your first folder to start organizing your vocabulary.',
      createFirst: 'Create First Folder',
      vocabUnit: 'vocabularies',
      public: 'Public',
      private: 'Private',
      options: 'Options',
      rename: 'Rename',
      delete: 'Delete',
      open: 'Open',
      noDesc: 'No description provided',
      modalCreateTitle: 'Create New Folder',
      modalRenameTitle: 'Rename Folder',
      nameLabel: 'Folder Name',
      namePlaceholder: 'Enter folder name...',
      descLabel: 'Description',
      descPlaceholder: 'Enter description (optional)...',
      publicLabel: 'Public Visibility',
      creating: 'Creating...',
      create: 'Create Folder',
      saving: 'Saving...',
      save: 'Save Changes',
      allFolders: '← All Folders',
      searchFolder: 'Filter by word, meaning, Sino-Vietnamese or kanji...',
      radical: 'Radical:',
      unselected: 'None',
      searchRadical: 'Search radical...',
      mentionsUnit: 'Mentions',
      emptyFolder: 'This folder has no vocabulary cards yet.',
    },

    minigamesPage: {
      backToRoadmap: '← Back to Roadmap',
      heroTitle: 'Play Fast. Remember Long.',
      heroSub: 'Five bite-sized challenges powered by your active vocabulary.',
      playNow: 'Play Now →',
      preparing: 'Preparing…',
      exit: '× Exit',
      score: 'pts',
      findMeaning: 'Find the word meaning',
      matchReading: 'Assemble reading for',
      undo: 'Delete tile',
      check: 'Check',
      matchKanjiHira: 'Pair Kanji and Hiragana',
      pairs: 'pairs',
      listenPrompt: 'Listen and choose correct meaning',
      listenHint: 'Tap to replay audio',
      shiritoriTitle: 'Shiritori with Kitsune',
      shiritoriReq: 'Your word must start with',
      shiritoriTurn: 'Your turn · left',
      seconds: 's',
      shiritoriInputPh: 'Type word using Kanji…',
      shiritoriBtn: 'Submit Word',
      correct: 'Correct!',
      wrong: 'Not quite — keep trying.',
      playAgain: 'Play Again',
      chooseOther: 'Choose Another Game',
      correctUnit: 'correct',
      wrongUnit: 'wrong',
    },

    myQuizzesPage: {
      title: 'My Quizzes',
      subtitle: 'Manage all quizzes you have created',
      createQuiz: 'Create Quiz',
      searchPlaceholder: 'Search in your quizzes...',
      loading: 'Loading your quizzes...',
      showing: 'Showing',
      of: 'quizzes',
      emptyTitle: "You haven't created any quizzes yet",
      emptyDesc: 'Create your first quiz and share it with the Japanese learning community!',
      createFirst: 'Create Quiz Now',
      noResultsTitle: 'No results found',
      noResultsDesc: 'No quizzes match',
      clearSearch: 'Clear search',
      attempts: 'attempts',
      public: '🌐 Public',
      private: '🔒 Private',
      startQuiz: 'Take Quiz →',
      dialogTitle: 'Delete quiz?',
      dialogDesc: 'You are about to delete this quiz. This action cannot be undone.',
      dialogCancel: 'Cancel',
      dialogDanger: 'Delete Permanently',
      deleting: 'Deleting...',
    },

    myExamsPage: {
      title: 'My Exams',
      subtitle: 'Manage all mock exams you have created',
      explore: 'Explore Exams',
      createBtn: '+ Create Exam',
      loading: 'Loading your exams...',
      emptyTitle: "You haven't created any exams yet",
      emptyDesc: 'Create an exam manually or import from an Excel/JSON file.',
      createFirst: 'Create First Exam',
      statusPublic: 'Public',
      statusHidden: 'Hidden',
      questionsCount: 'questions',
      tryPlay: 'Take Exam',
      hide: 'Hide',
      publish: 'Publish',
      delete: 'Delete',
      dialogTitle: 'Delete exam?',
      dialogDesc: 'The exam will be hidden (soft-deleted). This action cannot be undone.',
      dialogCancel: 'Cancel',
      dialogConfirm: 'Delete Exam',
    },

    messagesPage: {
      inDevelopment: 'In Development',
      heading: 'Feature In Development',
      subheading: 'Community messaging is coming soon',
      description: 'We are building a real-time messaging platform so you can connect and communicate directly with other Japanese learners. Stay tuned!',
      featPrivate: 'Direct Messages',
      featGroup: 'Study Groups',
      featRealtime: 'Real-Time Chat',
      releaseLabel: 'Target Release',
    },
  },

  ja: {
    homeTitle: 'ホーム',
    home: 'ホーム',
    lookup: '辞書・検索',
    topics: '学習',
    review: '復習',
    quizzes: 'クイズ',
    exams: '模擬試験',
    community: 'コミュニティ',
    leaderboard: 'ランキング',
    minigames: 'ミニゲーム',
    profile: 'マイページ',
    searchPlaceholder: '投稿、クイズ、単語、漢字を検索...',
    searching: 'Kitsune内を検索中…',
    searchResults: '検索結果',
    items: '件',
    noResults: '該当する内容が見つかりませんでした。',
    dueCards: '枚の復習',
    accountSettings: 'アカウント設定',
    profileAndAvatar: 'プロフィール・アバター',
    logout: 'ログアウト',
    displayLanguage: '表示言語',

    common: {
      save: '保存',
      cancel: 'キャンセル',
      edit: '編集',
      delete: '削除',
      retry: '再試行',
      close: '閉じる',
      back: '戻る',
      confirm: '確認',
      search: '検索',
      loading: '読み込み中...',
      noData: 'データがありません',
      all: 'すべて',
      filter: 'フィルター',
      sort: '並び替え',
      share: '共有',
      bookmark: '保存',
      detail: '詳細',
      viewAll: 'すべて見る',
      days: '日',
      hours: '時間',
      minutes: '分',
      today: '今日',
    },

    homePage: {
      greetingEyebrow: '今日の学習ルーティン',
      greetingPrefix: 'こんにちは',
      greetingSub: '短いセッションでも日本語の学習を前進させられます。',
      consecutiveDays: '日連続',
      todayRitualKicker: '今日の学習',
      reviewReadyTitle: '学習ペースを維持しましょう',
      newReadyTitle: '新しいことを学ぶ準備ができました',
      reviewReadySub: '枚のカードが待っています。',
      newReadySub: '復習カードはありません。新しいレッスンを始めましょう。',
      todayProgress: '今日の進捗',
      cardsTouched: '枚学習済み',
      startReviewBtn: '復習を始める',
      learnNewBtn: '新しいレッスンへ',
      weekRhythm: '学習ペース',
      past7Days: '過去7日間',
      onlyKitsuneTime: 'Kitsuneでの学習時間のみ集計されます。',
      priorityNow: '最優先',
      reviewDueAction: '枚を復習',
      srsWaiting: '復習予定のカードがあります',
      continuePath: '続きから',
      learnLesson: 'レッスンを受ける',
      followRoadmap: 'カリキュラムに沿って進む',
      quickWarmup: 'クイックウォームアップ',
      quiz5Min: '5分クイズ',
      checkRecall: '覚えたことを確認',
      achievements: '成果',
      yourRhythm: 'あなたのペース',
      totalXp: '総獲得XP',
      todayGoal: '今日の目標',
      habitQuote: '毎日の短い積み重ねが確実な力になります。',
      communityChallenge: 'コミュニティチャレンジ',
      steadyProgress: '継続は力なり',
      challengeDesc: '今日クイズを完了して週間ランキングに参加しましょう。',
      joinChallenge: 'チャレンジに参加',
    },

    vocab: {
      searchPlaceholder: '単語、かな、ローマ字、意味で検索...',
      allLevels: 'すべてのレベル',
      bookmarksOnly: '保存済み',
      allFolders: 'すべてのフォルダ',
      resultsCount: '結果 ({count} 件)',
      noResults: '一致する単語が見つかりませんでした。',
      addToSrs: 'SRSに追加',
      addedToSrs: '復習に追加済み',
      inSrs: 'SRS登録済み',
      bookmark: 'お気に入り',
      bookmarked: 'お気に入り済み',
      meaning: '意味',
      meaningLabel: '意味',
      readings: '読み方',
      examples: '例文',
      kanjiComponents: '構成漢字',
      addToFolder: 'フォルダに追加',
      comments: 'コメント',
      onyomi: '音読み (音読み)',
      kunyomi: '訓読み (訓読み)',
      hanViet: '名のり / 漢音',
      emptyTitle: '単語検索',
      emptySubtitle: 'キーワードを入力して日本語単語データベースを検索します',
      noResultTitle: '見つかりませんでした',
      noResultSubtitle: '別のキーワードで検索するか、綴りを確認してください',
      additionalInfo: '詳細情報',
      actions: '操作',
      selectToView: '詳細を表示する単語を選択してください',
      kanjiSplit: '漢字分解',
      touchEachStroke: '構成要素の確認',
      charactersForming: 'この単語を構成する漢字：',
      viewReadingsRadical: '読みと部首を確認',
      kanaOnlyNote: 'この単語は仮名表記のみで、漢字構成はありません。',
      railTip: '選択したレッスン内容が復習セッションに反映されます。',
      railPlaceholder: '選択した単語の漢字構成要素がここに表示されます。',
      kanjiModalLoading: '漢字情報を読み込み中...',
      strokeCount: '画数',
      strokesUnit: '画',
      radical: '部首',
      mnemonic: '覚え方・ヒント',
      audioTitle: '発音を聞く',
      pronounce: '発音',
      viewDetails: '詳細を表示',
      folderBadge: '単語',
    },

    kanji: {
      searchPlaceholder: '漢字、音読み、訓読み、意味で検索...',
      strokes: '画',
      radical: '部首',
      onyomi: '音読み',
      kunyomi: '訓読み',
      hanViet: '名のり / 漢音',
      practiceWriting: '漢字の書き取り練習',
      clearCanvas: 'クリア',
      strokeOrder: '筆順',
      components: '構成要素',
      examples: 'この漢字を含む単語',
      searchRadical: '部首を検索...',
      noResultTitle: '一致する漢字が見つかりませんでした',
      noResultSubtitle: '漢字、読み、または短い意味で再度検索してください。',
      todaySuggestions: '今日のおすすめ',
      searchResults: '検索結果',
      selectToView: '詳細を表示する漢字を選択してください',
      strokeOrderHint: '筆順を確認しやすいよう、ゆっくり描画されます。',
      replayStroke: '筆順を再生',
      drawingStrokes: '筆順を描画中...',
      unselected: '未選択',
    },

    grammar: {
      searchPlaceholder: '文法パターン、構文を検索...',
      level: 'レベル',
      structure: '接続・構文',
      explanation: '意味・解説',
      examples: '例文',
      allLevels: 'すべてのレベル',
      loading: '文法を読み込み中...',
      noResults: '一致する文法が見つかりませんでした。',
      foundCount: '{count} 件の文法が見つかりました',
      examplesCount: '例文 ({count})',
      noExamples: 'この文法の例文はまだ登録されていません。',
      selectToView: '詳細を表示する文法を選択してください。',
    },

    topicsPage: {
      roadmapTitle: '学習カリキュラム',
      roadmapSub: 'トピックを選んで順を追って学習を進めましょう。',
      lessons: 'レッスン',
      progress: '進捗',
      start: '始める',
      continueText: '続ける',
      completed: '完了',
      estimatedMinutes: '所要時間（分）',
      studyHeader: '学習',
      quickPractice: 'クイック練習',
      currentTopics: '学習中のトピック',
      noPublishedTopics: '公開されたトピックはまだありません。',
      allLevels: '全レベル',
      loadingRoadmap: 'カリキュラムを読み込み中…',
      items: '項目',
      noLessons: 'このトピックにはまだレッスンがありません。',
      preparingLesson: 'レッスンを準備中…',
      lessonWord: '第',
      lessonCompleted: 'レッスン完了',
      completedSummary: 'すべての学習項目を完了しました。今後の復習セッションに出題されます。',
      learned: '学習済み',
      duration: '所要時間',
      savingProgress: '進捗を保存中…',
      progressSaved: '進捗が正常に保存されました。',
      syncError: '同期できませんでした。再試行してください。',
      retrySave: '再保存',
      backToRoadmap: 'カリキュラムへ戻る',
      completeLesson: 'レッスンを完了する',
      noLessonContent: 'このレッスンには内容がありません。',
    },

    srsPage: {
      title: '分散学習（SRS）',
      dueNotice: '枚のカードが今日の復習を待っています。',
      startReview: '復習を始める',
      allDoneTitle: '素晴らしい！今日の復習はすべて完了しました',
      allDoneSub: '少し休憩するか、新しい単語を学習しましょう。',
      showAnswer: '答えを表示',
      again: 'もう一度',
      hard: '難しい',
      good: '普通',
      easy: '簡単',
      nextReview: '次回復習',
      globalSrs: '全体SRS',
      cardsDueToday: '今日の復習カード',
      levelDistribution: 'レベル別分布',
      cardsFromAllLearned: '完了した全レッスンからのカード',
      needReview: '復習対象',
      mastered: 'マスター',
      cards: '枚',
      hideLevelDetails: 'レベル詳細を隠す',
      showLevelDetails: 'レベル詳細を表示',
      learnedCount: '学習済み',
      masteredCount: 'マスター済み',
      completedTodayGoal: '今日の目標を達成しました！',
      timeUntilNextReview: '次回復習までの時間',
      noFolderHint: 'レッスンを完了して全体SRSにカードを追加しましょう',
      accuracy: '正答率',
      howManyNewWords: '今日はいくつの新しい単語を学習しますか？',
      newWordsNotice: '復習期限のカードは別途出題され、新出単語数には含まれません。',
      newWords: '語（新規）',
      allNewWords: 'すべての新出単語',
      todayRhythm: '今日の学習ペース',
      learnedSoFar: '語学習済み',
      flipCard: 'カードを裏返す',
      finishSession: 'セッションを終了する',
    },

    quizPage: {
      allQuizzes: 'すべてのクイズ',
      myQuizzes: 'マイクイズ',
      createQuiz: 'クイズ作成',
      play: 'クイズに挑戦',
      question: '問題',
      submit: '提出',
      result: 'クイズ結果',
      retake: 'もう一度受ける',
      score: '得点',
      title: 'クイズを探す',
      subtitle: '公開クイズで日本語の実力を試しましょう',
      searchPlaceholder: 'タイトル、説明、作成者でクイズを検索...',
      resultsCount: '表示中',
      ofQuizzes: '件のクイズ',
      emptyTitle: 'クイズがまだありません',
      emptyDesc: '現在公開されているクイズはありません。後ほどご確認ください。',
      noResultTitle: 'クイズが見つかりません',
      noResultDesc: '一致するクイズがありません：',
      clearSearch: '検索をクリア',
      noDescription: '説明がありません',
      startQuiz: '挑戦する →',
      questionsUnit: '問',
      unlimitedTime: '時間制限なし',
      noQuestions: 'このクイズにはまだ問題がありません。作成者にお問い合わせください。',
      start: '開始',
      preparing: '準備中...',
      exit: '終了',
      questionCounter: '問',
      correct: '正解！素晴らしい！',
      wrong: '不正解！正解：',
      fillPlaceholder: '回答を入力...',
      answer: '回答',
      nextQuestion: '次の問題 →',
      viewResult: '結果を見る →',
      completed: 'クイズ完了！',
      back: '戻る',
    },

    examPage: {
      allExams: '模擬試験一覧',
      duration: '試験時間',
      minutes: '分',
      startExam: '試験開始',
      submitExam: '答案を提出',
      confirmSubmit: '本当に答案を提出しますか？',
      passed: '合格',
      failed: '不合格',
      score: '得点',
      reviewAnswers: '解答の確認',
      timeRemaining: '残り時間',
      title: '模擬試験',
      subtitle: 'コミュニティ共有のJLPT模擬試験で実戦演習',
      myExams: 'マイ試験',
      createExam: '+ 試験を作成',
      searchPlaceholder: 'タイトルで試験を検索...',
      allLevels: 'すべて',
      emptyTitle: '試験がまだありません',
      emptyDesc: '最初の試験を作成してコミュニティに共有しましょう。',
      createFirst: '最初の試験を作成',
      foundPublic: '公開試験',
      questionsUnit: '問',
      noDescription: '説明がありません',
      start: '受験する →',
      loading: '試験を読み込み中...',
      backToList: '試験一覧に戻る',
      exit: '終了',
      answered: '解答済み',
      questionNum: '問',
      orderHint: '正しい語順で単語をタップしてください：',
      clearOrder: '選択をクリア',
      prevQuestion: '← 前の問題',
      nextQuestion: '次の問題 →',
      submitting: '提出中...',
      loadingResult: '結果を読み込み中...',
      completed: '完了！',
      accuracy: '正答率',
      correctAnswers: '正解',
      wrongAnswers: '不正解',
      timeSpent: '所要時間',
      retake: '再受験',
      otherExams: '他の試験',
      showAll: 'すべて表示',
      showOnlyWrong: '不正解のみ表示',
      reviewDetail: '詳細な見直し',
      allCorrectMessage: '🎉 素晴らしい！全問正解です。',
      yourChoice: 'あなたの解答',
      correctAnswer: '正解',
      explanation: '解説：',
    },

    leaderboardPage: {
      title: '学習ランキング',
      subtitle: 'Kitsuneコミュニティの学習状況を確認できます。',
      weeklyXp: '週間XP',
      streakRank: '連続日数',
      rank: '順位',
      learner: 'ユーザー',
      yourRank: 'あなたの順位',
      xp: 'XP',
      loading: 'ランキングを読み込み中...',
      emptyTitle: 'データがありません',
      emptyDesc: 'クイズに挑戦してランキングに参加しましょう！',
      attempts: '回挑戦',
      fullTable: '全体ランキング',
      quizzesDone: 'クイズ数',
      avgAccuracy: '平均正答率',
      lastAttempt: '最終挑戦',
    },

    postsPage: {
      title: '学習コミュニティ',
      subtitle: '日本語学習のコツや疑問をみんなと共有しましょう',
      createPost: '✏️ 投稿する',
      writeComment: 'コメントを入力...',
      comments: '件のコメント',
      allPosts: 'すべての投稿',
      loading: '投稿を読み込み中...',
      emptyTitle: '投稿がまだありません',
      emptyDesc: '最初の投稿を作成して共有しましょう！',
      createFirst: '最初の投稿を作成',
      viewMore: '続きを読む',
      backToForum: 'フォーラムに戻る',
      like: 'いいね',
      share: '共有',
      attachedQuiz: '添付クイズ',
      modalTitle: '新規投稿作成',
      postTitleLabel: 'タイトル',
      postTitlePlaceholder: '投稿のタイトルを入力...',
      postContentLabel: '本文',
      postContentPlaceholder: '考えや質問を共有しましょう...',
      imageLabel: '画像（任意）',
      publishBtn: '投稿する',
      cancelBtn: 'キャンセル',
      sendComment: '送信',
      deleting: '削除中...',
      deletePost: '投稿を削除',
      deleteComment: 'コメントを削除',
    },

    profilePage: {
      title: 'プロフィール・アカウント',
      accountInfo: 'アカウント情報',
      studyStats: '学習統計',
      knowledgeMap: '能力マップ',
      appSettings: 'アプリ設定',
      displayLanguage: '表示言語',
      termsOfService: '利用規約',
      logout: 'ログアウト',
      editProfile: 'プロフィール編集',
      fullName: '氏名',
      email: 'メールアドレス',
      role: 'ロール',
      streak: '連続日数',
      totalXp: '総獲得XP',
      srsDue: '復習予定',
      tabInfo: '情報',
      tabAvatar: 'アバター',
      tabFolders: 'フォルダ',
      tabStats: '統計',
      tabSettings: '設定',
      verified: '認証済み',
      unverified: '未認証',
      username: 'ユーザー名',
      status: 'ステータス',
      saveChanges: '変更を保存',
      saving: '保存中...',
      vocabLearned: '学習済み単語',
      kanjiLearned: '学習済み漢字',
      quizzesTaken: '挑戦したクイズ',
      avatarHint1: '画像をクリックして新しいアバターを選択',
      avatarHint2: '形式：JPG, PNG, GIF。最大サイズ：5MB',
      removeAvatar: 'アバターを削除',
      myFolders: 'マイフォルダ',
      foldersDesc: '単語フォルダを整理・管理',
      viewAllFolders: 'すべてのフォルダを見る',
      overview: '概要',
      consecutiveDays: '連続日数',
      totalReviews: '総復習数',
      accuracyRate: '正答率',
      boxDistribution: 'SRSレベル別分布',
      noCardsHint: 'SRSカードがまだありません。フォルダに単語や漢字を追加して復習を始めましょう。',
      mostWrong: '苦手な項目',
      noWrongHint: '最近のミスはありません。素晴らしい！',
      wrongCountUnit: '回ミス',
      accuracyTrend: '正答率の推移（直近14日間）',
      noTrendHint: '最近の復習データがありません。',
      interfaceTheme: 'テーマ設定',
      lightTheme: '☀️ ライト',
      darkTheme: '🌙 ダーク',
      viewTerms: '利用規約を見る',
      emailVerification: 'メール認証',
      dangerZone: '危険なゾーン',
      dangerDesc: '以下の操作は取り消せません。慎重に行ってください。',
      logoutAllDevices: '全デバイスからログアウト',
      close: '閉じる',
    },

    authPage: {
      loginTitle: 'ログイン',
      loginSubtitle: 'おかえりなさい！',
      heroTitle: 'Kitsuneで毎日\nスマートに言語学習',
      heroSubtitle: '語彙、漢字、文法を科学的アプローチで学習し、着実にステップアップ。',
      featureEffective: '効果的な学習',
      featureEffectiveDesc: '記憶定着を最大化するSRS方式',
      featureProgress: '進捗トラッキング',
      featureProgressDesc: '詳細な分析と成果の可視化',
      quoteTranslation: '継続は力なり。',
      tabLogin: 'ログイン',
      tabRegister: '新規登録',
      loginFieldLabel: 'メールアドレスまたはユーザー名',
      loginFieldPlaceholder: 'メールアドレスまたはユーザー名を入力',
      loginFieldError: 'メールアドレスまたはユーザー名を入力してください。',
      passwordLabel: 'パスワード',
      passwordPlaceholder: 'パスワードを入力',
      passwordError: 'パスワードは6文字以上必要です。',
      forgotPasswordLink: 'パスワードをお忘れですか？',
      rememberMe: 'ログイン状態を保持する',
      submitLogin: 'ログイン →',
      submittingLogin: 'ログイン中...',
      orContinueWith: 'または以下でログイン',
      continueGoogle: 'Googleで続ける',
      continueFacebook: 'Facebookで続ける',
      securityNote: 'お客様の情報は安全に保護されています',
      registerTitle: 'アカウント作成',
      registerSubtitle: 'Kitsuneへようこそ！',
      registerHeroTitle: '語学の旅を\nKitsuneと共に始めよう',
      fullNameLabel: '氏名',
      fullNamePlaceholder: '氏名を入力',
      emailLabel: 'メールアドレス',
      emailPlaceholder: 'メールアドレスを入力',
      usernameLabel: 'ユーザー名',
      usernamePlaceholder: 'ユーザー名を入力',
      registerPasswordPlaceholder: 'パスワードを作成（8文字以上）',
      confirmPasswordLabel: 'パスワード確認',
      confirmPasswordPlaceholder: 'もう一度パスワードを入力',
      passwordMismatch: 'パスワードが一致しません。',
      agreeTermsPrefix: '利用規約に同意する',
      termsOfService: '利用規約',
      submitRegister: 'アカウントを作成 →',
      submittingRegister: 'アカウント作成中...',
      orRegisterWith: 'または以下で登録',
      forgotTitle: 'パスワード再設定',
      forgotSubtitle: 'すぐに学習を再開できるようサポートします。',
      forgotHeroTitle: 'Kitsuneアカウントの復旧',
      forgotHeroSub: '登録済みメールアドレスを入力すると、再設定の手順をお送りします。',
      sendLink: 'リンクを送信',
      sendLinkDesc: 'メールで再設定リンクを受信',
      accountSec: 'アカウントの保護',
      accountSecDesc: '確認手続きにより個人情報を保護します',
      submitForgot: '再設定リンクを送信 →',
      submittingForgot: '送信中...',
      backToLogin: 'ログインに戻る',
      spamCheckNote: 'メールが届かない場合は、迷惑メールフォルダをご確認ください。',
    },

    foldersPage: {
      kicker: 'Study Repository',
      title: 'マイフォルダ',
      subtitle: 'トピックごとに単語帳を整理・管理できます。',
      createFolder: '新規フォルダ作成',
      loading: 'フォルダを読み込み中...',
      emptyTitle: 'フォルダがありません',
      emptyDesc: '最初のフォルダを作成して、単語の整理を始めましょう。',
      createFirst: '最初のフォルダを作成',
      vocabUnit: '単語',
      public: '公開',
      private: '非公開',
      options: 'オプション',
      rename: '名前変更',
      delete: '削除',
      open: '開く',
      noDesc: '説明なし',
      modalCreateTitle: '新規フォルダ作成',
      modalRenameTitle: 'フォルダ名の変更',
      nameLabel: 'フォルダ名',
      namePlaceholder: 'フォルダ名を入力...',
      descLabel: '説明',
      descPlaceholder: '説明を入力（任意）...',
      publicLabel: '公開設定',
      creating: '作成中...',
      create: 'フォルダを作成',
      saving: '保存中...',
      save: '変更を保存',
      allFolders: '← 全てのフォルダ',
      searchFolder: '単語、意味、漢字で絞り込み...',
      radical: '部首:',
      unselected: '未選択',
      searchRadical: '部首を検索...',
      mentionsUnit: '使用数',
      emptyFolder: 'このフォルダにはまだ単語がありません。',
    },

    minigamesPage: {
      backToRoadmap: '← ロードマップに戻る',
      heroTitle: '素早く遊び、長く定着。',
      heroSub: '現在学習中の語彙を使った5つのミニチャレンジ。',
      playNow: '今すぐプレイ →',
      preparing: '準備中…',
      exit: '× 終了',
      score: '点',
      findMeaning: '意味に合う単語を選択',
      matchReading: '読み方を並べ替え',
      undo: '1文字削除',
      check: '判定',
      matchKanjiHira: '漢字とひらがなをペアリング',
      pairs: 'ペア',
      listenPrompt: '音声を聞いて正しい意味を選択',
      listenHint: 'タップして再再生',
      shiritoriTitle: 'きつねとしりとり',
      shiritoriReq: 'あなたの単語の開始文字',
      shiritoriTurn: 'あなたの番 · 残り',
      seconds: '秒',
      shiritoriInputPh: '漢字またはかなで入力…',
      shiritoriBtn: 'しりとり送信',
      correct: '正解！',
      wrong: '不正解 — 続けてみよう！',
      playAgain: 'もう一度プレイ',
      chooseOther: '他のゲームを選ぶ',
      correctUnit: '正解',
      wrongUnit: '不正解',
    },

    myQuizzesPage: {
      title: 'マイ・クイズ',
      subtitle: '作成したクイズの管理',
      createQuiz: 'クイズ作成',
      searchPlaceholder: 'クイズを検索...',
      loading: 'クイズを読み込み中...',
      showing: '表示中',
      of: 'クイズ',
      emptyTitle: 'まだクイズを作成していません',
      emptyDesc: '最初のクイズを作成して、日本語学習コミュニティに共有しましょう！',
      createFirst: '今すぐクイズを作成',
      noResultsTitle: '該当するクイズがありません',
      noResultsDesc: 'キーワードに一致するクイズがありません:',
      clearSearch: '検索条件をクリア',
      attempts: '回受験',
      public: '🌐 公開',
      private: '🔒 非公開',
      startQuiz: '受験する →',
      dialogTitle: 'クイズを削除しますか？',
      dialogDesc: 'このクイズを削除します。この操作は取り消せません。',
      dialogCancel: 'キャンセル',
      dialogDanger: '完全に削除',
      deleting: '削除中...',
    },

    myExamsPage: {
      title: 'マイ模擬試験',
      subtitle: '作成した模擬試験の管理',
      explore: '模擬試験一覧',
      createBtn: '+ 模擬試験作成',
      loading: '読み込み中...',
      emptyTitle: '模擬試験がありません',
      emptyDesc: '手動入力またはExcel/JSONファイルからインポートして作成できます。',
      createFirst: '最初の試験を作成',
      statusPublic: '公開',
      statusHidden: '非公開',
      questionsCount: '問',
      tryPlay: '受験する',
      hide: '非公開にする',
      publish: '公開する',
      delete: '削除',
      dialogTitle: '模擬試験を削除しますか？',
      dialogDesc: '試験は非公開（論理削除）になります。この操作は画面から元に戻せません。',
      dialogCancel: 'キャンセル',
      dialogConfirm: '試験を削除',
    },

    messagesPage: {
      inDevelopment: '開発中',
      heading: '開発中の機能',
      subheading: 'コミュニティメッセージ機能は近日公開予定です',
      description: '学習者同士でリアルタイムに繋がれるチャット機能を構築中です。リリースまで今しばらくお待ちください！',
      featPrivate: 'ダイレクトメッセージ',
      featGroup: '学習グループ',
      featRealtime: 'リアルタイム通信',
      releaseLabel: 'リリース予定',
    },
  },
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  readonly currentLang = signal<AppLanguage>('vi');

  readonly translations = computed(() => TRANSLATIONS[this.currentLang()]);
  /**
   * Shorthand signal to access the dictionary in templates:
   * e.g. `{{ lang.t().homePage.greetingEyebrow }}`
   */
  readonly t = computed(() => TRANSLATIONS[this.currentLang()]);

  readonly currentOption = computed(() =>
    LANGUAGE_OPTIONS.find((opt) => opt.code === this.currentLang()) ?? LANGUAGE_OPTIONS[0]
  );
  readonly options = LANGUAGE_OPTIONS;

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('kitsune-language') as AppLanguage | null;
      if (saved && (saved === 'vi' || saved === 'en' || saved === 'ja')) {
        this.currentLang.set(saved);
      }
    }
  }

  setLanguage(lang: AppLanguage): void {
    this.currentLang.set(lang);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('kitsune-language', lang);
      document.documentElement.setAttribute('lang', lang);
    }
  }
}
