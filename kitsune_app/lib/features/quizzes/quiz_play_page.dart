import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/providers/providers.dart';

class QuizPlayPage extends ConsumerStatefulWidget {
  const QuizPlayPage({super.key, required this.quizId});

  final int quizId;

  @override
  ConsumerState<QuizPlayPage> createState() => _QuizPlayPageState();
}

class _QuizPlayPageState extends ConsumerState<QuizPlayPage> {
  List<QuizQuestion> _questions = [];
  int _currentIndex = 0;
  int _correctCount = 0;
  String? _selectedOption;
  bool _isAnswered = false;
  bool _isLoading = true;
  int? _timeLimit;
  int _timeRemaining = 0;
  Timer? _timer;
  bool _isComplete = false;

  @override
  void initState() {
    super.initState();
    _loadQuiz();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadQuiz() async {
    try {
      final api = ref.read(kitsuneApiProvider);
      final quiz = await api.getQuiz(widget.quizId);
      final questions = await api.generateQuizQuestions(quiz);
      if (mounted) {
        setState(() {
          _questions = questions;
          _timeLimit = quiz.timeLimitInSeconds;
          _timeRemaining = quiz.timeLimitInSeconds ?? 0;
          _isLoading = false;
        });
        if (_timeLimit != null && _timeLimit! > 0) {
          _startTimer();
        }
      }
    } catch (error) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: $error'),
            backgroundColor: KitsuneColors.error,
          ),
        );
      }
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      setState(() => _timeRemaining--);
      if (_timeRemaining <= 0) {
        timer.cancel();
        _finishQuiz();
      }
    });
  }

  void _handleAnswer(String answer) {
    if (_isAnswered) {
      return;
    }

    final isCorrect = answer == _questions[_currentIndex].correctAnswer;
    setState(() {
      _selectedOption = answer;
      _isAnswered = true;
      if (isCorrect) {
        _correctCount++;
      }
    });
    Future.delayed(const Duration(milliseconds: 1100), _nextQuestion);
  }

  void _nextQuestion() {
    if (!mounted) {
      return;
    }

    if (_currentIndex < _questions.length - 1) {
      setState(() {
        _currentIndex++;
        _selectedOption = null;
        _isAnswered = false;
      });
    } else {
      _finishQuiz();
    }
  }

  Future<void> _finishQuiz() async {
    _timer?.cancel();
    final total = _questions.length;
    final accuracy = total > 0 ? (_correctCount / total * 100) : 0.0;
    final timeSpent = _timeLimit != null ? (_timeLimit! - _timeRemaining) : 0;

    try {
      final api = ref.read(kitsuneApiProvider);
      await api.saveQuizAttempt(
        QuizAttempt(
          quizId: widget.quizId,
          accuracyPercentage: accuracy,
          timeSpentInSeconds: timeSpent,
          correctAnswersCount: _correctCount,
          totalQuestionsCount: total,
        ),
      );
    } catch (_) {}

    if (mounted) {
      setState(() => _isComplete = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isComplete) {
      return _buildResult();
    }

    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_questions.isEmpty) {
      return const Scaffold(
        body: Center(child: Text('Không có câu hỏi')),
      );
    }

    final question = _questions[_currentIndex];
    final progress = (_currentIndex + 1) / _questions.length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Câu ${_currentIndex + 1} / ${_questions.length}'),
      ),
      body: KitsuneBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            KitsuneSurface(
              color: KitsuneColors.surface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 8,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                      const SizedBox(width: 12),
                      if (_timeLimit != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: _timeRemaining < 10
                                ? KitsuneColors.errorSurface
                                : KitsuneColors.surfaceVariant,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '$_timeRemaining s',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: _timeRemaining < 10
                                  ? KitsuneColors.error
                                  : KitsuneColors.onSurface,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    question.questionText,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          height: 1.35,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space16),
            ...question.options.map((option) {
              final isCorrect = option == question.correctAnswer;
              final isSelected = option == _selectedOption;
              Color accent = KitsuneColors.surfaceBorder;
              Color fill = KitsuneColors.surface;

              if (_isAnswered && isCorrect) {
                accent = KitsuneColors.success;
                fill = KitsuneColors.successSurface;
              } else if (_isAnswered && isSelected && !isCorrect) {
                accent = KitsuneColors.error;
                fill = KitsuneColors.errorSurface;
              } else if (!_isAnswered && isSelected) {
                accent = KitsuneColors.primary;
                fill = KitsuneColors.primarySurface;
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: KitsuneSurface(
                  color: fill,
                  onTap: _isAnswered ? null : () => _handleAnswer(option),
                  child: Row(
                    children: [
                      Container(
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: accent, width: 2),
                          color: _isAnswered && isCorrect
                              ? accent
                              : Colors.transparent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          option,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: KitsuneColors.onSurface,
                          ),
                        ),
                      ),
                      if (_isAnswered && isCorrect)
                        const Icon(Icons.check_circle_rounded,
                            color: KitsuneColors.success)
                      else if (_isAnswered && isSelected && !isCorrect)
                        const Icon(Icons.cancel_rounded, color: KitsuneColors.error),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildResult() {
    final total = _questions.length;
    final accuracy = total > 0 ? (_correctCount / total * 100) : 0.0;
    final isGood = accuracy >= 70;

    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả')),
      body: KitsuneBackdrop(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  KitsunePassportHeader(
                    eyebrow: 'Quiz complete',
                    title: isGood ? 'Bạn giữ nhịp khá tốt.' : 'Lượt này vẫn còn chỗ để cải thiện.',
                    subtitle:
                        'Dùng kết quả này để quyết định nên quay lại quiz hay chuyển sang ôn SRS ngay bây giờ.',
                    accent: isGood ? KitsuneColors.success : KitsuneColors.stamp,
                    trailing: Container(
                      width: 94,
                      height: 94,
                      decoration: BoxDecoration(
                        color: (isGood
                                ? KitsuneColors.successSurface
                                : KitsuneColors.warningSurface),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Center(
                        child: Text(
                          '${accuracy.round()}%',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: isGood
                                ? KitsuneColors.success
                                : KitsuneColors.warning,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.space20),
                  Row(
                    children: [
                      Expanded(
                        child: KitsuneStatTile(
                          label: 'Câu đúng',
                          value: '$_correctCount/$total',
                          color: KitsuneColors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: KitsuneStatTile(
                          label: 'Độ chính xác',
                          value: '${accuracy.round()}%',
                          color: isGood
                              ? KitsuneColors.success
                              : KitsuneColors.warning,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppTheme.space20),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Quay lại'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
