// kitsune_app/lib/core/constants/app_constants.dart

class AppConstants {
  // Search debounce
  static const int searchDebounceMs = 350;

  // SRS box level intervals (ms)
  static const Map<int, Duration> srsIntervals = {
    0: Duration.zero,
    1: Duration(hours: 4),
    2: Duration(days: 1),
    3: Duration(days: 3),
    4: Duration(days: 7),
    5: Duration(days: 14),
    6: Duration(days: 30),
    7: Duration(days: 90),
  };

  // SRS box level labels
  static const Map<int, String> srsLevelLabels = {
    0: 'Mới',
    1: 'Học 1',
    2: 'Học 2',
    3: 'Học 3',
    4: 'Ôn 1',
    5: 'Ôn 2',
    6: 'Ôn 3',
    7: 'Thành thạo',
  };

  // Quiz modes
  static const List<String> vocabModes = [
    'MEAN_FROM_WORD',
    'WORD_FROM_MEAN',
    'FILL_BLANK',
  ];

  static const List<String> kanjiModes = [
    'ON_KUN_READ',
    'HAN_VIET',
    'COMPOSE_KANJI',
  ];

  // Active folder storage key
  static const String activeFolderKey = 'kitsune.srs.activeFolderId';

  // Active dates storage key prefix
  static const String activeDatesPrefix = 'kitsune.active_dates.';
}
