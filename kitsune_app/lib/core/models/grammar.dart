class GrammarExample {
  const GrammarExample({
    required this.id,
    required this.japaneseText,
    this.reading,
    this.meaningVi,
    required this.orderIndex,
  });

  final int id;
  final String japaneseText;
  final String? reading;
  final String? meaningVi;
  final int orderIndex;

  factory GrammarExample.fromJson(Map<String, dynamic> json) {
    return GrammarExample(
      id: (json['Id'] as num).toInt(),
      japaneseText: json['JapaneseText'] as String,
      reading: json['Reading'] as String?,
      meaningVi: json['MeaningVi'] as String?,
      orderIndex: (json['OrderIndex'] as num? ?? 0).toInt(),
    );
  }
}

class GrammarPoint {
  const GrammarPoint({
    required this.id,
    required this.title,
    required this.meaning,
    this.structure,
    this.jlptLevel,
    this.explanation,
    this.examples = const [],
  });

  final int id;
  final String title;
  final String meaning;
  final String? structure;
  final int? jlptLevel;
  final String? explanation;
  final List<GrammarExample> examples;

  factory GrammarPoint.fromJson(Map<String, dynamic> json) {
    final rawExamples = json['GrammarExamples'] as List<dynamic>? ?? const [];
    final examples = rawExamples
        .map((row) => GrammarExample.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList()
      ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex));
    return GrammarPoint(
      id: (json['Id'] as num).toInt(),
      title: json['Title'] as String,
      meaning: json['Meaning'] as String,
      structure: json['Structure'] as String?,
      jlptLevel: (json['JlptLevel'] as num?)?.toInt(),
      explanation: json['Explanation'] as String?,
      examples: examples,
    );
  }
}
