// kitsune_app/lib/core/srs/srs_engine.dart

import 'package:kitsune_app/core/constants/app_constants.dart';

/// Pure box-level spaced-repetition math (0-7), independent of any network call.
class SrsEngine {
  static const Map<int, Duration> _legacyIntervals = {
    1: Duration(hours: 1),
    2: Duration(days: 1),
    3: Duration(days: 3),
    4: Duration(days: 7),
    5: Duration(days: 14),
    6: Duration(days: 30),
    7: Duration(days: 90),
  };

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

  static String effectiveNextReviewDate({
    required int level,
    required String? storedNextReviewDate,
    required String? lastReviewedAt,
    DateTime? now,
  }) {
    final current = now ?? DateTime.now();
    final fallback = current.toIso8601String();
    final storedValue = storedNextReviewDate ?? fallback;
    final shortenedInterval = AppConstants.srsIntervals[level] ?? Duration.zero;
    if (level == 0 || shortenedInterval == Duration.zero) return storedValue;

    final stored = DateTime.tryParse(storedValue);
    if (stored == null) {
      return storedValue;
    }

    if (lastReviewedAt == null) {
      final latestCurrentSchedule = current.add(shortenedInterval);
      if (!stored.isAfter(latestCurrentSchedule)) return storedValue;

      final legacyInterval = _legacyIntervals[level] ?? shortenedInterval;
      return stored
          .subtract(legacyInterval)
          .add(shortenedInterval)
          .toIso8601String();
    }

    final lastReviewed = DateTime.tryParse(lastReviewedAt);
    if (lastReviewed == null) return storedValue;

    final shortened = lastReviewed.add(shortenedInterval);
    return shortened.isBefore(stored)
        ? shortened.toIso8601String()
        : storedValue;
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
