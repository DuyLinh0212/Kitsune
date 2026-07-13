import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/constants/app_constants.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/core/models/srs.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/dashboard_provider.dart';
import 'package:kitsune_app/providers/folder_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

enum _StudyPhase { idle, flashcard, quiz, summary }

class _QuizPrompt {
  const _QuizPrompt({
    required this.mode,
    required this.prompt,
    required this.promptLabel,
    required this.helper,
    required this.options,
    required this.correctAnswer,
  });

  final QuizMode mode;
  final String prompt;
  final String promptLabel;
  final String helper;
  final List<String> options;
  final String correctAnswer;
}

class _DashboardFolder {
  const _DashboardFolder({
    required this.folder,
    required this.overview,
  });

  final FolderDto folder;
  final FolderSrsOverview overview;
}

class SrsReviewPage extends ConsumerStatefulWidget {
  const SrsReviewPage({super.key});

  @override
  ConsumerState<SrsReviewPage> createState() => _SrsReviewPageState();
}

class _SrsReviewPageState extends ConsumerState<SrsReviewPage> {
  final _rng = Random();

  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _showStudyOverlay = false;
  bool _isCardFlipped = false;
  int? _selectedFolderId;
  FolderSrsSession? _session;
  List<_DashboardFolder> _dashboardFolders = const [];
  _StudyPhase _phase = _StudyPhase.idle;
  List<SRSCardDto> _flashQueue = const [];
  List<SRSCardDto> _quizQueue = const [];
  _QuizPrompt? _currentQuestion;
  String? _selectedOption;
  bool? _lastAnswerCorrect;
  String? _feedbackMessage;
  int _flashCompleted = 0;
  int _answersGiven = 0;
  int _mistakes = 0;
  Timer? _feedbackTimer;
  Timer? _countdownTimer;
  String _countdownText = '';
  String? _speakingWord;

  Future<void> _speak(String word) async {
    setState(() => _speakingWord = word);
    await ref.read(ttsServiceProvider).speak(word);
    if (mounted) {
      setState(() => _speakingWord = null);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDashboard();
      _startCountdown();
    });
  }

  @override
  void dispose() {
    _feedbackTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    try {
      final folders = await ref.read(foldersProvider.future);
      final repo = ref.read(kitsuneApiProvider);
      final dashboards = <_DashboardFolder>[];
      for (final folder in folders) {
        try {
          final overview = await repo.getFolderOverview(folder.id);
          dashboards.add(_DashboardFolder(folder: folder, overview: overview));
        } catch (_) {
          dashboards.add(
            _DashboardFolder(
              folder: folder,
              overview: FolderSrsOverview(
                folderId: folder.id,
                folderName: folder.name,
                totalCards: 0,
                newCards: 0,
                dueCards: 0,
                learnedCards: 0,
                masteredCards: 0,
                nextDueAt: null,
                canSwitchFolder: true,
              ),
            ),
          );
        }
      }

      final preferredFolderId = await repo.getActiveFolderId() ??
          (dashboards.isNotEmpty ? dashboards.first.folder.id : null);

      FolderSrsSession? session;
      if (preferredFolderId != null) {
        session = await repo.getFolderSession(folderId: preferredFolderId);
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _dashboardFolders = dashboards;
        _selectedFolderId = preferredFolderId;
        _session = session;
        _resetStudyState(session);
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() => _isLoading = false);
      _showError(error);
    }
  }

  void _resetStudyState(FolderSrsSession? session) {
    _flashQueue = [...?session?.flashcards];
    _quizQueue = [...?session?.quizCards];
    _flashCompleted = 0;
    _answersGiven = 0;
    _mistakes = 0;
    _selectedOption = null;
    _lastAnswerCorrect = null;
    _feedbackMessage = null;
    _currentQuestion = null;
    _isCardFlipped = false;
    _showStudyOverlay = false;
    _feedbackTimer?.cancel();

    if (session == null) {
      _phase = _StudyPhase.idle;
      return;
    }

    if (_flashQueue.isNotEmpty) {
      _phase = _StudyPhase.flashcard;
      return;
    }

    if (_quizQueue.isNotEmpty) {
      _phase = _StudyPhase.quiz;
      _currentQuestion = _buildQuestion(_quizQueue.first, session.cards);
      return;
    }

    _phase = _StudyPhase.summary;
  }

  Future<void> _openFolder(int folderId, {required bool activate}) async {
    if (_isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(kitsuneApiProvider);
      final session = activate
          ? await repo.activateFolder(folderId)
          : await repo.getFolderSession(folderId: folderId);

      if (!mounted) {
        return;
      }

      setState(() {
        _selectedFolderId = folderId;
        _session = session;
        _resetStudyState(session);
      });
      await _refreshOverview(folderId);
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _refreshOverview(int folderId) async {
    final repo = ref.read(kitsuneApiProvider);
    try {
      final overview = await repo.getFolderOverview(folderId);
      if (!mounted) {
        return;
      }

      setState(() {
        _dashboardFolders = _dashboardFolders.map((item) {
          if (item.folder.id != folderId) {
            return item;
          }
          return _DashboardFolder(folder: item.folder, overview: overview);
        }).toList();
      });
    } catch (_) {}
  }

  Future<void> _startStudy() async {
    if (_session == null || _selectedFolderId == null) {
      return;
    }

    if (_session!.flashcards.isEmpty && _session!.quizCards.isEmpty) {
      _showMessage('Folder này hiện chưa có thẻ đến lượt học.');
      return;
    }

    setState(() => _showStudyOverlay = true);
  }

  Future<void> _markFlashcardLearned() async {
    if (_flashQueue.isEmpty || _isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(kitsuneApiProvider);
      await repo.completeFlashcard(_flashQueue.first.id);

      if (!mounted) {
        return;
      }

      setState(() {
        _flashQueue = _flashQueue.sublist(1);
        _flashCompleted += 1;
        _isCardFlipped = false;
      });
      _syncPhase();
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _reviewFlashcardAgain() {
    if (_flashQueue.isEmpty) {
      return;
    }

    final head = _flashQueue.first;
    setState(() {
      _flashQueue = [..._flashQueue.skip(1), head];
      _isCardFlipped = false;
    });
  }

  Future<void> _submitQuizAnswer() async {
    if (_quizQueue.isEmpty || _currentQuestion == null || _selectedOption == null || _isSubmitting) {
      return;
    }

    final answer = _selectedOption!.trim();
    final isCorrect =
        _normalize(answer) == _normalize(_currentQuestion!.correctAnswer);

    setState(() {
      _isSubmitting = true;
      _answersGiven += 1;
      if (!isCorrect) {
        _mistakes += 1;
      }
      _lastAnswerCorrect = isCorrect;
      _feedbackMessage = isCorrect
          ? 'Chính xác. Thẻ này đã được đẩy tới lần ôn tiếp theo.'
          : 'Chưa đúng. Đáp án đúng là "${_currentQuestion!.correctAnswer}".';
    });

    try {
      final repo = ref.read(kitsuneApiProvider);
      await repo.submitQuizAnswer(_quizQueue.first.id, isCorrect);
      _feedbackTimer?.cancel();
      _feedbackTimer = Timer(
        Duration(milliseconds: isCorrect ? 850 : 1350),
        () {
          if (!mounted) {
            return;
          }
          setState(() {
            final current = _quizQueue.first;
            final rest = _quizQueue.sublist(1);
            _quizQueue = isCorrect ? rest : [...rest, current];
            _selectedOption = null;
            _lastAnswerCorrect = null;
            _feedbackMessage = null;
            _isSubmitting = false;
          });
          _syncPhase();
        },
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _isSubmitting = false);
      _showError(error);
    }
  }

  void _syncPhase() {
    if (_flashQueue.isNotEmpty) {
      setState(() => _phase = _StudyPhase.flashcard);
      return;
    }

    if (_quizQueue.isNotEmpty) {
      setState(() {
        _phase = _StudyPhase.quiz;
        _currentQuestion = _buildQuestion(_quizQueue.first, _session?.cards ?? _quizQueue);
      });
      return;
    }

    setState(() => _phase = _StudyPhase.summary);
    if (_selectedFolderId != null) {
      _refreshOverview(_selectedFolderId!);
    }
    _invalidateDashboard();
  }

  void _invalidateDashboard() {
    ref.invalidate(userStatsProvider);
    ref.invalidate(dashboardFoldersProvider);
    ref.invalidate(weekChartProvider);
  }

  _QuizPrompt _buildQuestion(SRSCardDto card, List<SRSCardDto> pool) {
    final modes = card.type == SrsItemType.vocabulary
        ? _shuffle(QuizMode.vocabModes)
        : _shuffle(QuizMode.kanjiModes);

    for (final mode in modes) {
      final prompt = _tryBuildQuestion(mode, card, pool);
      if (prompt != null) {
        return prompt;
      }
    }

    return card.type == SrsItemType.vocabulary
        ? _QuizPrompt(
            mode: QuizMode.wordFromMean,
            prompt: card.meaning,
            promptLabel: 'Chọn từ tiếng Nhật đúng với nghĩa này',
            helper: card.pronunciation ?? 'Chọn đáp án phù hợp nhất.',
            options: _buildOptions(
              card.word,
              pool.where((item) => item.type == SrsItemType.vocabulary).map((item) => item.word).toList(),
              const ['家族', '時間', '学校', '先生', '学生'],
            ),
            correctAnswer: card.word,
          )
        : _QuizPrompt(
            mode: QuizMode.hanViet,
            prompt: card.character ?? '',
            promptLabel: 'Chọn âm Hán Việt của kanji này',
            helper: 'Số nét: ${card.strokeCount ?? '-'}',
            options: _buildOptions(
              card.amHanViet ?? '',
              pool.where((item) => item.type == SrsItemType.kanji).map((item) => item.amHanViet ?? '').toList(),
              const ['Tâm', 'Hỏa', 'Mộc', 'Thủy', 'Nhân'],
            ),
            correctAnswer: card.amHanViet ?? '',
          );
  }

  _QuizPrompt? _tryBuildQuestion(QuizMode mode, SRSCardDto card, List<SRSCardDto> pool) {
    if (card.type == SrsItemType.vocabulary) {
      if (mode == QuizMode.meanFromWord) {
        return _QuizPrompt(
          mode: mode,
          prompt: card.word,
          promptLabel: 'Chọn nghĩa đúng của từ này',
          helper: card.pronunciation ?? 'Dựa trên từ đang hiển thị.',
          options: _buildOptions(
            card.meaning,
            pool.where((item) => item.type == SrsItemType.vocabulary).map((item) => item.meaning).toList(),
            const ['Gia đình', 'Thời gian', 'Ngôn ngữ', 'Sách', 'Nhà', 'Học sinh'],
          ),
          correctAnswer: card.meaning,
        );
      }

      if (mode == QuizMode.wordFromMean || mode == QuizMode.fillBlank) {
        return _QuizPrompt(
          mode: mode,
          prompt: card.meaning,
          promptLabel: mode == QuizMode.fillBlank
              ? 'Chọn từ đúng để điền vào chỗ trống'
              : 'Chọn từ tiếng Nhật đúng',
          helper: card.pronunciation != null
              ? 'Gợi ý: ${card.pronunciation}'
              : 'Ưu tiên đúng chính tả.',
          options: _buildOptions(
            card.word,
            pool.where((item) => item.type == SrsItemType.vocabulary).map((item) => item.word).toList(),
            const ['家族', '家', '人', '時間', '本', '学校', '言語', '先生'],
          ),
          correctAnswer: card.word,
        );
      }
    } else {
      if (mode == QuizMode.onKunRead) {
        final correct = card.onyomi?.trim().isNotEmpty == true
            ? card.onyomi!
            : card.kunyomi;
        if (correct == null || correct.trim().isEmpty) {
          return null;
        }
        return _QuizPrompt(
          mode: mode,
          prompt: card.character ?? '',
          promptLabel: 'Chọn cách đọc đúng của kanji này',
          helper: 'Dùng onyomi nếu có, nếu không thì dùng kunyomi.',
          options: _buildOptions(
            correct,
            pool.where((item) => item.type == SrsItemType.kanji).map((item) => item.onyomi ?? item.kunyomi ?? '').toList(),
            const ['ジン', 'カ', 'ガク', 'ゴ', 'ホン', 'セイ', 'セン', 'ニチ'],
          ),
          correctAnswer: correct,
        );
      }

      if (mode == QuizMode.hanViet) {
        if (card.amHanViet == null || card.amHanViet!.trim().isEmpty) {
          return null;
        }
        return _QuizPrompt(
          mode: mode,
          prompt: card.character ?? '',
          promptLabel: 'Chọn âm Hán Việt đúng',
          helper: 'Số nét: ${card.strokeCount ?? '-'}',
          options: _buildOptions(
            card.amHanViet!,
            pool.where((item) => item.type == SrsItemType.kanji).map((item) => item.amHanViet ?? '').toList(),
            const ['Nhân', 'Gia', 'Học', 'Ngữ', 'Bản', 'Sinh', 'Tiên', 'Nhật'],
          ),
          correctAnswer: card.amHanViet!,
        );
      }

      if (mode == QuizMode.composeKanji) {
        if (card.character == null || card.character!.trim().isEmpty) {
          return null;
        }
        return _QuizPrompt(
          mode: mode,
          prompt: card.amHanViet?.trim().isNotEmpty == true ? card.amHanViet! : card.meaning,
          promptLabel: 'Chọn đúng kanji theo âm Hán Việt',
          helper: card.meaning,
          options: _buildOptions(
            card.character!,
            pool.where((item) => item.type == SrsItemType.kanji).map((item) => item.character ?? '').toList(),
            const ['人', '家', '学', '語', '本', '生', '先', '日'],
          ),
          correctAnswer: card.character!,
        );
      }
    }

    return null;
  }

  List<String> _buildOptions(String correct, List<String> pool, List<String> fallbacks) {
    final uniquePool = <String>{
      for (final item in pool)
        if (item.trim().isNotEmpty && item != correct) item,
    }.toList();
    final extra = <String>[
      ...uniquePool,
      ...fallbacks.where((item) => item != correct && !uniquePool.contains(item)),
    ];
    final wrongs = _shuffle(extra).take(3).toList();
    while (wrongs.length < 3) {
      wrongs.add('Lựa chọn ${wrongs.length + 1}');
    }
    return _shuffle([correct, ...wrongs]);
  }

  List<T> _shuffle<T>(List<T> items) {
    final clone = [...items];
    for (var index = clone.length - 1; index > 0; index--) {
      final swapIndex = _rng.nextInt(index + 1);
      final temp = clone[index];
      clone[index] = clone[swapIndex];
      clone[swapIndex] = temp;
    }
    return clone;
  }

  String _normalize(String value) => value.trim().toLowerCase();

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) {
        return;
      }
      setState(() => _countdownText = _computeCountdown());
    });
    _countdownText = _computeCountdown();
  }

  String _computeCountdown() {
    final dates = _dashboardFolders
        .map((folder) => folder.overview.nextDueAt)
        .whereType<String>()
        .toList()
      ..sort();
    if (dates.isEmpty) {
      return '';
    }

    final diff = DateTime.parse(dates.first).difference(DateTime.now());
    if (diff.isNegative) {
      return 'Đến hạn rồi';
    }

    final hours = diff.inHours.toString().padLeft(2, '0');
    final minutes = (diff.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (diff.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }

  int get _totalUnits => (_session?.flashcards.length ?? 0) + (_session?.quizCards.length ?? 0);

  int get _progressPercent {
    if (_totalUnits == 0) {
      return 0;
    }
    final completed = _flashCompleted + _answersGiven;
    return ((completed / _totalUnits) * 100).round().clamp(0, 100);
  }

  int get _accuracyPercent {
    if (_answersGiven == 0) {
      return 100;
    }
    return (((_answersGiven - _mistakes) / _answersGiven) * 100).round();
  }

  _DashboardFolder? get _activeFolder {
    final id = _selectedFolderId;
    if (id == null) {
      return null;
    }
    for (final item in _dashboardFolders) {
      if (item.folder.id == id) {
        return item;
      }
    }
    return null;
  }

  List<_LevelBucket> get _levelBuckets {
    final cards = _session?.cards ?? const <SRSCardDto>[];
    return List.generate(8, (level) {
      return _LevelBucket(
        level: level,
        count: cards.where((card) => card.boxLevel == level).length,
        label: AppConstants.srsLevelLabels[level] ?? 'Level $level',
        color: KitsuneColors.srsLevelColors[level],
      );
    });
  }

  Future<void> _reloadActiveFolder() async {
    if (_selectedFolderId == null) {
      return;
    }
    await _openFolder(_selectedFolderId!, activate: false);
    if (!mounted) {
      return;
    }
    setState(() => _showStudyOverlay = false);
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _showError(Object error) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$error'),
        backgroundColor: KitsuneColors.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ôn tập SRS')),
      body: KitsuneBackdrop(
        child: _isLoading
            ? const KitsuneLoadingFox(message: 'Đang tải dữ liệu ôn tập...')
            : Stack(
                children: [
                  _buildDashboard(),
                  if (_showStudyOverlay) _buildStudyOverlay(),
                ],
              ),
      ),
    );
  }

  Widget _buildDashboard() {
    return RefreshIndicator(
      onRefresh: _loadDashboard,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          KitsuneHeroCard(
            title: 'Sổ tay ôn tập với 6 chế độ câu hỏi như bên web.',
            subtitle:
                'Chọn folder, xem phân bố cấp độ, rồi mở lượt học khi có thẻ mới hoặc thẻ đến hạn.',
            accent: KitsuneColors.secondary,
            trailing: Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                color: KitsuneColors.secondarySurface,
                borderRadius: BorderRadius.circular(30),
              ),
              alignment: Alignment.center,
              child: Text(
                '${_dashboardFolders.fold<int>(0, (sum, item) => sum + item.overview.dueCards + item.overview.newCards)}',
                style: AppTheme.numeralStyle(
                  fontSize: 30,
                  color: KitsuneColors.secondary,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppTheme.space16),
          if (_activeFolder != null)
            KitsuneSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  KitsuneSectionHeader(
                    title: _activeFolder!.overview.folderName,
                    subtitle:
                        '${_activeFolder!.overview.totalCards} thẻ tổng • ${_activeFolder!.overview.learnedCards} đã học',
                    accent: KitsuneColors.primary,
                  ),
                  const SizedBox(height: AppTheme.space14),
                  Row(
                    children: [
                      Expanded(
                        child: KitsuneStatTile(
                          label: 'Mới',
                          value: '${_activeFolder!.overview.newCards}',
                          color: KitsuneColors.info,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: KitsuneStatTile(
                          label: 'Đến hạn',
                          value: '${_activeFolder!.overview.dueCards}',
                          color: KitsuneColors.warning,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: KitsuneStatTile(
                          label: 'Master',
                          value: '${_activeFolder!.overview.masteredCards}',
                          color: KitsuneColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppTheme.space16),
                  _buildLevelChart(),
                  const SizedBox(height: AppTheme.space16),
                  ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _startStudy,
                    icon: const Icon(Icons.play_arrow_rounded),
                    label: const Text('Bắt đầu ôn tập'),
                  ),
                  if (_countdownText.isNotEmpty) ...[
                    const SizedBox(height: AppTheme.space10),
                    Text(
                      'Lượt tiếp theo sau: $_countdownText',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ],
              ),
            ),
          const SizedBox(height: AppTheme.space16),
          const KitsuneSectionHeader(
            title: 'Folder SRS',
            subtitle: 'Đổi folder ở đây và giữ nhịp ôn riêng cho từng bộ học.',
            accent: KitsuneColors.stamp,
          ),
          const SizedBox(height: AppTheme.space12),
          if (_dashboardFolders.isEmpty)
            const KitsuneEmptyState(
              icon: Icons.folder_open_rounded,
              title: 'Chưa có folder nào',
              message: 'Tạo folder và thêm từ vựng trước khi bắt đầu một lượt SRS.',
            )
          else
            ..._dashboardFolders.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final color =
                  KitsuneColors.folderColors[index % KitsuneColors.folderColors.length];
              final isActive = _selectedFolderId == item.folder.id;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: KitsuneSurface(
                  color: isActive
                      ? KitsuneColors.primarySurface
                      : KitsuneColors.surface,
                  onTap: _isSubmitting
                      ? null
                      : () => _openFolder(item.folder.id, activate: true),
                  child: Row(
                    children: [
                      Container(
                        width: 54,
                        height: 54,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Icon(Icons.folder_rounded, color: color),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item.folder.name,
                                    style: Theme.of(context).textTheme.titleLarge,
                                  ),
                                ),
                                if (isActive)
                                  const KitsuneActionBadge(
                                    icon: Icons.check_circle_rounded,
                                    label: 'Đang học',
                                    color: KitsuneColors.primary,
                                    isActive: true,
                                  ),
                              ],
                            ),
                            const SizedBox(height: AppTheme.space4),
                            Text(
                              '${item.overview.newCards} moi • ${item.overview.dueCards} den han • ${item.overview.totalCards} the',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildLevelChart() {
    final buckets = _levelBuckets;
    final maxCount =
        buckets.fold<int>(1, (max, bucket) => bucket.count > max ? bucket.count : max);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 148,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: buckets.map((bucket) {
              final height = bucket.count == 0
                  ? 8.0
                  : max(12.0, bucket.count / maxCount * 88);
              return Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      '${bucket.count}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 24,
                      height: height,
                      decoration: BoxDecoration(
                        color: bucket.color,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${bucket.level}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: AppTheme.space12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: buckets.map((bucket) {
            return KitsuneActionBadge(
              icon: Icons.circle,
              label: bucket.label,
              color: bucket.color,
              isActive: bucket.count > 0,
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStudyOverlay() {
    final ringColor =
        _phase == _StudyPhase.quiz ? KitsuneColors.secondary : KitsuneColors.primary;

    return Container(
      color: KitsuneColors.background,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  TextButton.icon(
                    onPressed: () => setState(() => _showStudyOverlay = false),
                    icon: const Icon(Icons.arrow_back_rounded),
                    label: const Text('Về dashboard'),
                  ),
                  const Spacer(),
                  Text(
                    _phaseLabel(),
                    style: Theme.of(context).textTheme.labelMedium,
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 40,
                    height: 40,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        TweenAnimationBuilder<double>(
                          tween: Tween(begin: 0, end: _progressPercent / 100),
                          duration: const Duration(milliseconds: 320),
                          curve: Curves.easeOutCubic,
                          builder: (context, value, _) {
                            return CircularProgressIndicator(
                              value: value,
                              strokeWidth: 4,
                              backgroundColor: KitsuneColors.surfaceVariant,
                              valueColor: AlwaysStoppedAnimation<Color>(ringColor),
                            );
                          },
                        ),
                        Text(
                          '${_progressPercent.clamp(0, 100)}',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: ringColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
                children: [
                  if (_phase == _StudyPhase.flashcard && _flashQueue.isNotEmpty)
                    _buildFlashcard()
                  else if (_phase == _StudyPhase.quiz && _quizQueue.isNotEmpty)
                    _buildQuiz()
                  else
                    _buildSummary(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFlashcard() {
    final card = _flashQueue.first;
    final queueLeft = _flashQueue.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KitsuneSurface(
          child: Row(
            children: [
              KitsuneActionBadge(
                icon: card.type == SrsItemType.kanji
                    ? Icons.text_fields_rounded
                    : Icons.menu_book_rounded,
                label: card.type == SrsItemType.kanji ? 'Kanji' : 'Vocabulary',
                color: card.type == SrsItemType.kanji
                    ? KitsuneColors.secondary
                    : KitsuneColors.primary,
                isActive: true,
              ),
              const SizedBox(width: 10),
              Text(
                'Còn $queueLeft thẻ mới',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTheme.space16),
        GestureDetector(
          onTap: () => setState(() => _isCardFlipped = !_isCardFlipped),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 240),
            child: _isCardFlipped ? _buildCardBack(card) : _buildCardFront(card),
          ),
        ),
        const SizedBox(height: AppTheme.space16),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _isSubmitting || !_isCardFlipped ? null : _reviewFlashcardAgain,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Xem lại'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: _isSubmitting || !_isCardFlipped ? null : _markFlashcardLearned,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check_rounded),
                label: const Text('Đã nhớ'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCardFront(SRSCardDto card) {
    return KitsuneSurface(
      key: const ValueKey('card-front'),
      radius: AppTheme.radiusLg,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      child: Column(
        children: [
          Text(
            card.type == SrsItemType.kanji ? (card.character ?? card.word) : card.word,
            style: AppTheme.japaneseStyle(
              fontSize: card.type == SrsItemType.kanji ? 78 : 58,
              fontWeight: FontWeight.w800,
              color: KitsuneColors.onSurface,
            ),
            textAlign: TextAlign.center,
          ),
          if (card.type == SrsItemType.vocabulary) ...[
            const SizedBox(height: AppTheme.space10),
            InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: () => _speak(card.word),
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: Icon(
                  Icons.volume_up_rounded,
                  size: 28,
                  color: _speakingWord == card.word
                      ? KitsuneColors.primary
                      : KitsuneColors.onSurfaceVariant,
                ),
              ),
            ),
          ],
          if (card.pronunciation?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppTheme.space10),
            Text(
              card.pronunciation!,
              style: const TextStyle(
                fontSize: 18,
                color: KitsuneColors.onSurfaceVariant,
              ),
            ),
          ],
          if (card.type == SrsItemType.kanji && card.strokeCount != null) ...[
            const SizedBox(height: AppTheme.space10),
            Text(
              '${card.strokeCount} nét',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: KitsuneColors.secondary,
              ),
            ),
          ],
          const SizedBox(height: AppTheme.space24),
          const Text(
            'Chạm để xem mặt sau',
            style: TextStyle(
              fontSize: 13,
              color: KitsuneColors.onSurfaceMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardBack(SRSCardDto card) {
    return KitsuneSurface(
      key: const ValueKey('card-back'),
      radius: AppTheme.radiusLg,
      color: card.type == SrsItemType.kanji
          ? KitsuneColors.secondarySurface
          : KitsuneColors.primarySurface,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
      child: Column(
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                card.type == SrsItemType.kanji ? (card.character ?? card.word) : card.word,
                style: AppTheme.japaneseStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: KitsuneColors.onSurface,
                ),
              ),
              if (card.type == SrsItemType.vocabulary) ...[
                const SizedBox(width: AppTheme.space8),
                InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => _speak(card.word),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: Icon(
                      Icons.volume_up_rounded,
                      size: 22,
                      color: _speakingWord == card.word
                          ? KitsuneColors.primary
                          : KitsuneColors.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppTheme.space12),
          Text(
            card.meaning,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: card.type == SrsItemType.kanji
                  ? KitsuneColors.secondary
                  : KitsuneColors.primary,
            ),
            textAlign: TextAlign.center,
          ),
          if (card.amHanViet?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppTheme.space12),
            Text(
              card.amHanViet!,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: KitsuneColors.secondary,
              ),
            ),
          ],
          if (card.onyomi?.trim().isNotEmpty == true ||
              card.kunyomi?.trim().isNotEmpty == true) ...[
            const SizedBox(height: AppTheme.space12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                if (card.onyomi?.trim().isNotEmpty == true)
                  _readingChip('On', card.onyomi!, KitsuneColors.primary),
                if (card.kunyomi?.trim().isNotEmpty == true)
                  _readingChip('Kun', card.kunyomi!, KitsuneColors.secondary),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _readingChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }

  Widget _buildQuiz() {
    final card = _quizQueue.first;
    final question = _currentQuestion!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        KitsuneSurface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  KitsuneActionBadge(
                    icon: Icons.auto_fix_high_rounded,
                    label: _modeLabel(question.mode),
                    color: _modeColor(question.mode),
                    isActive: true,
                  ),
                  KitsuneActionBadge(
                    icon: card.type == SrsItemType.kanji
                        ? Icons.text_fields_rounded
                        : Icons.menu_book_rounded,
                    label: card.type == SrsItemType.kanji ? 'Kanji' : 'Vocabulary',
                    color: card.type == SrsItemType.kanji
                        ? KitsuneColors.secondary
                        : KitsuneColors.primary,
                    isActive: true,
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.space14),
              Text(
                question.promptLabel,
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: AppTheme.space8),
              Text(
                question.prompt,
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                      fontSize: card.type == SrsItemType.kanji &&
                              question.mode != QuizMode.wordFromMean
                          ? 56
                          : 34,
                      color: KitsuneColors.onSurface,
                    ),
              ),
              if (question.helper.trim().isNotEmpty) ...[
                const SizedBox(height: AppTheme.space8),
                Text(
                  question.helper,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppTheme.space16),
        ...question.options.asMap().entries.map((entry) {
          final index = entry.key;
          final option = entry.value;
          final isSelected = _selectedOption == option;
          final isCorrect = option == question.correctAnswer;

          Color fill = KitsuneColors.surface;
          Color border = KitsuneColors.surfaceBorder;

          if (_feedbackMessage != null && isCorrect) {
            fill = KitsuneColors.successSurface;
            border = KitsuneColors.success;
          } else if (_feedbackMessage != null && isSelected && !isCorrect) {
            fill = KitsuneColors.errorSurface;
            border = KitsuneColors.error;
          } else if (isSelected) {
            fill = KitsuneColors.primarySurface;
            border = KitsuneColors.primary;
          }

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                onTap: _feedbackMessage != null
                    ? null
                    : () => setState(() => _selectedOption = option),
                child: Container(
                  padding: const EdgeInsets.all(AppTheme.space16),
                  decoration: BoxDecoration(
                    color: fill,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(color: border),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x0F2B2018),
                        blurRadius: 18,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 26,
                        height: 26,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: border.withValues(alpha: 0.12),
                        ),
                        child: Text(
                          String.fromCharCode(65 + index),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: border,
                          ),
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
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
        if (_feedbackMessage != null) ...[
          KitsuneSurface(
            color: (_lastAnswerCorrect ?? false)
                ? KitsuneColors.successSurface
                : KitsuneColors.errorSurface,
            child: Text(
              _feedbackMessage!,
              style: TextStyle(
                color: (_lastAnswerCorrect ?? false)
                    ? KitsuneColors.success
                    : KitsuneColors.error,
                fontWeight: FontWeight.w700,
                height: 1.45,
              ),
            ),
          ),
          const SizedBox(height: AppTheme.space12),
        ],
        ElevatedButton(
          onPressed: _selectedOption == null || _feedbackMessage != null || _isSubmitting
              ? null
              : _submitQuizAnswer,
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Xác nhận đáp án'),
        ),
      ],
    );
  }

  Widget _buildSummary() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            KitsuneHeroCard(
              title: 'Bạn vừa khóa thêm một nhịp nhỏ.',
              subtitle:
                  'Đã đi qua flashcard và quiz 6 mode. Bạn có thể ôn tiếp hoặc quay lại dashboard để đổi folder.',
              accent: KitsuneColors.secondary,
              trailing: Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  color: KitsuneColors.secondarySurface,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Center(
                  child: Text(
                    '$_accuracyPercent%',
                    style: AppTheme.numeralStyle(
                      fontSize: 28,
                      color: KitsuneColors.secondary,
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
                    label: 'Flashcard',
                    value: '$_flashCompleted',
                    color: KitsuneColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: KitsuneStatTile(
                    label: 'Trả lời',
                    value: '$_answersGiven',
                    color: KitsuneColors.secondary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: KitsuneStatTile(
                    label: 'Sai',
                    value: '$_mistakes',
                    color: KitsuneColors.error,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppTheme.space20),
            ElevatedButton(
              onPressed: _reloadActiveFolder,
              child: const Text('Ôn tiếp'),
            ),
            const SizedBox(height: AppTheme.space10),
            OutlinedButton(
              onPressed: () => setState(() => _showStudyOverlay = false),
              child: const Text('Về dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  String _phaseLabel() {
    switch (_phase) {
      case _StudyPhase.idle:
        return 'Idle';
      case _StudyPhase.flashcard:
        return 'Flashcard';
      case _StudyPhase.quiz:
        return 'Quiz';
      case _StudyPhase.summary:
        return 'Summary';
    }
  }

  String _modeLabel(QuizMode mode) {
    switch (mode) {
      case QuizMode.meanFromWord:
        return 'Nghĩa của từ';
      case QuizMode.wordFromMean:
        return 'Từ từ nghĩa';
      case QuizMode.fillBlank:
        return 'Điền từ';
      case QuizMode.onKunRead:
        return 'Cách đọc';
      case QuizMode.hanViet:
        return 'Âm Hán Việt';
      case QuizMode.composeKanji:
        return 'Nhận dạng Kanji';
    }
  }

  Color _modeColor(QuizMode mode) {
    switch (mode) {
      case QuizMode.meanFromWord:
        return KitsuneColors.info;
      case QuizMode.wordFromMean:
        return KitsuneColors.primary;
      case QuizMode.fillBlank:
        return KitsuneColors.stamp;
      case QuizMode.onKunRead:
        return KitsuneColors.error;
      case QuizMode.hanViet:
        return KitsuneColors.secondary;
      case QuizMode.composeKanji:
        return KitsuneColors.success;
    }
  }
}

class _LevelBucket {
  const _LevelBucket({
    required this.level,
    required this.count,
    required this.label,
    required this.color,
  });

  final int level;
  final int count;
  final String label;
  final Color color;
}
