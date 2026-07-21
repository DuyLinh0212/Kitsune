import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/grammar.dart';
import 'package:kitsune_app/providers/providers.dart';

class GrammarFilter {
  const GrammarFilter({this.query = '', this.jlptLevel});

  final String query;
  final int? jlptLevel;

  @override
  bool operator ==(Object other) =>
      other is GrammarFilter && other.query == query && other.jlptLevel == jlptLevel;

  @override
  int get hashCode => Object.hash(query, jlptLevel);
}

final grammarPointsProvider = FutureProvider.family<List<GrammarPoint>, GrammarFilter>((ref, filter) {
  return ref.watch(kitsuneApiProvider).searchGrammar(
        query: filter.query,
        jlptLevel: filter.jlptLevel,
      );
});
