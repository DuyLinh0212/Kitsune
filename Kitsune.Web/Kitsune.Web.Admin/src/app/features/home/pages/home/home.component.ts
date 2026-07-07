import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppUser, AuthService } from '../../../../core/services/auth.service';
import { DashboardService, DashboardStats } from '../../../../core/services/dashboard.service';

const CHART_PLOT_LEFT = 18;
const CHART_PLOT_RIGHT = 646;
const CHART_PLOT_TOP = 12;
const CHART_PLOT_BOTTOM = 186;
const LANGUAGE_COLORS = ['#2f67ff', '#38c783', '#8b5cf6', '#ff9b2f', '#ef4444', '#06b6d4'];

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);
  private userSubscription?: Subscription;

  protected readonly user = signal<AppUser | null>(null);
  protected readonly displayName = computed(() => this.user()?.fullName || this.user()?.username || 'Admin');
  protected readonly roleLabel = computed(() =>
    this.user()?.roles?.includes('ADMIN') ? 'Quản trị viên' : 'Điều phối viên'
  );
  protected readonly profileImage = computed(() => this.user()?.avatarUrl || '/favicon.ico');
  protected readonly currentYear = new Date().getFullYear();

  // ── Live data ───────────────────────────────────────────────────────────
  protected readonly stats = signal<DashboardStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');

  ngOnInit(): void {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.user.set(user);
    });
    this.loadStats();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  protected loadStats(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  // ── Static navigation ─────────────────────────────────────────────────────
  protected readonly primaryNavigation: NavigationItem[] = [
    { label: 'Trang chủ', iconId: 'icon-home', route: '/home', active: true }
  ];

  protected readonly navigationSections: NavigationSection[] = [
    {
      title: 'Quản lý hệ thống',
      items: [
        { label: 'Người dùng', iconId: 'icon-users' },
        { label: 'Vai trò & Phân quyền', iconId: 'icon-shield' },
        { label: 'Nhật ký hệ thống', iconId: 'icon-log' },
        { label: 'Cấu hình hệ thống', iconId: 'icon-settings' }
      ]
    },
    {
      title: 'Quản lý nội dung',
      items: [
        { label: 'Từ vựng', iconId: 'icon-book', route: '/vocabulary', hasChevron: true },
        { label: 'Kanji', iconId: 'icon-kanji', route: '/kanji', hasChevron: true },
        { label: 'Ngữ pháp', iconId: 'icon-grammar' },
        { label: 'Bài tập & Quiz', iconId: 'icon-quiz', hasChevron: true },
        { label: 'Chủ đề diễn đàn', iconId: 'icon-chat', hasChevron: true }
      ]
    },
    {
      title: 'Thống kê & báo cáo',
      items: [
        { label: 'Thống kê học tập', iconId: 'icon-chart' },
        { label: 'Bảng xếp hạng', iconId: 'icon-trophy' },
        { label: 'Báo cáo hệ thống', iconId: 'icon-report' }
      ]
    },
    {
      title: 'Tiện ích',
      items: [
        { label: 'Quản lý OTP', iconId: 'icon-key' },
        { label: 'Sao lưu dữ liệu', iconId: 'icon-backup' }
      ]
    }
  ];

  // ── Summary cards (live) ─────────────────────────────────────────────────
  protected readonly summaryCards = computed<SummaryCard[]>(() => {
    const s = this.stats();
    return [
      { title: 'Tổng người dùng', value: this.formatNumber(s?.totalUsers ?? 0), delta: this.formatDelta(s?.userGrowthPercent), comparison: 'so với 7 ngày trước', iconId: 'icon-users', tone: 'blue' },
      { title: 'Từ vựng', value: this.formatNumber(s?.totalVocabulary ?? 0), delta: this.formatDelta(s?.vocabularyGrowthPercent), comparison: 'so với 7 ngày trước', iconId: 'icon-book', tone: 'green' },
      { title: 'Kanji', value: this.formatNumber(s?.totalKanji ?? 0), iconId: 'icon-kanji', tone: 'violet' },
      { title: 'Bộ thủ', value: this.formatNumber(s?.totalRadicals ?? 0), iconId: 'icon-radical', tone: 'orange' },
      { title: 'Người dùng mới hôm nay', value: this.formatNumber(s?.newUsersToday ?? 0), iconId: 'icon-trend', tone: 'cyan' }
    ];
  });

  // ── Chart (live, dynamic scale) ──────────────────────────────────────────
  protected readonly chartLabels = computed(() => this.stats()?.chart.labels ?? []);

  private readonly chartMax = computed(() => {
    const s = this.stats();
    const all = [...(s?.chart.newUsersSeries ?? []), ...(s?.chart.newVocabularySeries ?? [])];
    return this.niceCeil(Math.max(1, ...all));
  });

  protected readonly yAxisTicks = computed(() => {
    const max = this.chartMax();
    const ticks = 4;
    return Array.from({ length: ticks + 1 }, (_, i) => Math.round((max / ticks) * (ticks - i)));
  });

  protected readonly horizontalGridLines = computed(() => this.buildHorizontalGrid(this.yAxisTicks().length));
  protected readonly verticalGridLines = computed(() => this.buildVerticalGrid(this.chartLabels().length));
  protected readonly lessonsSeries = computed(() => this.buildChartSeries(this.stats()?.chart.newUsersSeries ?? [], this.chartMax()));
  protected readonly activeUsersSeries = computed(() => this.buildChartSeries(this.stats()?.chart.newVocabularySeries ?? [], this.chartMax()));

  // ── Recent users (live) ──────────────────────────────────────────────────
  protected readonly recentUsers = computed<RecentUser[]>(() =>
    (this.stats()?.recentUsers ?? []).map((u, index) => ({
      name: u.fullName || u.username,
      email: u.email,
      registeredAt: this.formatRelativeTime(u.createdAt),
      avatarUrl: u.avatarUrl,
      initials: this.initialsOf(u.fullName || u.username),
      accent: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]
    }))
  );

  // ── Content metrics (live) ───────────────────────────────────────────────
  protected readonly contentMetrics = computed<ContentMetric[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const tones: ContentMetric['tone'][] = ['blue', 'pink', 'violet', 'orange', 'green'];
    const metrics: ContentMetric[] = s.languageBreakdown.map((l, i) => ({
      title: `Từ vựng (${l.languageCode})`,
      value: this.formatNumber(l.count),
      iconId: 'icon-book',
      tone: tones[i % tones.length]
    }));
    metrics.push({ title: 'Kanji', value: this.formatNumber(s.totalKanji), iconId: 'icon-kanji', tone: 'violet' });
    metrics.push({ title: 'Bộ thủ', value: this.formatNumber(s.totalRadicals), iconId: 'icon-radical', tone: 'orange' });
    return metrics;
  });

  // ── Activity (live) ──────────────────────────────────────────────────────
  protected readonly activityRows = computed<ActivityRow[]>(() =>
    (this.stats()?.recentActivity ?? []).map((a) => ({
      timestamp: this.formatDateTime(a.timestamp),
      user: a.username,
      action: a.action,
      detail: a.description || '—',
      tone: this.actionTone(a.action)
    }))
  );

  // ── Language breakdown donut (live) ──────────────────────────────────────
  protected readonly languageBreakdown = computed<LanguageBreakdown[]>(() => {
    const items = this.stats()?.languageBreakdown ?? [];
    const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
    return items.map((l, index) => ({
      label: l.languageName,
      value: l.count,
      shareLabel: `${Math.round((l.count / total) * 100)}%`,
      color: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length]
    }));
  });

  protected readonly totalLessons = computed(() => this.languageBreakdown().reduce((total, item) => total + item.value, 0));
  protected readonly languageChartBackground = computed(() => this.buildDonutBackground(this.languageBreakdown()));

  // ── Static system status (infra health, not DB-derived) ──────────────────
  protected readonly systemStatuses: SystemStatus[] = [
    { title: 'Database', status: 'Hoạt động', iconId: 'icon-database', tone: 'blue' },
    { title: 'API Server', status: 'Hoạt động', iconId: 'icon-cloud', tone: 'blue' },
    { title: 'Storage', status: 'Hoạt động', iconId: 'icon-storage', tone: 'slate' },
    { title: 'Backup', status: 'Hoạt động', iconId: 'icon-refresh', tone: 'green' }
  ];

  // ── Formatting helpers ───────────────────────────────────────────────────
  protected formatAxisLabel(value: number): string {
    if (value === 0) return '0';
    return value >= 1000 ? `${value / 1000}K` : `${value}`;
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  private formatDelta(percent: number | undefined): string | undefined {
    if (percent == null) return undefined;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent}%`;
  }

  private initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private actionTone(action: string): ActivityRow['tone'] {
    const a = action.toLowerCase();
    if (a.includes('xóa') || a.includes('delete') || a.includes('remove')) return 'delete';
    if (a.includes('cập nhật') || a.includes('update') || a.includes('sửa') || a.includes('edit')) return 'update';
    if (a.includes('đăng nhập') || a.includes('login') || a.includes('logout')) return 'login';
    return 'create';
  }

  private formatRelativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Vừa xong';
    if (min < 60) return `${min} phút trước`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(iso).toLocaleDateString('vi-VN');
  }

  private formatDateTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString('vi-VN', { hour12: false });
  }

  private niceCeil(value: number): number {
    if (value <= 5) return 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return niceNormalized * magnitude;
  }

  // ── Chart geometry ───────────────────────────────────────────────────────
  private buildVerticalGrid(pointCount: number): number[] {
    if (pointCount <= 0) return [];
    const plotWidth = CHART_PLOT_RIGHT - CHART_PLOT_LEFT;
    const step = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;
    return Array.from({ length: pointCount }, (_, index) => CHART_PLOT_LEFT + step * index);
  }

  private buildHorizontalGrid(pointCount: number): number[] {
    if (pointCount <= 0) return [];
    const plotHeight = CHART_PLOT_BOTTOM - CHART_PLOT_TOP;
    const step = pointCount > 1 ? plotHeight / (pointCount - 1) : 0;
    return Array.from({ length: pointCount }, (_, index) => CHART_PLOT_TOP + step * index);
  }

  private buildChartSeries(values: number[], max: number): ChartSeries {
    if (values.length === 0) {
      return { points: [], polyline: '', areaPath: '' };
    }
    const plotWidth = CHART_PLOT_RIGHT - CHART_PLOT_LEFT;
    const plotHeight = CHART_PLOT_BOTTOM - CHART_PLOT_TOP;
    const step = values.length > 1 ? plotWidth / (values.length - 1) : 0;
    const safeMax = max > 0 ? max : 1;

    const points = values.map((value, index) => {
      const x = CHART_PLOT_LEFT + step * index;
      const y = CHART_PLOT_BOTTOM - (value / safeMax) * plotHeight;
      return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), value };
    });

    const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const areaPath = [
      `M ${firstPoint.x} ${CHART_PLOT_BOTTOM}`,
      `L ${polyline.replaceAll(',', ' ')}`,
      `L ${lastPoint.x} ${CHART_PLOT_BOTTOM}`,
      'Z'
    ].join(' ');

    return { points, polyline, areaPath };
  }

  private buildDonutBackground(items: LanguageBreakdown[]): string {
    if (items.length === 0) return 'conic-gradient(from -90deg, #e8edf7 0deg 360deg)';
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    let startAngle = 0;
    const segments = items
      .map((item) => {
        const sweep = (item.value / total) * 360;
        const endAngle = startAngle + sweep;
        const segment = `${item.color} ${startAngle.toFixed(2)}deg ${endAngle.toFixed(2)}deg`;
        startAngle = endAngle;
        return segment;
      })
      .join(', ');
    return `conic-gradient(from -90deg, ${segments})`;
  }
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

interface NavigationItem {
  label: string;
  iconId: string;
  route?: string;
  active?: boolean;
  hasChevron?: boolean;
}

interface SummaryCard {
  title: string;
  value: string;
  delta?: string;
  comparison?: string;
  iconId: string;
  tone: 'blue' | 'green' | 'violet' | 'orange' | 'cyan';
}

interface RecentUser {
  name: string;
  email: string;
  registeredAt: string;
  accent: string;
  avatarUrl?: string | null;
  initials?: string;
}

interface ContentMetric {
  title: string;
  value: string;
  iconId: string;
  tone: 'blue' | 'pink' | 'violet' | 'orange' | 'green';
}

interface SystemStatus {
  title: string;
  status: string;
  iconId: string;
  tone: 'blue' | 'slate' | 'green';
}

interface ActivityRow {
  timestamp: string;
  user: string;
  action: string;
  detail: string;
  tone: 'create' | 'update' | 'delete' | 'login';
}

interface LanguageBreakdown {
  label: string;
  value: number;
  shareLabel: string;
  color: string;
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
}

interface ChartSeries {
  points: ChartPoint[];
  polyline: string;
  areaPath: string;
}
