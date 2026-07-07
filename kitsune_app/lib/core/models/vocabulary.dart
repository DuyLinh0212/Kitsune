// kitsune_app/lib/core/models/vocabulary.dart

class VocabularyDto {
  final int id;
  final int folderId;
  final String folderName;
  final int languageId;
  final String languageCode;
  final String languageName;
  final String word;
  final String? pronunciation;
  final String meaning;
  final Map<String, dynamic>? specificData;
  final String createdAt;
  final List<KanjiComponentDto> kanjiComponents;
  final bool isPinned;

  const VocabularyDto({
    required this.id,
    required this.folderId,
    this.folderName = '',
    required this.languageId,
    this.languageCode = '',
    this.languageName = '',
    required this.word,
    this.pronunciation,
    required this.meaning,
    this.specificData,
    required this.createdAt,
    this.kanjiComponents = const [],
    this.isPinned = false,
  });

  factory VocabularyDto.fromJson(Map<String, dynamic> json) {
    final folder = json['VocabularyFolder'] as Map<String, dynamic>?;
    final lang = json['Languages'] as Map<String, dynamic>?;
    final comps = json['KanjiComponents'] as List<dynamic>?;

    return VocabularyDto(
      id: json['Id'] as int,
      folderId: json['FolderId'] as int,
      folderName: folder?['FolderName'] as String? ?? '',
      languageId: json['LanguageId'] as int,
      languageCode: lang?['LanguageCode'] as String? ?? '',
      languageName: lang?['LanguageName'] as String? ?? '',
      word: json['Word'] as String,
      pronunciation: json['Pronunciation'] as String?,
      meaning: json['Meaning'] as String,
      specificData: json['SpecificData'] as Map<String, dynamic>?,
      createdAt: json['CreatedAt'] as String,
      kanjiComponents: (comps ?? [])
          .map((c) => KanjiComponentDto.fromJson(c as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => a.order.compareTo(b.order)),
      isPinned: (json['IsPinned'] ?? false) as bool,
    );
  }
}

class KanjiComponentDto {
  final int kanjiId;
  final String character;
  final String amHanViet;
  final int order;

  const KanjiComponentDto({
    required this.kanjiId,
    required this.character,
    required this.amHanViet,
    required this.order,
  });

  factory KanjiComponentDto.fromJson(Map<String, dynamic> json) {
    final kanji = json['Kanji'] as Map<String, dynamic>?;
    return KanjiComponentDto(
      kanjiId: (kanji?['Id'] ?? json['KanjiId']) as int,
      character: kanji?['Character'] as String? ?? '',
      amHanViet: kanji?['AmHanViet'] as String? ?? '',
      order: (json['Order'] ?? 0) as int,
    );
  }
}
