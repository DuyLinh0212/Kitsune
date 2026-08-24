enum KnowledgeStatus { strong, growing, weak, learning }

class KnowledgeNode {
  const KnowledgeNode({
    required this.id,
    required this.label,
    required this.score,
    required this.correct,
    required this.attempts,
    required this.status,
  });

  final String id;
  final String label;
  final int score;
  final int correct;
  final int attempts;
  final KnowledgeStatus status;

  String get insight {
    if (status == KnowledgeStatus.learning) {
      return 'Mới có $attempts bằng chứng — tiếp tục luyện để đánh giá chính xác.';
    }
    if (status == KnowledgeStatus.strong) {
      return 'Điểm mạnh ổn định ($score% đúng).';
    }
    if (status == KnowledgeStatus.weak) {
      return 'Nên ưu tiên ôn lại ($score% đúng).';
    }
    return 'Đang tiến bộ, cần thêm vài lượt củng cố ($score% đúng).';
  }
}

class LearningKnowledgeGraph {
  const LearningKnowledgeGraph({
    required this.title,
    required this.subtitle,
    required this.overallScore,
    required this.nodes,
  });

  final String title;
  final String subtitle;
  final int overallScore;
  final List<KnowledgeNode> nodes;

  factory LearningKnowledgeGraph.fromStats(
    List<Map<String, dynamic>> rows, {
    required String title,
    required String subtitle,
  }) {
    final nodes = rows.map((row) {
      final attempts = (row['Attempts'] as num? ?? 0).toInt();
      final correct = (row['Correct'] as num? ?? 0).toInt();
      final score = attempts == 0 ? 0 : (correct * 100 / attempts).round();
      return KnowledgeNode(
        id: row['SkillCode'] as String,
        label: row['Label'] as String,
        score: score,
        correct: correct,
        attempts: attempts,
        status: _status(score, attempts),
      );
    }).toList()
      ..sort((left, right) {
        final scoreOrder = left.score.compareTo(right.score);
        return scoreOrder != 0
            ? scoreOrder
            : right.attempts.compareTo(left.attempts);
      });
    final attempts = nodes.fold<int>(0, (sum, node) => sum + node.attempts);
    final correct = nodes.fold<int>(0, (sum, node) => sum + node.correct);
    return LearningKnowledgeGraph(
      title: title,
      subtitle: subtitle,
      overallScore: attempts == 0 ? 0 : (correct * 100 / attempts).round(),
      nodes: nodes,
    );
  }

  static KnowledgeStatus _status(int score, int attempts) {
    if (attempts < 3) return KnowledgeStatus.learning;
    if (score >= 78) return KnowledgeStatus.strong;
    if (score <= 55) return KnowledgeStatus.weak;
    return KnowledgeStatus.growing;
  }
}
