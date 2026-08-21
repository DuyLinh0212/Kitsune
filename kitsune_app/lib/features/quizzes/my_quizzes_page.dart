import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/quiz_provider.dart';

class MyQuizzesPage extends ConsumerWidget {
  const MyQuizzesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizzesAsync = ref.watch(myQuizzesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quiz của tôi')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/quizzes/create'),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Tạo quiz'),
      ),
      body: KitsuneBackdrop(
        child: quizzesAsync.when(
          data: (quizzes) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              children: [
                const KitsuneHeroCard(
                  title: 'Những bộ đề bạn tự thiết kế để học theo cách riêng.',
                  subtitle:
                      'Tập trung vào đúng nhóm từ hoặc kanji bạn muốn luyện, rồi chơi lại bất cứ lúc nào.',
                  accent: KitsuneColors.primary,
                ),
                const SizedBox(height: AppTheme.space20),
                if (quizzes.isEmpty)
                  KitsuneEmptyState(
                    icon: Icons.add_circle_outline_rounded,
                    title: 'Bạn chưa có quiz nào',
                    message:
                        'Tạo bộ quiz đầu tiên để kiểm tra đúng phần kiến thức mình đang học.',
                    action: SizedBox(
                      width: 190,
                      child: ElevatedButton.icon(
                        onPressed: () =>
                            Navigator.pushNamed(context, '/quizzes/create'),
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Tạo quiz ngay'),
                      ),
                    ),
                  )
                else
                  ...quizzes.map((quiz) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: KitsuneSurface(
                        child: Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: KitsuneColors.primarySurface,
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: const Icon(
                                Icons.quiz_rounded,
                                color: KitsuneColors.primary,
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
                                  const SizedBox(height: AppTheme.space4),
                                  Text(
                                    '${quiz.description.modes.length} chế độ • ${quiz.description.vocabIds.length + quiz.description.kanjiIds.length} mục',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(0, 40),
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 16),
                              ),
                              onPressed: () =>
                                  Navigator.pushNamed(context, '/quizzes/${quiz.id}'),
                              child: const Text('Chơi'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () => const KitsuneLoadingFox(message: 'Đang tải quiz của bạn...'),
          error: (error, _) => Center(child: Text('Lỗi: $error')),
        ),
      ),
    );
  }
}
