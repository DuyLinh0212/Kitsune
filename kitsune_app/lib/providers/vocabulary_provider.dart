// kitsune_app/lib/providers/vocabulary_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/providers/providers.dart';

final vocabularySearchProvider = FutureProvider.family<List<VocabularyDto>, String>((ref, query) async {
  if (query.trim().isEmpty) return [];
  final api = ref.watch(kitsuneApiProvider);
  return api.searchVocabulary(query.trim());
});

final vocabularyRandomProvider = FutureProvider.family<List<VocabularyDto>, int>((ref, limit) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getRandomVocabulary(limit: limit);
});

final vocabularyDetailProvider = FutureProvider.family<VocabularyDto, int>((ref, id) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getVocabularyById(id);
});

final vocabularyBookmarkProvider = StateProvider.family<bool, int>((ref, vocabId) => false);
