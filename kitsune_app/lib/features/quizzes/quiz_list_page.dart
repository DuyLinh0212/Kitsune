import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/quiz_provider.dart';

class QuizListPage extends ConsumerWidget {
  const QuizListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizzesAsync = ref.watch(publicQuizzesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Quiz cộng đồng')),
      body: KitsuneBackdrop(
        child: quizzesAsync.when(
          data: (quizzes) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                const KitsunePassportHeader(
                  eyebrow: 'Community quiz',
                  title: 'Khám phá những bộ đề người khác đang chia sẻ.',
                  subtitle:
                      'Chọn nhanh một quiz để kiểm tra vốn từ, tốc độ nhớ và cảm giác học hiện tại.',
                  accent: KitsuneColors.secondary,
                ),
                const SizedBox(height: AppTheme.space20),
                if (quizzes.isEmpty)
                  const KitsuneEmptyState(
                    icon: Icons.quiz_outlined,
                    title: 'Chưa có quiz công khai nào',
                    message: 'Hãy quay lại sau hoặc tự tạo quiz của bạn để mở màn.',
                  )
                else
                  ...quizzes.map((quiz) {
                    final questionCount = quiz.description.vocabIds.length +
                        quiz.description.kanjiIds.length;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: KitsuneSurface(
                        child: Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: KitsuneColors.secondarySurface,
                                borderRadius: BorderRadius.circular(18),
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
                                  const SizedBox(height: AppTheme.space4),
                                  Text(
                                    '$questionCount câu hỏi • ${quiz.creatorName ?? 'Cộng đồng'}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: AppTheme.space12),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(0, 40),
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 16),
                              ),
                              onPressed: () =>
                                  Navigator.pushNamed(context, '/quizzes/${quiz.id}'),
                              child: const Text('Làm bài'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(child: Text('Lỗi: $error')),
        ),
      ),
    );
  }
}
