import 'dart:convert';

class ExamSummary {
  const ExamSummary({
    required this.id,
    required this.title,
    this.description,
    this.jlptLevel,
    this.timeLimitInSeconds,
    required this.questionCount,
  });

  final int id;
  final String title;
  final String? description;
  final int? jlptLevel;
  final int? timeLimitInSeconds;
  final int questionCount;

  factory ExamSummary.fromJson(Map<String, dynamic> json) {
    final questions = json['ExamQuestions'] as List<dynamic>? ?? const [];
    return ExamSummary(
      id: (json['Id'] as num).toInt(),
      title: json['Title'] as String,
      description: json['Description'] as String?,
      jlptLevel: (json['JlptLevel'] as num?)?.toInt(),
      timeLimitInSeconds: (json['TimeLimitInSeconds'] as num?)?.toInt(),
      questionCount: questions.length,
    );
  }
}

class ExamQuestion {
  const ExamQuestion({
    required this.id,
    required this.type,
    this.questionText,
    this.passageText,
    required this.options,
    required this.correctAnswer,
    this.explanation,
    required this.orderIndex,
  });

  final int id;
  final String type;
  final String? questionText;
  final String? passageText;
  final List<String> options;
  final String correctAnswer;
  final String? explanation;
  final int orderIndex;

  factory ExamQuestion.fromJson(Map<String, dynamic> json) {
    final raw = json['OptionsJson'];
    final decoded = raw is String ? jsonDecode(raw) : raw;
    final options = decoded is List ? decoded.map((item) => item.toString()).toList() : <String>[];
    return ExamQuestion(
      id: (json['Id'] as num).toInt(),
      type: json['QuestionType'] as String,
      questionText: json['QuestionText'] as String?,
      passageText: json['PassageText'] as String?,
      options: options,
      correctAnswer: json['CorrectAnswer'] as String,
      explanation: json['Explanation'] as String?,
      orderIndex: (json['OrderIndex'] as num? ?? 0).toInt(),
    );
  }
}

class ExamDetail extends ExamSummary {
  const ExamDetail({
    required super.id,
    required super.title,
    super.description,
    super.jlptLevel,
    super.timeLimitInSeconds,
    required this.questions,
  }) : super(questionCount: questions.length);

  final List<ExamQuestion> questions;

  factory ExamDetail.fromJson(Map<String, dynamic> json) {
    final questions = ((json['ExamQuestions'] as List<dynamic>? ?? const [])
            .map((row) => ExamQuestion.fromJson(Map<String, dynamic>.from(row as Map)))
            .toList()
          ..sort((a, b) => a.orderIndex.compareTo(b.orderIndex)));
    return ExamDetail(
      id: (json['Id'] as num).toInt(),
      title: json['Title'] as String,
      description: json['Description'] as String?,
      jlptLevel: (json['JlptLevel'] as num?)?.toInt(),
      timeLimitInSeconds: (json['TimeLimitInSeconds'] as num?)?.toInt(),
      questions: questions,
    );
  }
}

class ExamAttemptResult {
  const ExamAttemptResult({
    required this.id,
    required this.correctCount,
    required this.totalCount,
    required this.accuracy,
  });

  final int id;
  final int correctCount;
  final int totalCount;
  final double accuracy;
}
