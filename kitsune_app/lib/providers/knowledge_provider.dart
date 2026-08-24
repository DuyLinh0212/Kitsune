import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/learning_knowledge.dart';
import 'package:kitsune_app/providers/providers.dart';

final knowledgeGraphProvider =
    FutureProvider.autoDispose<LearningKnowledgeGraph>((ref) {
  return ref.watch(kitsuneApiProvider).loadKnowledgeGraph();
});

final examKnowledgeGraphProvider = FutureProvider.autoDispose
    .family<LearningKnowledgeGraph, int>((ref, attemptId) {
  return ref.watch(kitsuneApiProvider).loadExamKnowledgeGraph(attemptId);
});
