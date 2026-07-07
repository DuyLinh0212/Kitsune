// kitsune_app/lib/core/models/dashboard.dart

class UserStats {
  final int streak;
  final int totalXP;
  final int srsCardsDue;

  const UserStats({
    this.streak = 0,
    this.totalXP = 0,
    this.srsCardsDue = 0,
  });
}

class DashboardFolder {
  final int id;
  final String name;
  final int vocabCount;

  const DashboardFolder({
    required this.id,
    required this.name,
    required this.vocabCount,
  });
}

class DashboardQuiz {
  final int id;
  final String title;
  final double? lastAccuracy;
  final String? lastAttemptDate;

  const DashboardQuiz({
    required this.id,
    required this.title,
    this.lastAccuracy,
    this.lastAttemptDate,
  });
}

class LeaderboardItem {
  final int rank;
  final String name;
  final double accuracy;
  final int quizCount;
  final int correctAnswers;

  const LeaderboardItem({
    required this.rank,
    required this.name,
    required this.accuracy,
    required this.quizCount,
    required this.correctAnswers,
  });
}

class SearchResult {
  final int id;
  final SearchType type;
  final String primary;
  final String reading;
  final String meaning;

  const SearchResult({
    required this.id,
    required this.type,
    required this.primary,
    required this.reading,
    required this.meaning,
  });
}

enum SearchType { vocab, kanji }
