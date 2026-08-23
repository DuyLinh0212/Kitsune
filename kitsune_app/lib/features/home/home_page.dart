import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/services/app_usage_service.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/dashboard_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int? _userId;
  List<double> _weekUsageHours = List<double>.filled(7, 0);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadUserId());
  }

  Future<void> _loadUserId() async {
    final api = ref.read(kitsuneApiProvider);
    try {
      final userId = await api.getCurrentUserId();
      final usageHours = await AppUsageService.instance.loadWeekHours();
      if (mounted) {
        setState(() {
          _userId = userId;
          _weekUsageHours = usageHours;
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user =
        authState.valueOrNull ?? ref.read(authProvider.notifier).currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trang chủ'),
      ),
      body: KitsuneBackdrop(
        child: _userId == null
            ? const KitsuneLoadingFox(message: 'Đang tải...')
            : RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(userStatsProvider(_userId!));
                  ref.invalidate(weekChartProvider(_userId!));
                  ref.invalidate(dashboardQuizzesProvider(_userId!));
                  ref.invalidate(leaderboardProvider);
                  await _loadUserId();
                },
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                  children: [
                    _buildHero(user),
                    const SizedBox(height: AppTheme.space16),
                    _buildQuickActions(),
                    const SizedBox(height: AppTheme.space24),
                    const KitsuneSectionHeader(
                      title: 'Nhịp học tuần này',
                    ),
                    const SizedBox(height: AppTheme.space12),
                    _buildWeekChart(),
                    const SizedBox(height: AppTheme.space24),
                    KitsuneSectionHeader(
                      title: 'Quiz của bạn',
                      subtitle: 'Ôn lại bộ đề bạn đã tạo hoặc chơi lại ngay.',
                      actionLabel: 'Mở bộ quiz',
                      onAction: () =>
                          Navigator.pushNamed(context, '/my_quizzes'),
                    ),
                    const SizedBox(height: AppTheme.space12),
                    _buildMyQuizzes(),
                    const SizedBox(height: AppTheme.space24),
                    KitsuneSectionHeader(
                      title: 'Bảng xếp hạng',
                      subtitle: 'Nhìn nhanh mặt bằng chung của cộng đồng.',
                      actionLabel: 'Chi tiết',
                      onAction: () =>
                          Navigator.pushNamed(context, '/leaderboard'),
                    ),
                    const SizedBox(height: AppTheme.space12),
                    _buildLeaderboardPreview(),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildHero(dynamic user) {
    final statsAsync = ref.watch(userStatsProvider(_userId!));
    return statsAsync.when(
      data: (stats) {
        return KitsuneHeroCard(
          title:
              'Xin chào ${user?.displayName ?? 'bạn'}, hôm nay mình học gì tiếp?',
          subtitle: stats.srsCardsDue > 0
              ? 'Bạn đang có ${stats.srsCardsDue} thẻ đến hạn. Đây là lúc tốt nhất để giữ nhịp nhớ lâu.'
              : 'Hôm nay chưa có thẻ đến hạn. Bạn có thể mở một bài học hoặc thử quiz mới.',
          trailing: Column(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: KitsuneColors.primarySurface,
                child: Text(
                  kitsuneInitials(user?.displayName ?? 'U'),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: KitsuneColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.space12),
              if (stats.srsCardsDue > 0)
                SizedBox(
                  width: 104,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(context, '/srs'),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(0, 40),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                    child: const Text('Ôn ngay'),
                  ),
                ),
            ],
          ),
          margin: EdgeInsets.zero,
        );
      },
      loading: () => const KitsuneSurface(
        child: SizedBox(height: 160),
      ),
      error: (_, __) => const KitsuneSurface(
        child: SizedBox(height: 160),
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      (
        label: 'Ôn tập',
        detail: 'Giữ nhịp SRS',
        icon: Icons.auto_awesome_motion_rounded,
        color: KitsuneColors.primary,
        route: '/srs',
      ),
      (
        label: 'Quiz',
        detail: 'Luyện phản xạ',
        icon: Icons.quiz_rounded,
        color: KitsuneColors.secondary,
        route: '/quizzes',
      ),
      (
        label: 'Đề kiểm tra',
        detail: 'Đo tiến bộ',
        icon: Icons.assignment_rounded,
        color: KitsuneColors.stamp,
        route: '/exams',
      ),
      (
        label: 'Cộng đồng',
        detail: 'Xem xếp hạng',
        icon: Icons.groups_rounded,
        color: KitsuneColors.success,
        route: '/leaderboard',
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 1.75,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return KitsuneSurface(
          onTap: () => Navigator.pushNamed(context, action.route),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: action.color.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(action.icon, color: action.color, size: 21),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      action.label,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    Text(
                      action.detail,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildWeekChart() {
    final data = _weekUsageHours;
    final maxValue = data.reduce((a, b) => a > b ? a : b).clamp(0.25, 999999);
    final totalHours = data.fold<double>(0, (sum, value) => sum + value);
    final days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return KitsuneSurface(
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              KitsuneMetricPill(
                label: 'Streak',
                value:
                    '${ref.watch(userStatsProvider(_userId!)).valueOrNull?.streak ?? 0} ngày',
                icon: Icons.local_fire_department_rounded,
                color: KitsuneColors.primary,
              ),
              KitsuneMetricPill(
                label: 'Thời gian mở app',
                value: _formatWeekDuration(totalHours),
                icon: Icons.schedule_rounded,
                color: KitsuneColors.stamp,
              ),
            ],
          ),
          const SizedBox(height: AppTheme.space18),
          SizedBox(
            height: 132,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: List.generate(7, (index) {
                final isToday = index == DateTime.now().weekday % 7;
                final barHeight = data[index] > 0
                    ? (data[index] / maxValue * 76).clamp(8.0, 76.0)
                    : 8.0;

                return Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        _formatWeekDuration(data[index]),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isToday
                              ? KitsuneColors.primary
                              : KitsuneColors.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 6),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        width: 28,
                        height: barHeight,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: isToday
                                ? [
                                    KitsuneColors.primary,
                                    KitsuneColors.primaryLight,
                                  ]
                                : [
                                    KitsuneColors.secondary,
                                    KitsuneColors.secondaryLight,
                                  ],
                          ),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        days[index],
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight:
                              isToday ? FontWeight.w800 : FontWeight.w600,
                          color: isToday
                              ? KitsuneColors.primary
                              : KitsuneColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  String _formatWeekDuration(double hours) {
    final totalMinutes = (hours * 60).round().clamp(0, 2147483647);
    if (totalMinutes < 60) return '$totalMinutes phút';

    final displayHours = (totalMinutes / 60).toStringAsFixed(1);
    final normalizedHours = double.parse(displayHours).toString();
    return '$normalizedHours giờ';
  }

  Widget _buildMyQuizzes() {
    final quizzes = ref.watch(dashboardQuizzesProvider(_userId!));
    return quizzes.when(
      data: (items) {
        if (items.isEmpty) {
          return KitsuneEmptyState(
            icon: Icons.quiz_outlined,
            title: 'Bạn chưa tạo quiz nào',
            message:
                'Dựng một bộ quiz riêng để luyện đúng phần từ vựng bạn đang học.',
            action: SizedBox(
              width: 180,
              child: ElevatedButton(
                onPressed: () =>
                    Navigator.pushNamed(context, '/quizzes/create'),
                child: const Text('Tạo quiz'),
              ),
            ),
          );
        }

        return Column(
          children: items.map((quiz) {
            final hasAccuracy = quiz.lastAccuracy != null;
            final accent = hasAccuracy && quiz.lastAccuracy! >= 70
                ? KitsuneColors.success
                : KitsuneColors.stamp;

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: KitsuneSurface(
                onTap: () => Navigator.pushNamed(context, '/my_quizzes'),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: KitsuneColors.secondarySurface,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.quiz_rounded,
                        color: KitsuneColors.secondary,
                      ),
                    ),
                    const SizedBox(width: AppTheme.space12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            quiz.title,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            hasAccuracy
                                ? 'Lần gần nhất: ${quiz.lastAccuracy!.round()}% chính xác'
                                : 'Chưa có lượt làm nào gần đây',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppTheme.space12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        hasAccuracy ? '${quiz.lastAccuracy!.round()}%' : 'Mới',
                        style: TextStyle(
                          color: accent,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
      loading: () => const KitsuneSurface(child: SizedBox(height: 140)),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildLeaderboardPreview() {
    final leaderboard = ref.watch(leaderboardProvider);
    return leaderboard.when(
      data: (items) {
        if (items.isEmpty) {
          return const KitsuneEmptyState(
            icon: Icons.leaderboard_outlined,
            title: 'Bảng xếp hạng đang trống',
            message:
                'Hoàn thành quiz để bắt đầu xuất hiện trên đường đua cộng đồng.',
          );
        }

        final preview = items.take(5).toList();
        return KitsuneSurface(
          padding: const EdgeInsets.all(AppTheme.space8),
          child: Column(
            children: preview.map((item) {
              final accent = item.rank == 1
                  ? KitsuneColors.stamp
                  : item.rank == 2
                      ? KitsuneColors.secondary
                      : KitsuneColors.primary;

              return Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppTheme.space8,
                  vertical: AppTheme.space8,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          '#${item.rank}',
                          style: TextStyle(
                            color: accent,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppTheme.space12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.name,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            '${item.quizCount} quiz • ${item.correctAnswers} câu đúng',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${item.accuracy.round()}%',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: accent,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        );
      },
      loading: () => const KitsuneSurface(child: SizedBox(height: 180)),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
