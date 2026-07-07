// kitsune_app/lib/providers/kanji_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/providers/providers.dart';

final kanjiSearchProvider = FutureProvider.family<List<KanjiDetailDto>, String>((ref, query) async {
  if (query.trim().isEmpty) return [];
  final api = ref.watch(kitsuneApiProvider);
  return api.searchKanji(query.trim());
});

final kanjiRandomProvider = FutureProvider.family<List<KanjiDetailDto>, int>((ref, limit) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getRandomKanji(limit: limit);
});

final kanjiDetailProvider = FutureProvider.family<KanjiDetailDto, int>((ref, id) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getKanjiById(id);
});
