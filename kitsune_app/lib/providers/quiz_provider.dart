// kitsune_app/lib/providers/quiz_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/providers/providers.dart';

final publicQuizzesProvider = FutureProvider<List<QuizMeta>>((ref) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getPublicQuizzes();
});

final myQuizzesProvider = FutureProvider<List<QuizMeta>>((ref) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getMyQuizzes();
});

final quizDetailProvider = FutureProvider.family<QuizMeta, int>((ref, quizId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getQuiz(quizId);
});

final quizQuestionsProvider = FutureProvider.family<List<QuizQuestion>, QuizMeta>((ref, quiz) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.generateQuizQuestions(quiz);
});
