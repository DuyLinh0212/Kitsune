import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/exam.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/dashboard_provider.dart';
import 'package:kitsune_app/providers/exam_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class ExamPlayPage extends ConsumerStatefulWidget {
  const ExamPlayPage({super.key, required this.examId});

  final int examId;

  @override
  ConsumerState<ExamPlayPage> createState() => _ExamPlayPageState();
}

class _ExamPlayPageState extends ConsumerState<ExamPlayPage> {
  final Map<int, String> _answers = {};
  var _index = 0;
  var _submitting = false;
  DateTime? _startedAt;
  Timer? _timer;
  int? _remainingSeconds;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer(ExamDetail exam) {
    if (_startedAt != null) return;
    _startedAt = DateTime.now();
    if ((exam.timeLimitInSeconds ?? 0) <= 0) return;
    _remainingSeconds = exam.timeLimitInSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final remaining = (_remainingSeconds ?? 1) - 1;
      setState(() => _remainingSeconds = remaining);
      if (remaining <= 0) {
        _timer?.cancel();
        _submit(exam);
      }
    });
  }

  Future<void> _submit(ExamDetail exam) async {
    if (_submitting) return;
    setState(() => _submitting = true);
    _timer?.cancel();
    final strings = ref.read(stringsProvider);
    try {
      final elapsed = DateTime.now().difference(_startedAt ?? DateTime.now()).inSeconds;
      final result = await ref.read(kitsuneApiProvider).saveExamAttempt(
            exam: exam,
            answers: _answers,
            timeSpentInSeconds: elapsed,
          );
      final userId = await ref.read(kitsuneApiProvider).getCurrentUserId();
      ref.invalidate(userStatsProvider(userId));
      ref.invalidate(weekChartProvider(userId));
      if (mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/exams/${exam.id}/result/${result.id}',
          arguments: result,
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(strings.cannotSubmitExam)));
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final examAsync = ref.watch(examDetailProvider(widget.examId));
    return Scaffold(
      appBar: AppBar(title: Text(strings.examPlayTitle)),
      body: KitsuneBackdrop(
        child: examAsync.when(
          loading: () => KitsuneLoadingFox(message: strings.loadingExams),
          error: (_, __) => KitsuneEmptyState(
            icon: Icons.error_outline_rounded,
            title: strings.cannotLoadExams,
            message: strings.cannotLoadExamDetail,
            action: ElevatedButton(onPressed: () => ref.invalidate(examDetailProvider(widget.examId)), child: Text(strings.retry)),
          ),
          data: (exam) {
            _startTimer(exam);
            if (exam.questions.isEmpty) {
              return KitsuneEmptyState(icon: Icons.assignment_late_outlined, title: strings.noQuestions, message: strings.chooseAnotherExamPrompt);
            }
            final question = exam.questions[_index];
            return Padding(
              padding: const EdgeInsets.all(AppTheme.space16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(exam.title, style: Theme.of(context).textTheme.titleLarge)),
                      if (_remainingSeconds != null) Text('${(_remainingSeconds! ~/ 60).toString().padLeft(2, '0')}:${(_remainingSeconds! % 60).toString().padLeft(2, '0')}', style: const TextStyle(fontWeight: FontWeight.w800, color: KitsuneColors.primary)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(value: (_index + 1) / exam.questions.length),
                  const SizedBox(height: 8),
                  Text(strings.formatExamQuestionProgress(_index + 1, exam.questions.length, _answers.length)),
                  const SizedBox(height: 16),
                  Expanded(
                    child: SingleChildScrollView(
                      child: KitsuneSurface(
                        child: _QuestionView(
                          question: question,
                          selected: _answers[question.id],
                          onSelect: (value) => setState(() => _answers[question.id] = value),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      OutlinedButton(onPressed: _index == 0 ? null : () => setState(() => _index--), child: Text(strings.previous)),
                      const Spacer(),
                      if (_index < exam.questions.length - 1)
                        ElevatedButton(onPressed: () => setState(() => _index++), child: Text(strings.next))
                      else
                        ElevatedButton(
                          onPressed: _submitting ? null : () => _submit(exam),
                          child: Text(_submitting ? strings.submitting : strings.submitExam),
                        ),
                    ],
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _QuestionView extends StatelessWidget {
  const _QuestionView({required this.question, required this.selected, required this.onSelect});

  final ExamQuestion question;
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final options = question.options;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (question.passageText != null) ...[
          Text(question.passageText!, style: const TextStyle(height: 1.6, color: KitsuneColors.onSurfaceVariant)),
          const SizedBox(height: 16),
        ],
        if (question.questionText != null)
          Text(question.questionText!, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        ...options.map((option) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => onSelect(option),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: selected == option ? KitsuneColors.primarySurface : KitsuneColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: selected == option ? KitsuneColors.primary : KitsuneColors.surfaceBorder),
                  ),
                  child: Text(option),
                ),
              ),
            )),
      ],
    );
  }
}
