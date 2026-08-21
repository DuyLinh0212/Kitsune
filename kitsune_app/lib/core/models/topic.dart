// kitsune_app/lib/core/models/topic.dart

class TopicDto {
  final int id;
  final String title;
  final String description;
  final int? jlptLevel;
  final List<LessonDto> lessons;

  const TopicDto(
      {required this.id,
      required this.title,
      required this.description,
      this.jlptLevel,
      required this.lessons});
}

class LessonDto {
  final int id;
  final int topicId;
  final String title;
  final String description;
  final int orderIndex;
  final int estimatedMinutes;
  final int itemCount;
  final int completedItemCount;
  final List<LessonItemDto> items;

  const LessonDto(
      {required this.id,
      required this.topicId,
      required this.title,
      required this.description,
      required this.orderIndex,
      required this.estimatedMinutes,
      this.itemCount = 0,
      this.completedItemCount = 0,
      this.items = const []});

  double get progress =>
      itemCount == 0 ? 0 : (completedItemCount / itemCount).clamp(0, 1);
}

class LessonItemDto {
  final int id;
  final int? vocabularyId;
  final int? kanjiId;
  final String word;
  final String pronunciation;
  final String? amHanViet;
  final String meaning;
  final String? exampleSentence;
  final String? exampleTranslation;

  const LessonItemDto(
      {required this.id,
      this.vocabularyId,
      this.kanjiId,
      required this.word,
      required this.pronunciation,
      this.amHanViet,
      required this.meaning,
      this.exampleSentence,
      this.exampleTranslation});
}

class GameVocabularyDto {
  final int id;
  final String word;
  final String pronunciation;
  final String meaning;

  const GameVocabularyDto(
      {required this.id,
      required this.word,
      required this.pronunciation,
      required this.meaning});
}
