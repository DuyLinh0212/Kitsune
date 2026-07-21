import 'package:flutter/material.dart';
import 'package:kitsune_app/core/models/exam.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';

class ExamResultPage extends StatelessWidget {
  const ExamResultPage({super.key, required this.examId, required this.result});

  final int examId;
  final ExamAttemptResult result;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả đề kiểm tra')),
      body: KitsuneBackdrop(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.space20),
            child: KitsuneSurface(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    result.accuracy >= 70 ? Icons.emoji_events_rounded : Icons.auto_stories_rounded,
                    size: 64,
                    color: KitsuneColors.primary,
                  ),
                  const SizedBox(height: 16),
                  Text('${result.accuracy.toStringAsFixed(0)}%', style: Theme.of(context).textTheme.displayMedium),
                  const SizedBox(height: 8),
                  Text('${result.correctCount}/${result.totalCount} câu đúng', style: const TextStyle(color: KitsuneColors.onSurfaceVariant)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pushReplacementNamed(context, '/exams/$examId'),
                    child: const Text('Làm lại đề'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/exams', (route) => route.isFirst),
                    child: const Text('Chọn đề khác'),
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
