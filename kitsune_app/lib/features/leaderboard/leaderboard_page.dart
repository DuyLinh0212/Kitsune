import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/dashboard_provider.dart';

class LeaderboardPage extends ConsumerWidget {
  const LeaderboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leaderboardAsync = ref.watch(leaderboardProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Bảng xếp hạng')),
      body: KitsuneBackdrop(
        child: leaderboardAsync.when(
          data: (items) {
            if (items.isEmpty) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: KitsuneEmptyState(
                  icon: Icons.leaderboard_outlined,
                  title: 'Chưa có dữ liệu xếp hạng',
                  message:
                      'Hoàn thành quiz để xuất hiện trong đường đua cộng đồng.',
                ),
              );
            }

            final top3 = items.take(3).toList();
            final rest = items.skip(3).toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                const KitsuneHeroCard(
                  title: 'Những người đang giữ nhịp quiz tốt nhất.',
                  subtitle:
                      'Một cái nhìn nhanh vào độ chính xác, số lượt làm và ai đang dẫn đầu trong cộng đồng.',
                  accent: KitsuneColors.stamp,
                ),
                const SizedBox(height: AppTheme.space20),
                if (top3.isNotEmpty) _buildPodium(context, top3),
                if (rest.isNotEmpty) ...[
                  const SizedBox(height: AppTheme.space20),
                  const KitsuneSectionHeader(
                    title: 'Các vị trí còn lại',
                    subtitle: 'Theo dõi phần còn lại của bảng mà không mất nhịp.',
                  ),
                  const SizedBox(height: AppTheme.space12),
                  KitsuneSurface(
                    padding: const EdgeInsets.all(AppTheme.space8),
                    child: Column(
                      children: rest.map((item) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppTheme.space8,
                            vertical: AppTheme.space8,
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: KitsuneColors.surfaceVariant,
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Center(
                                  child: Text(
                                    '#${item.rank}',
                                    style: AppTheme.numeralStyle(
                                      fontSize: 14,
                                      color: KitsuneColors.onSurfaceVariant,
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
                                style: AppTheme.numeralStyle(
                                  fontSize: 16,
                                  color: KitsuneColors.primary,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('Lỗi: $error')),
        ),
      ),
    );
  }

  Widget _buildPodium(BuildContext context, List<dynamic> top3) {
    final medalColors = [
      KitsuneColors.stamp,
      KitsuneColors.secondary,
      KitsuneColors.primary,
    ];
    final order = top3.length >= 3 ? [1, 0, 2] : [0];
    final heights = [126.0, 164.0, 106.0];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: order.map((sourceIndex) {
        final item = top3[sourceIndex];
        final visualIndex = order.indexOf(sourceIndex);
        final color = medalColors[sourceIndex];

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: color.withValues(alpha: 0.14),
                  child: Text(
                    item.name.isNotEmpty ? item.name.substring(0, 1).toUpperCase() : '?',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: color,
                    ),
                  ),
                ),
                const SizedBox(height: AppTheme.space8),
                Text(
                  item.name,
                  style: Theme.of(context).textTheme.titleSmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: AppTheme.space4),
                Text(
                  '${item.accuracy.round()}%',
                  style: AppTheme.numeralStyle(
                    fontSize: 14,
                    color: color,
                  ),
                ),
                const SizedBox(height: AppTheme.space8),
                Container(
                  height: heights[visualIndex],
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.14),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(18),
                    ),
                    border: Border.all(color: color.withValues(alpha: 0.28)),
                  ),
                  child: Center(
                    child: Text(
                      '#${item.rank}',
                      style: AppTheme.numeralStyle(
                        fontSize: 18,
                        color: color,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
