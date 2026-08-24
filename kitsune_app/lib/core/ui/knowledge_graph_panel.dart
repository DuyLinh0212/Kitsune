import 'package:flutter/material.dart';
import 'package:kitsune_app/core/models/learning_knowledge.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';

class KnowledgeGraphPanel extends StatelessWidget {
  const KnowledgeGraphPanel({super.key, required this.graph});

  final LearningKnowledgeGraph graph;

  @override
  Widget build(BuildContext context) {
    return KitsuneSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: KitsuneColors.primary,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x2ECC5A2A),
                      blurRadius: 18,
                      offset: Offset(0, 8),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  '${graph.overallScore}%',
                  style: const TextStyle(
                    color: KitsuneColors.onPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: AppTheme.space14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(graph.title,
                        style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(
                      graph.subtitle,
                      style: const TextStyle(
                        color: KitsuneColors.onSurfaceVariant,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTheme.space16),
          if (graph.nodes.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Chưa đủ dữ liệu. Làm vài câu ôn tập hoặc một đề kiểm tra để mở bản đồ.',
                style: TextStyle(color: KitsuneColors.onSurfaceVariant),
              ),
            )
          else
            ...graph.nodes.map((node) => _KnowledgeBranch(node: node)),
        ],
      ),
    );
  }
}

class _KnowledgeBranch extends StatelessWidget {
  const _KnowledgeBranch({required this.node});

  final KnowledgeNode node;

  @override
  Widget build(BuildContext context) {
    final color = switch (node.status) {
      KnowledgeStatus.strong => KitsuneColors.success,
      KnowledgeStatus.growing => KitsuneColors.secondary,
      KnowledgeStatus.weak => KitsuneColors.error,
      KnowledgeStatus.learning => KitsuneColors.warning,
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.24)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration:
                      BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(node.label,
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
                Text('${node.score}%',
                    style:
                        TextStyle(color: color, fontWeight: FontWeight.w900)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: node.score / 100,
                minHeight: 7,
                color: color,
                backgroundColor: color.withValues(alpha: 0.12),
              ),
            ),
            const SizedBox(height: 7),
            Row(
              children: [
                Expanded(
                  child: Text(node.insight,
                      style: const TextStyle(
                          fontSize: 12, color: KitsuneColors.onSurfaceVariant)),
                ),
                Text('${node.correct}/${node.attempts}',
                    style: const TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w800)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
