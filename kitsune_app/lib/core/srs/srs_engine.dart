// kitsune_app/lib/core/srs/srs_engine.dart

import 'package:kitsune_app/core/constants/app_constants.dart';

/// Pure box-level spaced-repetition math (0-7), independent of any network call.
class SrsEngine {
  static int normalizeLevel(int? level) => (level ?? 0).clamp(0, 7);

  static int resolveNextLevel(int current, bool correct) {
    if (correct) return (current + 1).clamp(0, 7);
    switch (current) {
      case 0:
      case 1:
      case 2:
        return 1;
      case 3:
        return 2;
      case 4:
        return 3;
      case 5:
      case 6:
        return 4;
      case 7:
        return 5;
      default:
        return 1;
    }
  }

  static String computeNextReviewDate(int level) {
    final interval = AppConstants.srsIntervals[level] ?? Duration.zero;
    return DateTime.now().add(interval).toIso8601String();
  }

  /// Returns true only when a learned card's stored review timestamp has arrived.
  /// A malformed or absent timestamp is never treated as immediately due.
  static bool isScheduledReviewDue({
    required int level,
    required String nextReviewDate,
    DateTime? now,
  }) {
    if (level <= 0) return false;
    final dueAt = DateTime.tryParse(nextReviewDate);
    return dueAt != null && !dueAt.isAfter(now ?? DateTime.now());
  }

  static String effectiveNextReviewDate({
    required int level,
    required String? storedNextReviewDate,
    required String? lastReviewedAt,
    DateTime? now,
  }) {
    final storedValue = storedNextReviewDate ?? '';
    if (DateTime.tryParse(storedValue) == null) return '';

    // The persisted timestamp is the source of truth. Never make a card due
    // earlier in the client merely because a schedule has since been shortened.
    return storedValue;
  }

  static int intervalDays(int level) {
    final interval = AppConstants.srsIntervals[level] ?? Duration.zero;
    if (interval == Duration.zero) return 0;
    return interval.inDays == 0 ? 1 : interval.inDays;
  }

  static int resolveReps(int current, int next, bool correct) {
    if (!correct) return (current - next).clamp(0, current);
    return current >= next ? current + 1 : 1;
  }

  static String encodeKey(int? vocabId, int? kanjiId) =>
      '${vocabId ?? 'v'}:${kanjiId ?? 'k'}';
}
