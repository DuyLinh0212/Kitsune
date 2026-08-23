import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';
import 'package:kitsune_app/providers/vocabulary_provider.dart';

class VocabularyDetailPage extends ConsumerStatefulWidget {
  const VocabularyDetailPage({
    super.key,
    required this.vocabularyId,
  });

  final int vocabularyId;

  @override
  ConsumerState<VocabularyDetailPage> createState() =>
      _VocabularyDetailPageState();
}

class _VocabularyDetailPageState extends ConsumerState<VocabularyDetailPage> {
  bool _isBookmarking = false;
  bool? _isBookmarked;
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
      _loadActionState();
    });
  }

  Future<void> _loadActionState() async {
    final api = ref.read(kitsuneApiProvider);
    try {
      final bookmarked =
          await api.getVocabularyBookmarkStatus(widget.vocabularyId);
      if (mounted) {
        setState(() {
          _isBookmarked = bookmarked;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isBookmarked ??= false;
        });
      }
    }
  }

  Future<void> _toggleBookmark() async {
    if (_isBookmarking) {
      return;
    }

    setState(() => _isBookmarking = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      final bookmarked =
          await api.toggleVocabularyBookmark(widget.vocabularyId);
      if (mounted) {
        setState(() => _isBookmarked = bookmarked);
      }
      _showMessage(
        bookmarked ? 'Da luu vao yeu thich.' : 'Da bo luu khoi yeu thich.',
      );
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _isBookmarking = false);
      }
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
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
    final vocabAsync = ref.watch(vocabularyDetailProvider(widget.vocabularyId));

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết từ vựng')),
      body: KitsuneBackdrop(
        child: vocabAsync.when(
          data: (vocab) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
            children: [
              KitsuneHeroCard(
                title: vocab.word,
                titleStyle: AppTheme.japaneseStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: KitsuneColors.onSurface,
                ),
                subtitle: vocab.pronunciation?.trim().isNotEmpty == true
                    ? vocab.pronunciation!
                    : 'Đọc, nghe và kết nối các thành phần Kanji của từ.',
                accent: KitsuneColors.primary,
                trailing: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    color: KitsuneColors.primarySurface,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    vocab.word,
                    style: AppTheme.japaneseStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      color: KitsuneColors.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(height: AppTheme.space16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: KitsuneColors.secondarySurface,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    child: Text(
                      '語彙 · TỪ VỰNG',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.secondary,
                      ),
                    ),
                  ),
                  if (_isBookmarked != null)
                    KitsuneActionBadge(
                      icon: _isBookmarked!
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      label: _isBookmarked! ? 'Đã lưu' : 'Chưa lưu',
                      color: KitsuneColors.stamp,
                      isActive: _isBookmarked!,
                    ),
                  InkWell(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    onTap: () => _speak(vocab.word),
                    child: KitsuneActionBadge(
                      icon: Icons.volume_up_rounded,
                      label: 'Phát âm',
                      color: KitsuneColors.primary,
                      isActive: _speakingWord == vocab.word,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppTheme.space16),
              KitsuneSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const KitsuneSectionHeader(
                      title: 'Nghĩa',
                      subtitle: 'Ý nghĩa cốt lõi để nhận ra từ trong ngữ cảnh.',
                      accent: KitsuneColors.secondary,
                    ),
                    const SizedBox(height: AppTheme.space12),
                    Text(
                      vocab.meaning,
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: KitsuneColors.secondary,
                                height: 1.35,
                              ),
                    ),
                    if (vocab.pronunciation?.trim().isNotEmpty == true) ...[
                      const SizedBox(height: AppTheme.space12),
                      Text(
                        'Cách đọc: ${vocab.pronunciation}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppTheme.space16),
              KitsuneSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const KitsuneSectionHeader(
                      title: 'Ghi nhớ từ này',
                      subtitle: 'Nghe lại phát âm hoặc lưu vào mục yêu thích.',
                      accent: KitsuneColors.stamp,
                    ),
                    const SizedBox(height: AppTheme.space14),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isBookmarking ? null : _toggleBookmark,
                            icon: _isBookmarking
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: KitsuneLoadingFox(size: 28),
                                  )
                                : Icon(
                                    (_isBookmarked ?? false)
                                        ? Icons.star_rounded
                                        : Icons.star_outline_rounded,
                                  ),
                            label: Text((_isBookmarked ?? false)
                                ? 'Bỏ lưu'
                                : 'Lưu yêu thích'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _speak(vocab.word),
                            icon: const Icon(Icons.volume_up_rounded),
                            label: const Text('Nghe lại'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (vocab.kanjiComponents.isNotEmpty) ...[
                const SizedBox(height: AppTheme.space16),
                KitsuneSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const KitsuneSectionHeader(
                        title: 'Thành phần Kanji',
                        subtitle:
                            'Tách cấu tạo để ghi nhớ từ như một công thức.',
                        accent: KitsuneColors.primary,
                      ),
                      const SizedBox(height: AppTheme.space12),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: vocab.kanjiComponents.map((component) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: KitsuneColors.surfaceVariant,
                              borderRadius:
                                  BorderRadius.circular(AppTheme.radiusMd),
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  component.character,
                                  style: AppTheme.japaneseStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    color: KitsuneColors.onSurface,
                                  ),
                                ),
                                const SizedBox(height: AppTheme.space4),
                                Text(
                                  component.amHanViet,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: KitsuneColors.onSurfaceVariant,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: AppTheme.space14),
                      Text(
                        vocab.kanjiComponents
                            .map((component) =>
                                '${component.character} (${component.amHanViet})')
                            .join(' + '),
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: KitsuneColors.onSurfaceVariant,
                              height: 1.5,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          loading: () => const KitsuneLoadingFox(message: 'Đang tải...'),
          error: (error, _) => Center(child: Text('Loi: $error')),
        ),
      ),
    );
  }
}
