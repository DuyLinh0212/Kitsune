import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/exam.dart';
import 'package:kitsune_app/providers/providers.dart';

class ExamFilter {
  const ExamFilter({this.query = '', this.jlptLevel});

  final String query;
  final int? jlptLevel;

  @override
  bool operator ==(Object other) =>
      other is ExamFilter && other.query == query && other.jlptLevel == jlptLevel;

  @override
  int get hashCode => Object.hash(query, jlptLevel);
}

final publicExamsProvider = FutureProvider.family<List<ExamSummary>, ExamFilter>((ref, filter) {
  return ref.watch(kitsuneApiProvider).listPublicExams(
        query: filter.query,
        jlptLevel: filter.jlptLevel,
      );
});

final examDetailProvider = FutureProvider.family<ExamDetail, int>((ref, examId) {
  return ref.watch(kitsuneApiProvider).getExamForPlay(examId);
});
