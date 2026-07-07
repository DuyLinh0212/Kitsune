// kitsune_app/lib/core/models/srs.dart

enum SrsItemType { vocabulary, kanji }

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
  final String? onyomi;
  final String? kunyomi;
  final int? strokeCount;
  final int boxLevel;
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
    this.onyomi,
    this.kunyomi,
    this.strokeCount,
    required this.boxLevel,
    required this.nextReviewDate,
    required this.isDue,
    required this.isNew,
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
