// kitsune_app/lib/core/models/srs.dart

enum SrsItemType { vocabulary, kanji }

class SrsVocabularyExample {
  final String word;
  final String? pronunciation;
  final String meaning;

  const SrsVocabularyExample({
    required this.word,
    this.pronunciation,
    required this.meaning,
  });
}

class SRSCardDto {
  final int id;
  final int userId;
  final int folderId;
  final SrsItemType type;
  final int? vocabularyId;
  final int? kanjiId;
  final String word;
  final String? pronunciation;
  final String meaning;
  final String? character;
  final String? amHanViet;
  final String? radicalCharacter;
  final String? radicalName;
  final String? onyomi;
  final String? kunyomi;
  final List<SrsVocabularyExample> examples;
  final int? strokeCount;
  final int boxLevel;
  final int wrongReviewCount;
  final String nextReviewDate;
  final bool isDue;
  final bool isNew;

  const SRSCardDto({
    required this.id,
    required this.userId,
    required this.folderId,
    required this.type,
    this.vocabularyId,
    this.kanjiId,
    required this.word,
    this.pronunciation,
    required this.meaning,
    this.character,
    this.amHanViet,
    this.radicalCharacter,
    this.radicalName,
    this.onyomi,
    this.kunyomi,
    this.examples = const [],
    this.strokeCount,
    required this.boxLevel,
    this.wrongReviewCount = 0,
    required this.nextReviewDate,
    required this.isDue,
    required this.isNew,
  });
}

class SrsCardProgressUpdate {
  final int cardId;
  final int boxLevel;
  final double intervalDays;
  final String nextReviewDate;
  final int wrongReviewCountDelta;

  const SrsCardProgressUpdate({
    required this.cardId,
    required this.boxLevel,
    required this.intervalDays,
    required this.nextReviewDate,
    required this.wrongReviewCountDelta,
  });
}

class FolderSrsOverview {
  final int folderId;
  final String folderName;
  final int totalCards;
  final int newCards;
  final int dueCards;
  final int learnedCards;
  final int masteredCards;
  final int todayNewLearned;
  final String? nextDueAt;
  final bool canSwitchFolder;

  const FolderSrsOverview({
    required this.folderId,
    required this.folderName,
    required this.totalCards,
    required this.newCards,
    required this.dueCards,
    required this.learnedCards,
    required this.masteredCards,
    required this.todayNewLearned,
    this.nextDueAt,
    required this.canSwitchFolder,
  });
}

class FolderSrsSession {
  final int folderId;
  final String folderName;
  final FolderSrsOverview overview;
  final List<SRSCardDto> cards;
  final List<SRSCardDto> flashcards;
  final List<SRSCardDto> quizCards;

  const FolderSrsSession({
    required this.folderId,
    required this.folderName,
    required this.overview,
    required this.cards,
    required this.flashcards,
    required this.quizCards,
  });
}
