// kitsune_app/lib/features/topics/topic_learning_page.dart
import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/topic.dart';
import 'package:kitsune_app/core/services/tts_service.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/providers/providers.dart';

class TopicLearningPage extends ConsumerStatefulWidget {
  const TopicLearningPage({super.key});

  @override
  ConsumerState<TopicLearningPage> createState() => _TopicLearningPageState();
}

class _TopicLearningPageState extends ConsumerState<TopicLearningPage> {
  late Future<List<TopicDto>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(kitsuneApiProvider).getTopicsWithLessons();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF7E8),
      body: SafeArea(
        child: FutureBuilder<List<TopicDto>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _ErrorState(
                  onRetry: () => setState(() => _future =
                      ref.read(kitsuneApiProvider).getTopicsWithLessons()));
            }
            final topics = snapshot.data ?? const <TopicDto>[];
            if (topics.isEmpty) {
              return const Center(child: Text('Chưa có chủ đề được xuất bản.'));
            }
            return RefreshIndicator(
              onRefresh: () async => setState(() => _future =
                  ref.read(kitsuneApiProvider).getTopicsWithLessons()),
              child: CustomScrollView(slivers: [
                const SliverToBoxAdapter(child: _CourseHeader()),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(18, 10, 18, 100),
                  sliver: SliverList.builder(
                    itemCount: topics.length,
                    itemBuilder: (_, index) => _TopicCard(
                      topic: topics[index],
                      index: index,
                      onTap: () async {
                        await Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) =>
                                _TopicDetailPage(topic: topics[index])));
                        if (mounted) {
                          setState(() => _future = ref
                              .read(kitsuneApiProvider)
                              .getTopicsWithLessons());
                        }
                      },
                    ),
                  ),
                ),
              ]),
            );
          },
        ),
      ),
    );
  }
}

class _TopicCard extends StatelessWidget {
  const _TopicCard({
    required this.topic,
    required this.index,
    required this.onTap,
  });

  final TopicDto topic;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final completed =
        topic.lessons.where((lesson) => lesson.progress >= 1).length;
    final totalMinutes = topic.lessons.fold<int>(
      0,
      (sum, lesson) => sum + lesson.estimatedMinutes,
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: const Color(0xFFFFFDF8),
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: Color(0xFFEAD5B7)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF0DF),
                  shape: BoxShape.circle,
                ),
                child: Text('${index + 1}',
                    style: const TextStyle(
                        color: Color(0xFFAA4A2B), fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 13),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(topic.title,
                        style: const TextStyle(
                            color: Color(0xFF302A40),
                            fontSize: 18,
                            fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text('${topic.lessons.length} bài học · $totalMinutes phút',
                        style: const TextStyle(color: Color(0xFF75665F))),
                    const SizedBox(height: 11),
                    LinearProgressIndicator(
                        value: topic.lessons.isEmpty
                            ? 0
                            : completed / topic.lessons.length,
                        minHeight: 4,
                        color: const Color(0xFFE26331),
                        backgroundColor: const Color(0xFFECD8BB)),
                  ])),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded,
                  size: 19, color: Color(0xFF9F482A)),
            ]),
          ),
        ),
      ),
    );
  }
}

class _TopicDetailPage extends StatelessWidget {
  const _TopicDetailPage({required this.topic});

  final TopicDto topic;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF7E8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFFF7E8),
        title: const Text('Lộ trình bài học'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 32),
          children: [
            Text(
              topic.jlptLevel == null
                  ? 'CHỦ ĐỀ HỌC'
                  : 'JLPT N${topic.jlptLevel}',
              style: TextStyle(
                color: const Color(0xFFB6502C),
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.4,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              topic.title,
              style: TextStyle(
                color: const Color(0xFF302A40),
                fontFamily: AppTheme.displayFontFamily,
                fontSize: 32,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              topic.description.isEmpty
                  ? '${topic.lessons.length} bài học · học lần lượt để giữ đúng mạch kiến thức.'
                  : topic.description,
              style: const TextStyle(color: Color(0xFF75665F), height: 1.45),
            ),
            const SizedBox(height: 20),
            const Divider(color: Color(0xFFEAD5B7)),
            const SizedBox(height: 2),
            for (var index = 0; index < topic.lessons.length; index++)
              _LessonTile(
                lesson: topic.lessons[index],
                index: index,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) =>
                        LessonStudyPage(lessonId: topic.lessons[index].id),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CourseHeader extends StatelessWidget {
  const _CourseHeader();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(18, 24, 18, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('HỌC TẬP',
            style: TextStyle(
                color: Color(0xFFB6502C),
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.4)),
        SizedBox(height: 6),
        Text('Lộ trình bài học',
            style: TextStyle(
                color: Color(0xFF302A40),
                fontFamily: AppTheme.displayFontFamily,
                fontSize: 32,
                fontWeight: FontWeight.w800,
                height: 1)),
        SizedBox(height: 9),
        Text('Chọn một chủ đề và học theo từng bài để giữ mạch kiến thức.',
            style: TextStyle(color: Color(0xFF75665F), height: 1.45)),
      ]),
    );
  }
}

class _LessonTile extends StatelessWidget {
  const _LessonTile(
      {required this.lesson, required this.index, required this.onTap});
  final LessonDto lesson;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 17),
          decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFEAD5B7)))),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 30,
              height: 30,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: lesson.progress >= 1
                      ? const Color(0xFFE26331)
                      : const Color(0xFFFFFDF8),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFE0C3A1))),
              child: Text('${index + 1}',
                  style: TextStyle(
                      color: lesson.progress >= 1
                          ? Colors.white
                          : const Color(0xFF8B705F),
                      fontSize: 12,
                      fontWeight: FontWeight.w900)),
            ),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(
                      '${lesson.estimatedMinutes} PHÚT · ${lesson.itemCount} MỤC',
                      style: const TextStyle(
                          color: Color(0xFF966C59),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1)),
                  const SizedBox(height: 7),
                  Text(lesson.title,
                      style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF302A40))),
                  if (lesson.description.isNotEmpty)
                    Padding(
                        padding: const EdgeInsets.only(top: 5),
                        child: Text(lesson.description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Color(0xFF75665F)))),
                  const SizedBox(height: 12),
                  LinearProgressIndicator(
                      value: lesson.progress,
                      minHeight: 3,
                      color: const Color(0xFFE26331),
                      backgroundColor: const Color(0xFFECD8BB)),
                ])),
            const SizedBox(width: 8),
            const Padding(
                padding: EdgeInsets.only(top: 23),
                child: Icon(Icons.arrow_forward_rounded,
                    size: 18, color: Color(0xFF9F482A))),
          ]),
        ),
      ),
    );
  }
}

class LessonStudyPage extends ConsumerStatefulWidget {
  const LessonStudyPage({super.key, required this.lessonId});
  final int lessonId;
  @override
  ConsumerState<LessonStudyPage> createState() => _LessonStudyPageState();
}

class _PendingLessonProgress {
  const _PendingLessonProgress({
    required this.lessonId,
    required this.completedItemCount,
    required this.totalItems,
    required this.lastItemId,
  });

  final int lessonId;
  final int completedItemCount;
  final int totalItems;
  final int lastItemId;
}

enum _CompletionSyncState { idle, saving, saved, error }

class _LessonStudyPageState extends ConsumerState<LessonStudyPage> {
  late Future<LessonDto> _future;
  int _index = 0;
  _PendingLessonProgress? _pendingProgress;
  _PendingLessonProgress? _failedProgress;
  bool _progressSaveInFlight = false;
  bool _isCompleted = false;
  _CompletionSyncState _completionSyncState = _CompletionSyncState.idle;
  final TtsService _tts = TtsService();
  @override
  void initState() {
    super.initState();
    _future = _loadLesson();
  }

  Future<LessonDto> _loadLesson() async {
    final lesson =
        await ref.read(kitsuneApiProvider).getLessonDetail(widget.lessonId);
    _index = lesson.completedItemCount
        .clamp(0, max(0, lesson.items.length - 1))
        .toInt();
    return lesson;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFFF7E8),
        appBar: AppBar(
            backgroundColor: const Color(0xFFFFF7E8),
            title: const Text('Bài học'),
            elevation: 0),
        body: FutureBuilder<LessonDto>(
            future: _future,
            builder: (_, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _ErrorState(
                    onRetry: () => setState(() => _future = _loadLesson()));
              }
              if (!snapshot.hasData) {
                return const Center(child: Text('Không thể tải bài học.'));
              }
              final lesson = snapshot.data!;
              if (lesson.items.isEmpty) {
                return const Center(child: Text('Bài học chưa có nội dung.'));
              }
              if (_isCompleted) {
                return _LessonCompletion(
                  lesson: lesson,
                  syncState: _completionSyncState,
                  onRetry: _retryCompletion,
                  onReturn: () =>
                      Navigator.of(context).popUntil((route) => route.isFirst),
                );
              }
              final item = lesson.items[_index];
              return Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(children: [
                    Row(children: [
                      Expanded(
                          child: Text(lesson.title,
                              style: const TextStyle(
                                  fontSize: 24, fontWeight: FontWeight.w800))),
                      Text('${_index + 1}/${lesson.items.length}')
                    ]),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                        value: (_index + 1) / lesson.items.length,
                        color: const Color(0xFFE26331),
                        backgroundColor: const Color(0xFFECD8BB)),
                    const SizedBox(height: 24),
                    Expanded(
                        child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(26),
                            decoration: BoxDecoration(
                                color: const Color(0xFFFFFDF7),
                                border:
                                    Border.all(color: const Color(0xFFEAD5B7)),
                                borderRadius: BorderRadius.circular(12)),
                            child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                      item.kanjiId != null
                                          ? '漢字 · KANJI'
                                          : '語彙 · TỪ VỰNG',
                                      style: const TextStyle(
                                          color: Color(0xFFB6502C),
                                          letterSpacing: 1.2,
                                          fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 22),
                                  Text(item.word,
                                      style: const TextStyle(
                                          fontSize: 68,
                                          color: Color(0xFF302A40))),
                                  if (item.pronunciation.isNotEmpty)
                                    Text(item.pronunciation,
                                        style: const TextStyle(
                                            fontSize: 20,
                                            color: Color(0xFFC7532C))),
                                  if (item.kanjiId != null &&
                                      (item.amHanViet ?? '').isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                        'Âm Hán Việt: ${item.amHanViet}',
                                        style: const TextStyle(
                                          color: Color(0xFF4C3A68),
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 14),
                                  Text(item.meaning,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w700)),
                                  IconButton(
                                      onPressed: () => _tts.speakVocabulary(
                                            item.word,
                                            item.pronunciation,
                                          ),
                                      icon:
                                          const Icon(Icons.volume_up_rounded)),
                                  if (item.exampleSentence != null)
                                    Container(
                                        margin: const EdgeInsets.only(top: 18),
                                        padding: const EdgeInsets.all(14),
                                        color: const Color(0xFFFFF5E8),
                                        child: Column(children: [
                                          Text(item.exampleSentence!,
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.w700)),
                                          if (item.exampleTranslation != null)
                                            Text(item.exampleTranslation!,
                                                style: const TextStyle(
                                                    color: Color(0xFF75665F)))
                                        ])),
                                ]))),
                    const SizedBox(height: 18),
                    Row(children: [
                      OutlinedButton(
                          onPressed: _index == 0
                              ? null
                              : () => setState(() => _index--),
                          child: const Text('Trước')),
                      const Spacer(),
                      FilledButton(
                          onPressed: () => _advanceLesson(lesson, item),
                          style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFFD85A2B)),
                          child: Text(_index == lesson.items.length - 1
                              ? 'Hoàn thành'
                              : 'Đã nhớ · Tiếp')),
                    ]),
                  ]));
            }),
      );

  void _advanceLesson(LessonDto lesson, LessonItemDto item) {
    final completed = _index + 1;
    final isCompleted = completed >= lesson.items.length;
    if (!isCompleted) {
      setState(() => _index++);
    } else {
      setState(() {
        _isCompleted = true;
        _completionSyncState = _CompletionSyncState.saving;
      });
    }
    _queueProgressSave(_PendingLessonProgress(
      lessonId: lesson.id,
      completedItemCount: completed,
      totalItems: lesson.items.length,
      lastItemId: item.id,
    ));
  }

  void _retryCompletion() {
    final progress = _failedProgress;
    if (progress == null) return;
    setState(() => _completionSyncState = _CompletionSyncState.saving);
    _queueProgressSave(progress);
  }

  void _queueProgressSave(_PendingLessonProgress progress) {
    _failedProgress = null;
    _pendingProgress = progress;
    _flushProgressSave();
  }

  void _flushProgressSave() {
    if (_progressSaveInFlight || _pendingProgress == null) return;
    final progress = _pendingProgress!;
    _pendingProgress = null;
    _progressSaveInFlight = true;
    unawaited(() async {
      var wasSaved = false;
      try {
        await ref.read(kitsuneApiProvider).saveLessonProgress(
              progress.lessonId,
              progress.completedItemCount,
              progress.totalItems,
              lastItemId: progress.lastItemId,
            );
        wasSaved = true;
      } catch (_) {
        _failedProgress = progress;
        if (mounted && _pendingProgress == null) {
          if (progress.completedItemCount == progress.totalItems) {
            setState(() => _completionSyncState = _CompletionSyncState.error);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content:
                  Text('Chưa thể đồng bộ tiến độ. Lượt tiếp theo sẽ thử lại.'),
            ));
          }
        }
      } finally {
        _progressSaveInFlight = false;
        if (mounted &&
            wasSaved &&
            progress.completedItemCount == progress.totalItems) {
          setState(() => _completionSyncState = _CompletionSyncState.saved);
        }
        _flushProgressSave();
      }
    }());
  }
}

class _LessonCompletion extends StatelessWidget {
  const _LessonCompletion({
    required this.lesson,
    required this.syncState,
    required this.onRetry,
    required this.onReturn,
  });

  final LessonDto lesson;
  final _CompletionSyncState syncState;
  final VoidCallback onRetry;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    final syncCopy = switch (syncState) {
      _CompletionSyncState.saving => 'Đang lưu tiến độ của bạn…',
      _CompletionSyncState.saved => 'Tiến độ đã được lưu.',
      _CompletionSyncState.error =>
        'Chưa thể đồng bộ lúc này. Bạn có thể thử lưu lại.',
      _CompletionSyncState.idle => '',
    };
    return SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFDF8),
              border: Border.all(color: const Color(0xFFEAD5B7)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 58,
                height: 58,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                    color: Color(0xFFFFF0DF), shape: BoxShape.circle),
                child: const Icon(Icons.check_rounded,
                    color: Color(0xFFAA4A2B), size: 30),
              ),
              const SizedBox(height: 20),
              const Text('BÀI HỌC ĐÃ HOÀN THÀNH',
                  style: TextStyle(
                      color: Color(0xFFB6502C),
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2)),
              const SizedBox(height: 7),
              Text(lesson.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: Color(0xFF302A40),
                      fontFamily: AppTheme.displayFontFamily,
                      fontSize: 30,
                      fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              const Text(
                  'Bạn đã đi qua toàn bộ mục học. Từ vựng sẽ sẵn sàng cho các lượt ôn tập tiếp theo.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF75665F), height: 1.5)),
              const SizedBox(height: 22),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 13),
                decoration: const BoxDecoration(
                    border: Border.symmetric(
                        horizontal: BorderSide(color: Color(0xFFEAD5B7)))),
                child: Row(children: [
                  Expanded(
                      child: _CompletionStat(
                          label: 'ĐÃ HỌC',
                          value:
                              '${lesson.items.length} / ${lesson.items.length}')),
                  Container(
                      width: 1, height: 34, color: const Color(0xFFEAD5B7)),
                  Expanded(
                      child: _CompletionStat(
                          label: 'THỜI LƯỢNG',
                          value: '${lesson.estimatedMinutes} phút')),
                ]),
              ),
              const SizedBox(height: 16),
              Text(syncCopy,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      color: syncState == _CompletionSyncState.error
                          ? const Color(0xFFA6412A)
                          : const Color(0xFF66715D),
                      fontSize: 13,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              if (syncState == _CompletionSyncState.error)
                OutlinedButton(
                    onPressed: onRetry, child: const Text('Thử lưu lại')),
              const SizedBox(height: 8),
              SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                      onPressed: onReturn,
                      style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFD85A2B),
                          minimumSize: const Size.fromHeight(46)),
                      child: const Text('Quay về lộ trình'))),
            ]),
          ),
        ),
      ),
    );
  }
}

class _CompletionStat extends StatelessWidget {
  const _CompletionStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(children: [
        Text(label,
            style: const TextStyle(
                color: Color(0xFF8A7566),
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: .7)),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
                color: Color(0xFF3A3044),
                fontSize: 16,
                fontWeight: FontWeight.w900)),
      ]);
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.cloud_off_rounded,
            size: 44, color: KitsuneColors.error),
        const SizedBox(height: 10),
        const Text('Không thể tải chủ đề. Hãy kiểm tra migration v3.'),
        TextButton(onPressed: onRetry, child: const Text('Thử lại'))
      ]));
}

enum _MobileGame { bubble, kana, memory, listening, shiritori }

class MobileGameHubPage extends StatelessWidget {
  const MobileGameHubPage({super.key});
  static const games = [
    (
      _MobileGame.bubble,
      'Bong bóng từ vựng',
      '60 giây · sai trừ 2 giây',
      Icons.bubble_chart_rounded
    ),
    (
      _MobileGame.kana,
      'Kéo từ thành nghĩa',
      'Nối kana thành cách đọc',
      Icons.gesture_rounded
    ),
    (
      _MobileGame.memory,
      'Siêu trí nhớ',
      '10 cặp · 90 giây',
      Icons.grid_view_rounded
    ),
    (
      _MobileGame.listening,
      'Nghe đoán từ',
      'Nghe và chọn nghĩa',
      Icons.headphones_rounded
    ),
    (
      _MobileGame.shiritori,
      'Nối từ với máy',
      '10 giây mỗi lượt · nhập bằng Kanji',
      Icons.hub_rounded
    ),
  ];
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF7ED),
      appBar: AppBar(
        title: const Text('Kitsune Playground'),
        backgroundColor: const Color(0xFFFBF7ED),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: Image.asset(
                    'assets/images/minigame-hub-v3.png',
                    height: min(128, constraints.maxHeight * .22),
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 9),
                Expanded(
                  child: Column(
                    children: games
                        .map((game) => Expanded(
                              child: Card(
                                elevation: 0,
                                margin: const EdgeInsets.symmetric(vertical: 3),
                                color: const Color(0xFFFFFDF7),
                                shape: RoundedRectangleBorder(
                                  side: const BorderSide(
                                      color: Color(0xFFD8CBB8)),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor: const Color(0xFF3D3565),
                                    child: Icon(game.$4, color: Colors.white),
                                  ),
                                  title: Text(game.$2,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w800)),
                                  subtitle: Text(game.$3),
                                  trailing:
                                      const Icon(Icons.arrow_forward_rounded),
                                  onTap: () => Navigator.of(context)
                                      .push(MaterialPageRoute(
                                    builder: (_) => _MobileGamePage(
                                        type: game.$1, title: game.$2),
                                  )),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MemoryTile {
  _MemoryTile(this.key, this.id, this.value);
  final String key;
  final int id;
  final String value;
  bool open = false;
  bool matched = false;
}

class _MobileGamePage extends ConsumerStatefulWidget {
  const _MobileGamePage({required this.type, required this.title});
  final _MobileGame type;
  final String title;
  @override
  ConsumerState<_MobileGamePage> createState() => _MobileGamePageState();
}

class _MobileGamePageState extends ConsumerState<_MobileGamePage>
    with SingleTickerProviderStateMixin {
  final _tts = TtsService();
  late final AnimationController _floatController;
  Timer? _timer;
  List<GameVocabularyDto> _items = [];
  List<GameVocabularyDto> _roundOptions = [];
  List<_MemoryTile> _memory = [];
  final List<String> _memoryOpen = [];
  final List<String> _kana = [];
  List<String> _kanaTiles = [];
  final List<int> _usedKanaIndexes = [];
  final TextEditingController _shiritoriController = TextEditingController();
  final List<({String speaker, GameVocabularyDto item})> _shiritoriHistory = [];
  String _shiritoriRequired = '';
  String? _shiritoriError;
  bool _botThinking = false;
  int _index = 0, _score = 0, _correct = 0, _wrong = 0, _seconds = 60;
  bool _loading = true, _finished = false;
  GameVocabularyDto get current => _items[_index % _items.length];
  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 7),
    )..repeat(reverse: true);
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _floatController.dispose();
    _shiritoriController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final items = await ref.read(kitsuneApiProvider).getGameVocabulary(
        limit: widget.type == _MobileGame.memory
            ? 10
            : widget.type == _MobileGame.shiritori
                ? 120
                : 30);
    if (!mounted) return;
    _items = items;
    _seconds = widget.type == _MobileGame.memory
        ? 90
        : widget.type == _MobileGame.shiritori
            ? 10
            : 60;
    if (widget.type == _MobileGame.memory) {
      _memory = items
          .take(10)
          .expand((item) => [
                _MemoryTile('${item.id}w', item.id, item.word),
                _MemoryTile('${item.id}r', item.id, item.pronunciation)
              ])
          .toList()
        ..shuffle();
    }
    _prepareRound();
    if (widget.type == _MobileGame.shiritori) _startShiritori();
    setState(() => _loading = false);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _seconds--);
      if (_seconds <= 0) _finish();
    });
    if (widget.type == _MobileGame.listening) {
      _tts.speakVocabulary(current.word, current.pronunciation);
    }
  }

  List<GameVocabularyDto> _options(int count) {
    final others = _items.where((item) => item.id != current.id).toList()
      ..shuffle();
    return [current, ...others.take(count - 1)]..shuffle();
  }

  void _prepareRound() {
    if (_items.isEmpty) return;
    _roundOptions = _options(widget.type == _MobileGame.listening ? 4 : 8);
    final chars = [
      ...current.pronunciation.characters,
      ...'あいうえおかきくけこさしすせそ'
          .characters
          .take(max(4, 12 - current.pronunciation.characters.length)),
    ];
    chars.shuffle();
    _kanaTiles = chars;
    _usedKanaIndexes.clear();
  }

  void _answer(bool ok, {bool timePenalty = false}) {
    setState(() {
      if (ok) {
        _correct++;
        _score += 100 + _seconds;
      } else {
        _wrong++;
        if (timePenalty) _seconds = max(0, _seconds - 2);
      }
      _index++;
      _kana.clear();
      _prepareRound();
    });
    if (widget.type == _MobileGame.listening) {
      _tts.speakVocabulary(current.word, current.pronunciation);
    }
  }

  void _finish() {
    if (_finished) return;
    _timer?.cancel();
    setState(() => _finished = true);
    ref.read(kitsuneApiProvider).recordMinigame(
        [
          'BUBBLE_POP',
          'KANA_PATH',
          'MEMORY_MATCH',
          'LISTENING',
          'SHIRITORI'
        ][widget.type.index],
        _score,
        _correct,
        _wrong,
        (widget.type == _MobileGame.memory
                ? 90
                : widget.type == _MobileGame.shiritori
                    ? 10
                    : 60) -
            _seconds);
  }

  void _startShiritori() {
    final choices = _items
        .where((item) =>
            _containsKanji(item.word) &&
            _normalizeReading(item.pronunciation).length >= 2 &&
            !_normalizeReading(item.pronunciation).endsWith('ん'))
        .toList();
    if (choices.isEmpty) {
      _shiritoriError = 'Kho từ chưa đủ dữ liệu Kanji.';
      return;
    }
    final first = choices[Random().nextInt(choices.length)];
    _shiritoriHistory
      ..clear()
      ..add((speaker: 'Kitsune', item: first));
    _shiritoriRequired = _readingTail(first.pronunciation);
    _tts.speakVocabulary(first.word, first.pronunciation);
  }

  void _submitShiritori() {
    if (_botThinking) return;
    final input = _shiritoriController.text.trim();
    if (!_containsKanji(input)) {
      setState(() => _shiritoriError = 'Hãy nhập một từ có Kanji.');
      return;
    }
    final used = _shiritoriHistory.map((turn) => turn.item.word).toSet();
    final matches =
        _items.where((item) => item.word == input && !used.contains(item.word));
    final match = matches.isEmpty ? null : matches.first;
    if (match == null) {
      setState(
          () => _shiritoriError = 'Từ không có trong kho hoặc đã được dùng.');
      return;
    }
    if (!_normalizeReading(match.pronunciation)
        .startsWith(_shiritoriRequired)) {
      setState(() =>
          _shiritoriError = 'Từ phải bắt đầu bằng “$_shiritoriRequired”.');
      return;
    }
    setState(() {
      _shiritoriHistory.add((speaker: 'Bạn', item: match));
      _correct++;
      _score += 150 + _seconds * 5;
      _shiritoriController.clear();
      _shiritoriError = null;
      _botThinking = true;
    });
    final required = _readingTail(match.pronunciation);
    final nextUsed = _shiritoriHistory.map((turn) => turn.item.word).toSet();
    final botChoices = _items
        .where((item) =>
            _containsKanji(item.word) &&
            !nextUsed.contains(item.word) &&
            _normalizeReading(item.pronunciation).startsWith(required) &&
            !_normalizeReading(item.pronunciation).endsWith('ん'))
        .toList();
    if (botChoices.isEmpty) {
      setState(() => _score += 500);
      _finish();
      return;
    }
    final bot = botChoices[Random().nextInt(botChoices.length)];
    Future.delayed(const Duration(milliseconds: 450), () {
      if (!mounted || _finished) return;
      setState(() {
        _shiritoriHistory.add((speaker: 'Kitsune', item: bot));
        _shiritoriRequired = _readingTail(bot.pronunciation);
        _botThinking = false;
        _seconds = 10;
      });
      _tts.speakVocabulary(bot.word, bot.pronunciation);
    });
  }

  bool _containsKanji(String value) =>
      RegExp(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]').hasMatch(value);

  String _normalizeReading(String value) => String.fromCharCodes(value
      .trim()
      .replaceAll(RegExp(r'[\s・.]'), '')
      .runes
      .map((code) => code >= 0x30A1 && code <= 0x30F6 ? code - 0x60 : code));

  String _readingTail(String value) {
    final reading = _normalizeReading(value).replaceAll(RegExp(r'ー+$'), '');
    final chars = reading.characters.toList();
    return chars.skip(max(0, chars.length - 2)).join();
  }

  void _flip(_MemoryTile tile) {
    if (tile.open || tile.matched || _memoryOpen.length >= 2) return;
    setState(() {
      tile.open = true;
      _memoryOpen.add(tile.key);
    });
    if (_memoryOpen.length == 2) {
      final pair = _memory.where((e) => _memoryOpen.contains(e.key)).toList();
      if (pair[0].id == pair[1].id) {
        setState(() {
          for (final entry in pair) {
            entry.matched = true;
          }
          _memoryOpen.clear();
          _correct++;
          _score += 120;
        });
        if (_memory.every((entry) => entry.matched)) _finish();
      } else {
        _wrong++;
        Future.delayed(const Duration(milliseconds: 650), () {
          if (!mounted) return;
          setState(() {
            for (final entry in pair) {
              entry.open = false;
            }
            _memoryOpen.clear();
          });
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: const Color(0xFF272238),
      appBar: AppBar(
          backgroundColor: const Color(0xFF272238),
          foregroundColor: Colors.white,
          title: Text(widget.title),
          actions: [
            Center(
                child: Text('$_score điểm · ${_seconds}s  ',
                    style: const TextStyle(fontWeight: FontWeight.w800)))
          ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _finished
              ? _result()
              : Container(
                  margin: const EdgeInsets.all(12),
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                      color: Color(0xFFFBF7ED),
                      borderRadius: BorderRadius.only(
                          topRight: Radius.circular(34),
                          bottomLeft: Radius.circular(4),
                          bottomRight: Radius.circular(4),
                          topLeft: Radius.circular(4))),
                  child: _gameBody()));
  Widget _result() => Center(
      child: Card(
          color: const Color(0xFFFFFDF7),
          child: Padding(
              padding: const EdgeInsets.all(38),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Text('遊',
                    style: TextStyle(fontSize: 46, color: Color(0xFFD85B3F))),
                Text('$_score',
                    style: const TextStyle(
                        fontSize: 62, fontWeight: FontWeight.w900)),
                Text('$_correct đúng · $_wrong sai'),
                const SizedBox(height: 20),
                FilledButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Chọn trò khác'))
              ]))));
  Widget _gameBody() {
    if (widget.type == _MobileGame.memory) {
      return GridView.count(
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 4,
          mainAxisSpacing: 7,
          crossAxisSpacing: 7,
          children: _memory
              .map((tile) => FilledButton(
                  onPressed: () => _flip(tile),
                  style: FilledButton.styleFrom(
                      backgroundColor: tile.matched
                          ? const Color(0xFF5E7B63)
                          : tile.open
                              ? const Color(0xFFFFFDF7)
                              : const Color(0xFF3D3565),
                      foregroundColor:
                          tile.open ? const Color(0xFF272238) : Colors.white,
                      padding: const EdgeInsets.all(4)),
                  child: Text(tile.open || tile.matched ? tile.value : '狐',
                      textAlign: TextAlign.center)))
              .toList());
    }
    if (widget.type == _MobileGame.kana) {
      return Column(children: [
        Text(current.word,
            style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w700)),
        Text(current.meaning),
        const SizedBox(height: 18),
        Text(_kana.join().isEmpty ? '＿ ＿ ＿' : _kana.join(),
            style: const TextStyle(fontSize: 34, color: Color(0xFFD85B3F))),
        const SizedBox(height: 16),
        Expanded(
            child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4, mainAxisSpacing: 7, crossAxisSpacing: 7),
                itemCount: _kanaTiles.length,
                itemBuilder: (context, tileIndex) => FilledButton(
                    onPressed: _usedKanaIndexes.contains(tileIndex)
                        ? null
                        : () => setState(() {
                              _usedKanaIndexes.add(tileIndex);
                              _kana.add(_kanaTiles[tileIndex]);
                            }),
                    style: FilledButton.styleFrom(
                        backgroundColor: [
                          const Color(0xFF3FA8DD),
                          const Color(0xFF42BE68),
                          const Color(0xFFD9468B),
                        ][tileIndex % 3],
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12))),
                    child: Text(_kanaTiles[tileIndex],
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.w900))))),
        const Spacer(),
        Row(children: [
          OutlinedButton(
              onPressed: _kana.isEmpty
                  ? null
                  : () => setState(() {
                        _kana.removeLast();
                        _usedKanaIndexes.removeLast();
                      }),
              child: const Text('Xóa')),
          const Spacer(),
          FilledButton(
              onPressed: () => _answer(_kana.join() == current.pronunciation),
              child: const Text('Kiểm tra'))
        ])
      ]);
    }
    if (widget.type == _MobileGame.shiritori) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('しりとり',
              style: TextStyle(
                  color: Color(0xFFD85B3F), fontWeight: FontWeight.w900)),
          Text('Bắt đầu bằng $_shiritoriRequired',
              style: const TextStyle(fontWeight: FontWeight.w800)),
        ]),
        const SizedBox(height: 12),
        Expanded(
            child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
              color: const Color(0xFFF6E8CE),
              borderRadius: BorderRadius.circular(18)),
          child: ListView.separated(
            reverse: true,
            scrollDirection: Axis.horizontal,
            itemCount: _shiritoriHistory.length,
            separatorBuilder: (_, __) => const Icon(Icons.arrow_forward_rounded,
                color: Color(0xFFD85B3F)),
            itemBuilder: (context, historyIndex) {
              final turn = _shiritoriHistory.reversed.toList()[historyIndex];
              return Center(
                  child: Container(
                      width: 132,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: turn.speaker == 'Bạn'
                              ? const Color(0xFFFFE8BE)
                              : const Color(0xFFE4F8F7),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: turn.speaker == 'Bạn'
                                  ? const Color(0xFFF1A84B)
                                  : const Color(0xFF65BFC3))),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(turn.speaker,
                            style: const TextStyle(fontSize: 11)),
                        Text(turn.item.word,
                            style: const TextStyle(
                                fontSize: 25, fontWeight: FontWeight.w900)),
                        Text(turn.item.pronunciation,
                            style: const TextStyle(fontSize: 12)),
                      ])));
            },
          ),
        )),
        const SizedBox(height: 12),
        TextField(
          controller: _shiritoriController,
          enabled: !_botThinking,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _submitShiritori(),
          decoration: InputDecoration(
            labelText:
                _botThinking ? 'Kitsune đang nghĩ…' : 'Bạn còn $_seconds giây',
            hintText: 'Nhập từ bằng Kanji…',
            errorText: _shiritoriError,
            suffixIcon: IconButton.filled(
                onPressed: _botThinking ? null : _submitShiritori,
                icon: const Icon(Icons.arrow_forward_rounded)),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ]);
    }
    final listening = widget.type == _MobileGame.listening;
    final options = _roundOptions;
    return Column(children: [
      Text(listening ? 'Nghe và chọn nghĩa đúng' : 'Tìm từ có nghĩa',
          style: const TextStyle(
              color: Color(0xFFD85B3F), fontWeight: FontWeight.w800)),
      const SizedBox(height: 14),
      listening
          ? IconButton.filled(
              onPressed: () => _tts.speakVocabulary(
                    current.word,
                    current.pronunciation,
                  ),
              iconSize: 52,
              icon: const Icon(Icons.volume_up_rounded))
          : Text(current.meaning,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
              textAlign: TextAlign.center),
      const SizedBox(height: 22),
      Expanded(
          child: listening
              ? GridView.count(
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 1,
                  childAspectRatio: 4.6,
                  mainAxisSpacing: 9,
                  children: options
                      .map((item) => OutlinedButton(
                            onPressed: () => _answer(item.id == current.id),
                            child: Text(item.meaning,
                                style: const TextStyle(
                                    fontSize: 17, fontWeight: FontWeight.w700)),
                          ))
                      .toList())
              : AnimatedBuilder(
                  animation: _floatController,
                  builder: (context, _) => LayoutBuilder(
                      builder: (context, bounds) => Stack(
                            clipBehavior: Clip.hardEdge,
                            children: options.asMap().entries.map((entry) {
                              final i = entry.key;
                              final item = entry.value;
                              final size = 76.0 + (i % 3) * 8;
                              final columns = 3;
                              final x = (i % columns) *
                                  (bounds.maxWidth - size) /
                                  (columns - 1);
                              final row = i ~/ columns;
                              final baseY =
                                  row * max(78, (bounds.maxHeight - size) / 2);
                              final drift = sin(
                                      (_floatController.value * pi * 2) +
                                          i * .9) *
                                  16;
                              return Positioned(
                                left: (x + drift)
                                    .clamp(0, max(0, bounds.maxWidth - size)),
                                top: (baseY - drift)
                                    .clamp(0, max(0, bounds.maxHeight - size)),
                                width: size,
                                height: size,
                                child: FilledButton(
                                  onPressed: () => _answer(
                                      item.id == current.id,
                                      timePenalty: true),
                                  style: FilledButton.styleFrom(
                                    padding: const EdgeInsets.all(6),
                                    backgroundColor: [
                                      const Color(0xFF3FA8DD),
                                      const Color(0xFF42BE68),
                                      const Color(0xFFD9468B)
                                    ][i % 3],
                                    shape: const CircleBorder(
                                        side: BorderSide(
                                            color: Colors.white, width: 3)),
                                  ),
                                  child: Text(item.word,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w900)),
                                ),
                              );
                            }).toList(),
                          )),
                ))
    ]);
  }
}
