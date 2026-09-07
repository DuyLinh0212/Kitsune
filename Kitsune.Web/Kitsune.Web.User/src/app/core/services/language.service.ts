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
}

const TRANSLATIONS: Record<AppLanguage, AppTranslation> = {
  vi: {
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
  },
  en: {
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
  },
  ja: {
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
  },
};

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  readonly currentLang = signal<AppLanguage>('vi');

  readonly translations = computed(() => TRANSLATIONS[this.currentLang()]);
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
