import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/exam.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/knowledge_graph_panel.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/knowledge_provider.dart';

class ExamResultPage extends ConsumerWidget {
  const ExamResultPage({super.key, required this.examId, required this.result});

  final int examId;
  final ExamAttemptResult result;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final graphAsync = ref.watch(examKnowledgeGraphProvider(result.id));
    return Scaffold(
      appBar: AppBar(title: const Text('Kết quả đề kiểm tra')),
      body: KitsuneBackdrop(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.space20),
          children: [
            KitsuneSurface(
              child: Column(
                children: [
                  Icon(
                    result.accuracy >= 70
                        ? Icons.emoji_events_rounded
                        : Icons.auto_stories_rounded,
                    size: 64,
                    color: KitsuneColors.primary,
                  ),
                  const SizedBox(height: 16),
                  Text('${result.accuracy.toStringAsFixed(0)}%',
                      style: Theme.of(context).textTheme.displayMedium),
                  const SizedBox(height: 8),
                  Text('${result.correctCount}/${result.totalCount} câu đúng',
                      style: const TextStyle(
                          color: KitsuneColors.onSurfaceVariant)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pushReplacementNamed(
                        context, '/exams/$examId'),
                    child: const Text('Làm lại đề'),
                  ),
                  TextButton(
                    onPressed: () => Navigator.pushNamedAndRemoveUntil(
                        context, '/exams', (route) => route.isFirst),
                    child: const Text('Chọn đề khác'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppTheme.space16),
            graphAsync.when(
              data: (graph) => KnowledgeGraphPanel(graph: graph),
              loading: () => const KitsuneSurface(
                child: KitsuneLoadingFox(
                  message: 'Đang dựng bản đồ năng lực...',
                  size: 68,
                ),
              ),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}
