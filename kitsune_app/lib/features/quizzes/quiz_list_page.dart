import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';
import 'package:kitsune_app/providers/quiz_provider.dart';

class QuizListPage extends ConsumerWidget {
  const QuizListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizzesAsync = ref.watch(publicQuizzesProvider);
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.communityQuizzesTitle)),
      body: KitsuneBackdrop(
        child: quizzesAsync.when(
          data: (quizzes) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                KitsuneHeroCard(
                  title: strings.communityQuizzesSubtitle,
                  subtitle: strings.communityQuizzesHeroSubtitle,
                  accent: KitsuneColors.secondary,
                ),
                const SizedBox(height: AppTheme.space20),
                if (quizzes.isEmpty)
                  KitsuneEmptyState(
                    icon: Icons.quiz_outlined,
                    title: strings.noCommunityQuizzesTitle,
                    message: strings.noCommunityQuizzesMessage,
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
                                    strings.formatQuizItemSubtitle(
                                      questionCount,
                                      quiz.creatorName ?? strings.communityCreatorLabel,
                                    ),
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
                              child: Text(strings.playButton),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () => KitsuneLoadingFox(message: strings.loadingQuiz),
          error: (error, _) => Center(child: Text(strings.commonError(error))),
        ),
      ),
    );
  }
}
