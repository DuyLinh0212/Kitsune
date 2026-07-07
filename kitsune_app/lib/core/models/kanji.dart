// kitsune_app/lib/core/models/kanji.dart

class KanjiDetailDto {
  final int id;
  final String character;
  final String? onyomi;
  final String? kunyomi;
  final String amHanViet;
  final String meaning;
  final int strokeCount;
  final int? jlptLevel;
  final String? mnemonic;
  final RadicalDto? radical;

  const KanjiDetailDto({
    required this.id,
    required this.character,
    this.onyomi,
    this.kunyomi,
    required this.amHanViet,
    required this.meaning,
    required this.strokeCount,
    this.jlptLevel,
    this.mnemonic,
    this.radical,
  });

  factory KanjiDetailDto.fromJson(Map<String, dynamic> json) {
    final radical = json['Radical'] as Map<String, dynamic>?;
    return KanjiDetailDto(
      id: json['Id'] as int,
      character: json['Character'] as String,
      onyomi: json['Onyomi'] as String?,
      kunyomi: json['Kunyomi'] as String?,
      amHanViet: json['AmHanViet'] as String,
      meaning: json['Meaning'] as String,
      strokeCount: (json['StrokeCount'] as num).toInt(),
      jlptLevel: (json['JlptLevel'] as num?)?.toInt(),
      mnemonic: json['Mnemonic'] as String?,
      radical: radical != null ? RadicalDto.fromJson(radical) : null,
    );
  }
}

class RadicalDto {
  final int id;
  final String radicalCharacter;
  final String radicalName;
  final String? englishName;
  final String? description;

  const RadicalDto({
    required this.id,
    required this.radicalCharacter,
    required this.radicalName,
    this.englishName,
    this.description,
  });

  factory RadicalDto.fromJson(Map<String, dynamic> json) => RadicalDto(
        id: json['Id'] as int,
        radicalCharacter: json['RadicalCharacter'] as String,
        radicalName: json['RadicalName'] as String,
        englishName: json['EnglishName'] as String?,
        description: json['Description'] as String?,
      );
}
