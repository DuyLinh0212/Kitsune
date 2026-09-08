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
            final strings = ref.watch(stringsProvider);
            final topics = snapshot.data ?? const <TopicDto>[];
            if (topics.isEmpty) {
              return Center(child: Text(strings.noTopicsPublished));
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

class _TopicCard extends ConsumerWidget {
  const _TopicCard({
    required this.topic,
    required this.index,
    required this.onTap,
  });

  final TopicDto topic;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
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
                    Text(
                      strings.formatTopicStats(
                        topic.lessons.length,
                        totalMinutes,
                      ),
                      style: const TextStyle(color: Color(0xFF75665F)),
                    ),
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

class _TopicDetailPage extends ConsumerWidget {
  const _TopicDetailPage({required this.topic});

  final TopicDto topic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return Scaffold(
      backgroundColor: const Color(0xFFFFF7E8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFFF7E8),
        title: Text(strings.lessonPathTitle),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 32),
          children: [
            Text(
              topic.jlptLevel == null
                  ? strings.topicStudyHeader
                  : 'JLPT N${topic.jlptLevel}',
              style: const TextStyle(
                color: Color(0xFFB6502C),
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
                  ? strings.formatTopicLessonCountHint(topic.lessons.length)
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
                    builder: (_) => LessonStudyPage(
                      lessonId: topic.lessons[index].id,
                      topic: topic,
                      lessonIndex: index,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _CourseHeader extends ConsumerWidget {
  const _CourseHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 24, 18, 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(strings.topicsHeaderTag,
            style: const TextStyle(
                color: Color(0xFFB6502C),
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.4)),
        const SizedBox(height: 6),
        Text(strings.lessonPathTitle,
            style: TextStyle(
                color: const Color(0xFF302A40),
                fontFamily: AppTheme.displayFontFamily,
                fontSize: 32,
                fontWeight: FontWeight.w800,
                height: 1)),
        const SizedBox(height: 9),
        Text(strings.courseHeaderSubtitle,
            style: const TextStyle(color: Color(0xFF75665F), height: 1.45)),
      ]),
    );
  }
}

class _LessonTile extends ConsumerWidget {
  const _LessonTile(
      {required this.lesson, required this.index, required this.onTap});
  final LessonDto lesson;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
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
                      strings.formatLessonMetric(
                        lesson.estimatedMinutes,
                        lesson.itemCount,
                      ),
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
  const LessonStudyPage({
    super.key,
    required this.lessonId,
    this.topic,
    this.lessonIndex,
  });

  final int lessonId;
  final TopicDto? topic;
  final int? lessonIndex;

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
  final Set<int> _memorizedItemIds = <int>{};
  bool _isMemoExpanded = false;
  late final DateTime _studyStartTime;
  _PendingLessonProgress? _pendingProgress;
  _PendingLessonProgress? _failedProgress;
  bool _progressSaveInFlight = false;
  bool _isCompleted = false;
  _CompletionSyncState _completionSyncState = _CompletionSyncState.idle;
  final TtsService _tts = TtsService();

  @override
  void initState() {
    super.initState();
    _studyStartTime = DateTime.now();
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

  String _toKatakana(String input) {
    return String.fromCharCodes(input.runes.map((rune) {
      if (rune >= 0x3041 && rune <= 0x3096) {
        return rune + 0x60;
      }
      return rune;
    }));
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return Scaffold(
        backgroundColor: const Color(0xFFFFF7E8),
        body: SafeArea(
          child: FutureBuilder<LessonDto>(
            future: _future,
            builder: (_, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _ErrorState(
                  onRetry: () => setState(() => _future = _loadLesson()),
                );
              }
              if (!snapshot.hasData) {
                return Center(child: Text(strings.cannotLoadLesson));
              }
              final lesson = snapshot.data!;
              if (lesson.items.isEmpty) {
                return Center(child: Text(strings.lessonEmpty));
              }

              final lessonNumber = widget.lessonIndex != null
                  ? '${widget.lessonIndex! + 1}. '
                  : (lesson.orderIndex > 0 ? '${lesson.orderIndex}. ' : '');
              final fullTitle = '$lessonNumber${lesson.title}';

              if (_isCompleted) {
                LessonDto? nextLesson;
                int? nextLessonIndex;
                if (widget.topic != null && widget.lessonIndex != null) {
                  final nextIdx = widget.lessonIndex! + 1;
                  if (nextIdx < widget.topic!.lessons.length) {
                    nextLesson = widget.topic!.lessons[nextIdx];
                    nextLessonIndex = nextIdx;
                  }
                }

                final elapsedMinutes = max(
                  1,
                  DateTime.now().difference(_studyStartTime).inMinutes,
                );

                return _LessonCompletion(
                  lesson: lesson,
                  fullTitle: fullTitle,
                  totalWords: lesson.items.length,
                  memorizedCount: _memorizedItemIds.length,
                  elapsedMinutes: elapsedMinutes,
                  nextLesson: nextLesson,
                  nextLessonIndex: nextLessonIndex,
                  syncState: _completionSyncState,
                  onRetry: _retryCompletion,
                  onNextLesson: nextLesson != null
                      ? () => Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => LessonStudyPage(
                                lessonId: nextLesson!.id,
                                topic: widget.topic,
                                lessonIndex: nextLessonIndex,
                              ),
                            ),
                          )
                      : null,
                  onReturn: () => Navigator.of(context).pop(),
                );
              }

              final item = lesson.items[_index];
              return Column(
                children: [
                  _buildHeader(fullTitle, lesson.items.length),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                      child: _buildMainCard(item, strings),
                    ),
                  ),
                  _buildBottomBar(lesson, item, strings),
                ],
              );
            },
          ),
        ),
      );
  }

  Widget _buildHeader(String title, int totalItems) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(6, 4, 16, 8),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(
                  Icons.arrow_back_rounded,
                  color: Color(0xFF302A40),
                  size: 24,
                ),
                onPressed: () => Navigator.of(context).maybePop(),
              ),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF302A40),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${_index + 1} / $totalItems',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF8A7566),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: (_index + 1) / totalItems,
                minHeight: 4,
                color: const Color(0xFFE26331),
                backgroundColor: const Color(0xFFECD8BB),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainCard(LessonItemDto item, AppStrings strings) {
    final hasPronunciation = item.pronunciation.trim().isNotEmpty &&
        item.pronunciation.trim() != item.word.trim();
    final furigana = hasPronunciation ? item.pronunciation.trim() : '';

    String readingSubtext = '';
    if (item.onyomi != null && item.onyomi!.trim().isNotEmpty) {
      readingSubtext = item.onyomi!.trim();
    } else if (item.pronunciation.trim().isNotEmpty) {
      readingSubtext = _toKatakana(item.pronunciation.trim());
    } else if (item.romaji != null && item.romaji!.trim().isNotEmpty) {
      readingSubtext = item.romaji!.trim();
    }

    final hasReadings = (item.onyomi != null && item.onyomi!.trim().isNotEmpty) ||
        (item.kunyomi != null && item.kunyomi!.trim().isNotEmpty) ||
        (item.amHanViet != null && item.amHanViet!.trim().isNotEmpty);

    final hasExample = item.exampleSentence != null &&
        item.exampleSentence!.trim().isNotEmpty;

    final memoText = item.memo?.trim().isNotEmpty == true
        ? item.memo!.trim()
        : '';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEAD5B7), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A3A2510),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Word, Furigana & Audio
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (furigana.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    furigana,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: const Color(0xFF8A7566),
                      fontWeight: FontWeight.w600,
                      fontFamily: AppTheme.japaneseFontFamily,
                    ),
                  ),
                ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(width: 42),
                  Flexible(
                    child: Text(
                      item.word,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF2C2420),
                        fontFamily: AppTheme.japaneseFontFamily,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Material(
                    color: const Color(0xFFFFF0DF),
                    borderRadius: BorderRadius.circular(10),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => _tts.speak(item.word),
                      child: Container(
                        padding: const EdgeInsets.all(7),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFF0CEB4)),
                        ),
                        child: const Icon(
                          Icons.volume_up_rounded,
                          color: Color(0xFFE26331),
                          size: 21,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (readingSubtext.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    readingSubtext,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF6B5C55),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),

          const Divider(color: Color(0xFFF0E2D0), height: 30, thickness: 1),

          // Ý nghĩa
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 78,
                child: Text(
                  strings.meaning,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF332B27),
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  item.meaning,
                  style: const TextStyle(
                    fontSize: 14.5,
                    color: Color(0xFF332B27),
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),

          // Cách đọc
          if (hasReadings) ...[
            const Divider(color: Color(0xFFF0E2D0), height: 30, thickness: 1),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 78,
                  child: Text(
                    strings.readings,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF332B27),
                    ),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (item.onyomi != null &&
                          item.onyomi!.trim().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 68,
                                child: Text(
                                  strings.onyomi,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF7A6B63),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  item.onyomi!.trim(),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF2C2420),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (item.kunyomi != null &&
                          item.kunyomi!.trim().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 68,
                                child: Text(
                                  strings.kunyomi,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF7A6B63),
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  item.kunyomi!.trim(),
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF2C2420),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (item.amHanViet != null &&
                          item.amHanViet!.trim().isNotEmpty)
                        Row(
                          children: [
                            SizedBox(
                              width: 68,
                              child: Text(
                                strings.sinoVietnamese,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF7A6B63),
                                ),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                item.amHanViet!.trim(),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF2C2420),
                                ),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ],

          // Ví dụ
          if (hasExample) ...[
            const Divider(color: Color(0xFFF0E2D0), height: 30, thickness: 1),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      strings.example,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF332B27),
                      ),
                    ),
                    Material(
                      color: const Color(0xFFFFF0DF),
                      borderRadius: BorderRadius.circular(6),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(6),
                        onTap: () => _tts.speak(item.exampleSentence!),
                        child: Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color: const Color(0xFFF0CEB4), width: 0.8),
                          ),
                          child: const Icon(
                            Icons.volume_up_rounded,
                            size: 17,
                            color: Color(0xFFE26331),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  item.exampleSentence!,
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF2C2420),
                    fontFamily: AppTheme.japaneseFontFamily,
                    height: 1.45,
                  ),
                ),
                if (item.exampleTranslation != null &&
                    item.exampleTranslation!.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.exampleTranslation!.trim(),
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: Color(0xFF75665F),
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ],

          // Ghi chú
          const Divider(color: Color(0xFFF0E2D0), height: 30, thickness: 1),
          InkWell(
            onTap: () => setState(() => _isMemoExpanded = !_isMemoExpanded),
            borderRadius: BorderRadius.circular(6),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    strings.notes,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF332B27),
                    ),
                  ),
                  Icon(
                    _isMemoExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: const Color(0xFF75665F),
                    size: 22,
                  ),
                ],
              ),
            ),
          ),
          if (_isMemoExpanded)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                memoText.isNotEmpty
                    ? memoText
                    : strings.noNotesYet,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: Color(0xFF6B5C55),
                  height: 1.45,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(LessonDto lesson, LessonItemDto item, AppStrings strings) {
    final isMemorized = _memorizedItemIds.contains(item.id);
    final isFirst = _index == 0;
    final isLast = _index == lesson.items.length - 1;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFFFF7E8),
        border: Border(
          top: BorderSide(color: Color(0xFFEEDCC7), width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Nút [前へ] (Previous)
            SizedBox(
              width: 88,
              height: 46,
              child: OutlinedButton(
                onPressed: isFirst
                    ? null
                    : () {
                        setState(() {
                          _index--;
                          _isMemoExpanded = false;
                        });
                      },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(88, 46),
                  padding: EdgeInsets.zero,
                  side: BorderSide(
                    color: isFirst
                        ? const Color(0xFFD6C8B8)
                        : const Color(0xFFE26331),
                    width: 1.4,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  backgroundColor: isFirst
                      ? const Color(0xFFF7EFE6)
                      : Colors.transparent,
                ),
                child: Text(
                  strings.previous,
                  style: TextStyle(
                    color: isFirst
                        ? const Color(0xFFB0A094)
                        : const Color(0xFFE26331),
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
              ),
            ),

            const Spacer(),

            // Checkbox [ ] Đã nhớ
            InkWell(
              onTap: () {
                setState(() {
                  if (isMemorized) {
                    _memorizedItemIds.remove(item.id);
                  } else {
                    _memorizedItemIds.add(item.id);
                  }
                });
              },
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: isMemorized
                            ? const Color(0xFFE26331)
                            : const Color(0xFFFFFDF8),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: isMemorized
                              ? const Color(0xFFE26331)
                              : const Color(0xFF9E8E84),
                          width: 1.8,
                        ),
                      ),
                      child: isMemorized
                          ? const Icon(
                              Icons.check_rounded,
                              size: 16,
                              color: Colors.white,
                            )
                          : null,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      strings.memorized,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF2C2420),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const Spacer(),

            // Nút [Tiếp theo] (Next / Complete)
            SizedBox(
              width: 96,
              height: 46,
              child: FilledButton(
                onPressed: () => _advanceLesson(lesson, item),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(96, 46),
                  padding: EdgeInsets.zero,
                  backgroundColor: const Color(0xFFE26331),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  elevation: 0,
                ),
                child: Text(
                  isLast ? strings.complete : strings.next,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 14.5,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _advanceLesson(LessonDto lesson, LessonItemDto item) {
    final completed = _index + 1;
    final isCompleted = completed >= lesson.items.length;
    if (!isCompleted) {
      setState(() {
        _index++;
        _isMemoExpanded = false;
      });
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
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content:
                  Text(ref.read(stringsProvider).syncProgressFailed),
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

class _LessonCompletion extends ConsumerWidget {
  const _LessonCompletion({
    required this.lesson,
    required this.fullTitle,
    required this.totalWords,
    required this.memorizedCount,
    required this.elapsedMinutes,
    required this.nextLesson,
    required this.nextLessonIndex,
    required this.syncState,
    required this.onRetry,
    required this.onNextLesson,
    required this.onReturn,
  });

  final LessonDto lesson;
  final String fullTitle;
  final int totalWords;
  final int memorizedCount;
  final int elapsedMinutes;
  final LessonDto? nextLesson;
  final int? nextLessonIndex;
  final _CompletionSyncState syncState;
  final VoidCallback onRetry;
  final VoidCallback? onNextLesson;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final accuracy = totalWords == 0
        ? 100
        : ((memorizedCount / totalWords) * 100).round();

    final syncCopy = switch (syncState) {
      _CompletionSyncState.saving => strings.savingProgress,
      _CompletionSyncState.saved => strings.progressSaved,
      _CompletionSyncState.error => strings.syncError,
      _CompletionSyncState.idle => '',
    };

    return Column(
      children: [
        // Top Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              IconButton(
                icon: const Icon(
                  Icons.close_rounded,
                  color: Color(0xFF302A40),
                  size: 24,
                ),
                onPressed: onReturn,
              ),
              Expanded(
                child: Text(
                  strings.lessonCompletedTitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF302A40),
                  ),
                ),
              ),
              const SizedBox(width: 48), // Balance close button
            ],
          ),
        ),

        // Scrollable content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
            child: Column(
              children: [
                const SizedBox(height: 12),

                // Orange circular badge
                Container(
                  width: 168,
                  height: 168,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFE26331),
                      width: 7.5,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$memorizedCount / $totalWords',
                        style: const TextStyle(
                          fontSize: 27,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF2C2420),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        strings.memorized,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF75665F),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 22),

                // Congratulation headline
                Text(
                  strings.congratulations,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF2C2420),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  strings.lessonCompletedSubtitle(fullTitle),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14.5,
                    color: Color(0xFF6B5C55),
                    fontWeight: FontWeight.w600,
                  ),
                ),

                const SizedBox(height: 24),

                // Kết quả học tập Card
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFDF8),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEAD5B7)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        decoration: const BoxDecoration(
                          color: Color(0xFFF9EDE0),
                          borderRadius:
                              BorderRadius.vertical(top: Radius.circular(11)),
                        ),
                        child: Text(
                          strings.learningResults,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13.5,
                            color: Color(0xFF5A493F),
                          ),
                        ),
                      ),
                      _StatRow(
                        label: strings.learnedWords,
                        value: '$totalWords',
                      ),
                      _StatRow(
                        label: strings.rememberedCount,
                        value: '$memorizedCount',
                      ),
                      _StatRow(
                        label: strings.memoryRate,
                        value: '$accuracy%',
                      ),
                      _StatRow(
                        label: strings.studyTime,
                        value: strings.formatMinutes(elapsedMinutes),
                        isLast: true,
                      ),
                    ],
                  ),
                ),

                // Bài học tiếp theo Card (if next lesson exists)
                if (nextLesson != null && onNextLesson != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFDF8),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFEAD5B7)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 10),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF9EDE0),
                            borderRadius:
                                BorderRadius.vertical(top: Radius.circular(11)),
                          ),
                          child: Text(
                            strings.nextLesson,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13.5,
                              color: Color(0xFF5A493F),
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: onNextLesson,
                          borderRadius: const BorderRadius.vertical(
                              bottom: Radius.circular(11)),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 14),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${nextLessonIndex != null ? '${nextLessonIndex! + 1}. ' : ''}${nextLesson!.title}',
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF2C2420),
                                    ),
                                  ),
                                ),
                                const Icon(
                                  Icons.chevron_right_rounded,
                                  color: Color(0xFF9E8E84),
                                  size: 22,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 16),

                if (syncCopy.isNotEmpty)
                  Text(
                    syncCopy,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: syncState == _CompletionSyncState.error
                          ? const Color(0xFFA6412A)
                          : const Color(0xFF66715D),
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),

                if (syncState == _CompletionSyncState.error) ...[
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: onRetry,
                    child: Text(strings.retry),
                  ),
                ],

                const SizedBox(height: 16),

                // Button [Quay về lộ trình]
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: onReturn,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFE26331),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      strings.returnToTopics,
                      style: const TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({
    required this.label,
    required this.value,
    this.isLast = false,
  });

  final String label;
  final String value;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : const Border(
                bottom: BorderSide(color: Color(0xFFF2E6D6), width: 0.9),
              ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF554841),
              fontWeight: FontWeight.w600,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14.5,
              color: Color(0xFF2C2420),
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends ConsumerWidget {
  const _ErrorState({required this.onRetry});
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: 44, color: KitsuneColors.error),
          const SizedBox(height: 10),
          Text(strings.topicLoadError),
          TextButton(onPressed: onRetry, child: Text(strings.retry)),
        ],
      ),
    );
  }
}

enum _MobileGame { bubble, kana, memory, listening, shiritori }

class MobileGameHubPage extends ConsumerWidget {
  const MobileGameHubPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strings = ref.watch(stringsProvider);
    final games = [
      (
        _MobileGame.bubble,
        strings.gameBubbleTitle,
        strings.gameBubbleSubtitle,
        Icons.bubble_chart_rounded
      ),
      (
        _MobileGame.kana,
        strings.gameKanaTitle,
        strings.gameKanaSubtitle,
        Icons.gesture_rounded
      ),
      (
        _MobileGame.memory,
        strings.gameMemoryTitle,
        strings.gameMemorySubtitle,
        Icons.grid_view_rounded
      ),
      (
        _MobileGame.listening,
        strings.gameListeningTitle,
        strings.gameListeningSubtitle,
        Icons.headphones_rounded
      ),
      (
        _MobileGame.shiritori,
        strings.gameShiritoriTitle,
        strings.gameShiritoriSubtitle,
        Icons.hub_rounded
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFFBF7ED),
      appBar: AppBar(
        title: Text(strings.playgroundTitle),
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
      _shiritoriError = ref.read(stringsProvider).shiritoriInsufficientData;
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
    final strings = ref.read(stringsProvider);
    final input = _shiritoriController.text.trim();
    if (!_containsKanji(input)) {
      setState(() => _shiritoriError = strings.shiritoriMustContainKanji);
      return;
    }
    final used = _shiritoriHistory.map((turn) => turn.item.word).toSet();
    final matches =
        _items.where((item) => item.word == input && !used.contains(item.word));
    final match = matches.isEmpty ? null : matches.first;
    if (match == null) {
      setState(
          () => _shiritoriError = strings.shiritoriNotInDictOrUsed);
      return;
    }
    if (!_normalizeReading(match.pronunciation)
        .startsWith(_shiritoriRequired)) {
      setState(() =>
          _shiritoriError = strings.shiritoriMustStartWith(_shiritoriRequired));
      return;
    }
    setState(() {
      _shiritoriHistory.add((speaker: 'user', item: match));
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
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    return Scaffold(
      backgroundColor: const Color(0xFF272238),
      appBar: AppBar(
          backgroundColor: const Color(0xFF272238),
          foregroundColor: Colors.white,
          title: Text(widget.title),
          actions: [
            Center(
                child: Text('$_score ${strings.pointsUnit} · ${_seconds}s  ',
                    style: const TextStyle(fontWeight: FontWeight.w800)))
          ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _finished
              ? _result(strings)
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
                  child: _gameBody(strings)));
  }

  Widget _result(AppStrings strings) => Center(
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
                Text('$_correct ${strings.correctWord} · $_wrong ${strings.wrongWord}'),
                const SizedBox(height: 20),
                FilledButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(strings.chooseAnotherGame))
              ]))));

  Widget _gameBody(AppStrings strings) {
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
              child: Text(strings.clear)),
          const Spacer(),
          FilledButton(
              onPressed: () => _answer(_kana.join() == current.pronunciation),
              child: Text(strings.check))
        ])
      ]);
    }
    if (widget.type == _MobileGame.shiritori) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('しりとり',
              style: TextStyle(
                  color: Color(0xFFD85B3F), fontWeight: FontWeight.w900)),
          Text('${strings.startsWith} $_shiritoriRequired',
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
              final isUser = turn.speaker == 'user' || turn.speaker == 'Bạn';
              return Center(
                  child: Container(
                      width: 132,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: isUser
                              ? const Color(0xFFFFE8BE)
                              : const Color(0xFFE4F8F7),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: isUser
                                  ? const Color(0xFFF1A84B)
                                  : const Color(0xFF65BFC3))),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(isUser ? strings.you : 'Kitsune',
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
                _botThinking ? strings.kitsuneThinking : strings.secondsRemaining(_seconds),
            hintText: strings.shiritoriInputHint,
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
      Text(listening ? strings.listenAndPickMeaning : strings.findWordForMeaning,
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
