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
  int _selectedTopic = 0;

  @override
  void initState() {
    super.initState();
    _future = ref.read(kitsuneApiProvider).getTopicsWithLessons();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF7ED),
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
            final topic = topics[_selectedTopic.clamp(0, topics.length - 1)];
            return RefreshIndicator(
              onRefresh: () async => setState(() => _future =
                  ref.read(kitsuneApiProvider).getTopicsWithLessons()),
              child: CustomScrollView(slivers: [
                SliverToBoxAdapter(
                    child: _Hero(
                        onGames: () => Navigator.of(context).push(
                            MaterialPageRoute(
                                builder: (_) => const MobileGameHubPage())))),
                SliverToBoxAdapter(
                    child: SizedBox(
                        height: 74,
                        child: ListView.separated(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 10),
                          scrollDirection: Axis.horizontal,
                          itemCount: topics.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (_, index) => ChoiceChip(
                            selected: index == _selectedTopic,
                            label: Text(topics[index].title),
                            onSelected: (_) =>
                                setState(() => _selectedTopic = index),
                            selectedColor: const Color(0xFF3D3565),
                            labelStyle: TextStyle(
                                color: index == _selectedTopic
                                    ? Colors.white
                                    : const Color(0xFF3D3565),
                                fontWeight: FontWeight.w700),
                          ),
                        ))),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(18, 10, 18, 100),
                  sliver: SliverList.builder(
                    itemCount: topic.lessons.length,
                    itemBuilder: (_, index) => _LessonTile(
                      lesson: topic.lessons[index],
                      index: index,
                      onTap: () async {
                        await Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => LessonStudyPage(
                                lessonId: topic.lessons[index].id)));
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

class _Hero extends StatelessWidget {
  const _Hero({required this.onGames});
  final VoidCallback onGames;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(18),
      height: 225,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
          borderRadius: const BorderRadius.only(
              topRight: Radius.circular(34),
              bottomLeft: Radius.circular(4),
              bottomRight: Radius.circular(4),
              topLeft: Radius.circular(4)),
          border: Border.all(color: const Color(0xFFD8CBB8))),
      child: Stack(fit: StackFit.expand, children: [
        Image.asset('assets/images/minigame-hub-v3.png', fit: BoxFit.cover),
        Container(
            decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [
          Color(0xF2FBF7ED),
          Color(0x99FBF7ED),
          Color(0x00FBF7ED)
        ]))),
        Padding(
            padding: const EdgeInsets.all(22),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('LỘ TRÌNH V3.0',
                  style: TextStyle(
                      color: Color(0xFFD85B3F),
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.6)),
              const SizedBox(height: 8),
              Text('Học theo\nchủ đề.',
                  style: TextStyle(
                      color: Color(0xFF272238),
                      fontFamily: AppTheme.displayFontFamily,
                      fontSize: 37,
                      height: .95,
                      fontWeight: FontWeight.w700)),
              const Spacer(),
              FilledButton.icon(
                  onPressed: onGames,
                  style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3D3565)),
                  icon: const Icon(Icons.sports_esports_rounded, size: 18),
                  label: const Text('4 minigame')),
            ])),
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
    return IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      SizedBox(
          width: 46,
          child: Column(children: [
            Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: lesson.progress >= 1
                        ? const Color(0xFF5E7B63)
                        : const Color(0xFF3D3565),
                    shape: BoxShape.circle,
                    border:
                        Border.all(color: const Color(0xFFFBF7ED), width: 4)),
                child: Text('${index + 1}',
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w800))),
            Expanded(
                child: Container(width: 2, color: const Color(0xFFD8CBB8))),
          ])),
      Expanded(
          child: Card(
        margin: const EdgeInsets.only(left: 8, bottom: 14),
        elevation: 0,
        color: const Color(0xFFFFFDF7),
        shape: RoundedRectangleBorder(
            side: const BorderSide(color: Color(0xFFD8CBB8)),
            borderRadius: const BorderRadius.only(
                topRight: Radius.circular(22),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(4),
                topLeft: Radius.circular(4))),
        child: InkWell(
            onTap: onTap,
            child: Padding(
                padding: const EdgeInsets.all(17),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          '${lesson.estimatedMinutes} PHÚT · ${lesson.itemCount} MỤC',
                          style: const TextStyle(
                              color: Color(0xFFD85B3F),
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1)),
                      const SizedBox(height: 7),
                      Text(lesson.title,
                          style: const TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF272238))),
                      if (lesson.description.isNotEmpty)
                        Padding(
                            padding: const EdgeInsets.only(top: 5),
                            child: Text(lesson.description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style:
                                    const TextStyle(color: Color(0xFF756B78)))),
                      const SizedBox(height: 13),
                      LinearProgressIndicator(
                          value: lesson.progress,
                          minHeight: 4,
                          color: const Color(0xFFD85B3F),
                          backgroundColor: const Color(0xFFE8DDCB),
                          borderRadius: BorderRadius.circular(3)),
                    ]))),
      )),
    ]));
  }
}

class LessonStudyPage extends ConsumerStatefulWidget {
  const LessonStudyPage({super.key, required this.lessonId});
  final int lessonId;
  @override
  ConsumerState<LessonStudyPage> createState() => _LessonStudyPageState();
}

class _LessonStudyPageState extends ConsumerState<LessonStudyPage> {
  late Future<LessonDto> _future;
  int _index = 0;
  final TtsService _tts = TtsService();
  @override
  void initState() {
    super.initState();
    _future = ref.read(kitsuneApiProvider).getLessonDetail(widget.lessonId);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFFBF7ED),
        appBar: AppBar(
            backgroundColor: const Color(0xFFFBF7ED),
            title: const Text('Bài học'),
            elevation: 0),
        body: FutureBuilder<LessonDto>(
            future: _future,
            builder: (_, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final lesson = snapshot.data!;
              if (lesson.items.isEmpty) {
                return const Center(child: Text('Bài học chưa có nội dung.'));
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
                        color: const Color(0xFFD85B3F),
                        backgroundColor: const Color(0xFFE8DDCB)),
                    const SizedBox(height: 24),
                    Expanded(
                        child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(26),
                            decoration: BoxDecoration(
                                color: const Color(0xFFFFFDF7),
                                border:
                                    Border.all(color: const Color(0xFFD8CBB8)),
                                borderRadius: const BorderRadius.only(
                                    topRight: Radius.circular(34),
                                    bottomLeft: Radius.circular(4),
                                    bottomRight: Radius.circular(4),
                                    topLeft: Radius.circular(4))),
                            child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                      item.kanjiId != null
                                          ? '漢字 · KANJI'
                                          : '語彙 · TỪ VỰNG',
                                      style: const TextStyle(
                                          color: Color(0xFFD85B3F),
                                          letterSpacing: 1.2,
                                          fontWeight: FontWeight.w800)),
                                  const SizedBox(height: 22),
                                  Text(item.word,
                                      style: const TextStyle(
                                          fontSize: 68,
                                          color: Color(0xFF272238))),
                                  if (item.pronunciation.isNotEmpty)
                                    Text(item.pronunciation,
                                        style: const TextStyle(
                                            fontSize: 20,
                                            color: Color(0xFFD85B3F))),
                                  if (item.kanjiId != null &&
                                      (item.amHanViet ?? '').isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                        'Âm Hán Việt: ${item.amHanViet}',
                                        style: const TextStyle(
                                          color: Color(0xFF3D3565),
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
                                      onPressed: () => _tts.speak(item.word),
                                      icon:
                                          const Icon(Icons.volume_up_rounded)),
                                  if (item.exampleSentence != null)
                                    Container(
                                        margin: const EdgeInsets.only(top: 18),
                                        padding: const EdgeInsets.all(14),
                                        color: const Color(0xFFF1E9DC),
                                        child: Column(children: [
                                          Text(item.exampleSentence!,
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.w700)),
                                          if (item.exampleTranslation != null)
                                            Text(item.exampleTranslation!,
                                                style: const TextStyle(
                                                    color: Color(0xFF756B78)))
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
                          onPressed: () async {
                            await ref
                                .read(kitsuneApiProvider)
                                .saveLessonProgress(
                                    lesson.id, _index + 1, lesson.items.length,
                                    lastItemId: item.id);
                            if (!context.mounted) return;
                            if (_index < lesson.items.length - 1) {
                              setState(() => _index++);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text('Đã hoàn thành bài học!')));
                            }
                          },
                          style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFFD85B3F)),
                          child: Text(_index == lesson.items.length - 1
                              ? 'Hoàn thành'
                              : 'Đã nhớ · Tiếp')),
                    ]),
                  ]));
            }),
      );
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

enum _MobileGame { bubble, kana, memory, listening }

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
  ];
  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: const Color(0xFFFBF7ED),
      appBar: AppBar(
          title: const Text('Kitsune Playground'),
          backgroundColor: const Color(0xFFFBF7ED)),
      body: ListView(padding: const EdgeInsets.all(18), children: [
        ClipRRect(
            borderRadius: const BorderRadius.only(
                topRight: Radius.circular(32),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(4),
                topLeft: Radius.circular(4)),
            child: Image.asset('assets/images/minigame-hub-v3.png',
                height: 190, fit: BoxFit.cover)),
        const SizedBox(height: 18),
        ...games.map((game) => Card(
            elevation: 0,
            color: const Color(0xFFFFFDF7),
            shape: RoundedRectangleBorder(
                side: const BorderSide(color: Color(0xFFD8CBB8)),
                borderRadius: BorderRadius.circular(14)),
            child: ListTile(
                leading: CircleAvatar(
                    backgroundColor: const Color(0xFF3D3565),
                    child: Icon(game.$4, color: Colors.white)),
                title: Text(game.$2,
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                subtitle: Text(game.$3),
                trailing: const Icon(Icons.arrow_forward_rounded),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                    builder: (_) =>
                        _MobileGamePage(type: game.$1, title: game.$2))))))
      ]));
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

class _MobileGamePageState extends ConsumerState<_MobileGamePage> {
  final _tts = TtsService();
  Timer? _timer;
  List<GameVocabularyDto> _items = [];
  List<_MemoryTile> _memory = [];
  final List<String> _memoryOpen = [];
  final List<String> _kana = [];
  int _index = 0, _score = 0, _correct = 0, _wrong = 0, _seconds = 60;
  bool _loading = true, _finished = false;
  GameVocabularyDto get current => _items[_index % _items.length];
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final items = await ref
        .read(kitsuneApiProvider)
        .getGameVocabulary(limit: widget.type == _MobileGame.memory ? 10 : 30);
    if (!mounted) return;
    _items = items;
    _seconds = widget.type == _MobileGame.memory ? 90 : 60;
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
    setState(() => _loading = false);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _seconds--);
      if (_seconds <= 0) _finish();
    });
    if (widget.type == _MobileGame.listening) _tts.speak(current.word);
  }

  List<GameVocabularyDto> _options(int count) {
    final others = _items.where((item) => item.id != current.id).toList()
      ..shuffle();
    return [current, ...others.take(count - 1)]..shuffle();
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
    });
    if (widget.type == _MobileGame.listening) _tts.speak(current.word);
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
          'LISTENING'
        ][widget.type.index],
        _score,
        _correct,
        _wrong,
        (widget.type == _MobileGame.memory ? 90 : 60) - _seconds);
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
      final chars = [
        ...current.pronunciation.characters,
        ...'あいうえおかきくけこ'.characters.take(5)
      ].toList()
        ..shuffle();
      return Column(children: [
        Text(current.word,
            style: const TextStyle(fontSize: 56, fontWeight: FontWeight.w700)),
        Text(current.meaning),
        const SizedBox(height: 18),
        Text(_kana.join().isEmpty ? '＿ ＿ ＿' : _kana.join(),
            style: const TextStyle(fontSize: 34, color: Color(0xFFD85B3F))),
        const SizedBox(height: 16),
        Wrap(
            spacing: 8,
            runSpacing: 8,
            children: chars
                .map((char) => OutlinedButton(
                    onPressed: () => setState(() => _kana.add(char)),
                    child: Text(char, style: const TextStyle(fontSize: 20))))
                .toList()),
        const Spacer(),
        Row(children: [
          OutlinedButton(
              onPressed: _kana.isEmpty
                  ? null
                  : () => setState(() => _kana.removeLast()),
              child: const Text('Xóa')),
          const Spacer(),
          FilledButton(
              onPressed: () => _answer(_kana.join() == current.pronunciation),
              child: const Text('Kiểm tra'))
        ])
      ]);
    }
    final listening = widget.type == _MobileGame.listening;
    final options = _options(listening ? 4 : 8);
    return Column(children: [
      Text(listening ? 'Nghe và chọn nghĩa đúng' : 'Tìm từ có nghĩa',
          style: const TextStyle(
              color: Color(0xFFD85B3F), fontWeight: FontWeight.w800)),
      const SizedBox(height: 14),
      listening
          ? IconButton.filled(
              onPressed: () => _tts.speak(current.word),
              iconSize: 52,
              icon: const Icon(Icons.volume_up_rounded))
          : Text(current.meaning,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
              textAlign: TextAlign.center),
      const SizedBox(height: 22),
      Expanded(
          child: GridView.count(
              crossAxisCount: listening ? 1 : 2,
              childAspectRatio: listening ? 4 : 1.6,
              mainAxisSpacing: 9,
              crossAxisSpacing: 9,
              children: options
                  .map((item) => OutlinedButton(
                      onPressed: () => _answer(item.id == current.id,
                          timePenalty: !listening),
                      child: Text(listening ? item.meaning : item.word,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700),
                          textAlign: TextAlign.center)))
                  .toList()))
    ]);
  }
}
