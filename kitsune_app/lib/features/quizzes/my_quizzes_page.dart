import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';
import 'package:kitsune_app/providers/quiz_provider.dart';

class MyQuizzesPage extends ConsumerWidget {
  const MyQuizzesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizzesAsync = ref.watch(myQuizzesProvider);
    final strings = ref.watch(stringsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(strings.myQuizzesTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/quizzes/create'),
        icon: const Icon(Icons.add_rounded),
        label: Text(strings.createQuizFAB),
      ),
      body: KitsuneBackdrop(
        child: quizzesAsync.when(
          data: (quizzes) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              children: [
                KitsuneHeroCard(
                  title: strings.myQuizzesHeroTitle,
                  subtitle: strings.myQuizzesHeroDesc,
                  accent: KitsuneColors.primary,
                ),
                const SizedBox(height: AppTheme.space20),
                if (quizzes.isEmpty)
                  KitsuneEmptyState(
                    icon: Icons.add_circle_outline_rounded,
                    title: strings.noMyQuizzesTitle,
                    message: strings.noMyQuizzesMessage,
                    action: SizedBox(
                      width: 190,
                      child: ElevatedButton.icon(
                        onPressed: () =>
                            Navigator.pushNamed(context, '/quizzes/create'),
                        icon: const Icon(Icons.add_rounded),
                        label: Text(strings.createQuizNow),
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
                                    strings.formatMyQuizSubtitle(
                                      quiz.description.modes.length,
                                      quiz.description.vocabIds.length +
                                          quiz.description.kanjiIds.length,
                                    ),
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
                              child: Text(strings.playQuizButton),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            );
          },
          loading: () => KitsuneLoadingFox(message: strings.loadingMyQuizzes),
          error: (error, _) => Center(child: Text(strings.commonError(error))),
        ),
      ),
    );
  }
}
