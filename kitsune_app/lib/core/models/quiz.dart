// kitsune_app/lib/core/models/quiz.dart

import 'dart:convert';

enum QuizMode {
  meanFromWord('MEAN_FROM_WORD'),
  wordFromMean('WORD_FROM_MEAN'),
  fillBlank('FILL_BLANK'),
  onKunRead('ON_KUN_READ'),
  hanViet('HAN_VIET'),
  composeKanji('COMPOSE_KANJI');

  final String code;
  const QuizMode(this.code);

  static QuizMode fromCode(String code) {
    return QuizMode.values.firstWhere(
      (m) => m.code == code,
      orElse: () => QuizMode.meanFromWord,
    );
  }

  static const List<QuizMode> vocabModes = [
    QuizMode.meanFromWord,
    QuizMode.wordFromMean,
    QuizMode.fillBlank,
  ];

  static const List<QuizMode> kanjiModes = [
    QuizMode.onKunRead,
    QuizMode.hanViet,
    QuizMode.composeKanji,
  ];
}

class QuizDescription {
  final List<String> modes;
  final String? userDescription;
  final List<int> vocabIds;
  final List<int> kanjiIds;

  const QuizDescription({
    this.modes = const [],
    this.userDescription,
    this.vocabIds = const [],
    this.kanjiIds = const [],
  });

  factory QuizDescription.fromJson(Map<String, dynamic> json) {
    return QuizDescription(
      modes: (json['modes'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      userDescription: json['userDescription'] as String?,
      vocabIds: (json['vocabIds'] as List<dynamic>?)
              ?.map((e) => (e as num).toInt())
              .toList() ??
          [],
      kanjiIds: (json['kanjiIds'] as List<dynamic>?)
              ?.map((e) => (e as num).toInt())
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'modes': modes,
        'userDescription': userDescription,
        'vocabIds': vocabIds,
        'kanjiIds': kanjiIds,
      };
}

enum QuestionType { mcq, fill }

class QuizQuestion {
  final int id; // vocabId or kanjiId
  final String questionText;
  final List<String> options;
  final String correctAnswer;
  final QuestionType type;

  const QuizQuestion({
    required this.id,
    required this.questionText,
    required this.options,
    required this.correctAnswer,
    required this.type,
  });
}

class QuizMeta {
  final int id;
  final String title;
  final int? timeLimitInSeconds;
  final String? creatorName;
  final QuizDescription description;
  final String createdAt;
  final int? attemptCount;
  final double? avgAccuracy;

  const QuizMeta({
    required this.id,
    required this.title,
    this.timeLimitInSeconds,
    this.creatorName,
    required this.description,
    required this.createdAt,
    this.attemptCount,
    this.avgAccuracy,
  });

  factory QuizMeta.fromJson(Map<String, dynamic> json) {
    QuizDescription? desc;
    try {
      final descStr = json['Description'] as String?;
      if (descStr != null) {
        desc = QuizDescription.fromJson(
          Map<String, dynamic>.from(jsonDecode(descStr)),
        );
      }
    } catch (_) {
      desc = null;
    }

    // Parse creator from nested join or direct field
    String? creatorName;
    final creator = json['Creator'] as Map<String, dynamic>?;
    if (creator != null) {
      creatorName = creator['FullName'] as String? ?? creator['Username'] as String?;
    }

    return QuizMeta(
      id: json['Id'] as int,
      title: json['Title'] as String,
      timeLimitInSeconds: json['TimeLimitInSeconds'] as int?,
      creatorName: creatorName,
      description: desc ?? const QuizDescription(),
      createdAt: json['CreatedAt'] as String,
      attemptCount: json['attemptCount'] as int?,
      avgAccuracy: json['avgAccuracy'] as double?,
    );
  }
}

class QuizAttempt {
  final int quizId;
  final double accuracyPercentage;
  final int timeSpentInSeconds;
  final int correctAnswersCount;
  final int totalQuestionsCount;

  const QuizAttempt({
    required this.quizId,
    required this.accuracyPercentage,
    required this.timeSpentInSeconds,
    required this.correctAnswersCount,
    required this.totalQuestionsCount,
  });

  Map<String, dynamic> toJson() => {
        'QuizId': quizId,
        'AccuracyPercentage': accuracyPercentage,
        'TimeSpentInSeconds': timeSpentInSeconds,
        'CorrectAnswersCount': correctAnswersCount,
        'TotalQuestionsCount': totalQuestionsCount,
      };
}
