import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';

class VocabularySearchPage extends ConsumerStatefulWidget {
  const VocabularySearchPage({super.key});

  @override
  ConsumerState<VocabularySearchPage> createState() =>
      _VocabularySearchPageState();
}

class _VocabularySearchPageState extends ConsumerState<VocabularySearchPage> {
  final _searchController = TextEditingController();
  List<VocabularyDto> _results = [];
  List<VocabularyDto> _randomItems = [];
  bool _isSearching = false;
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
    _loadRandom();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRandom() async {
    final items =
        await ref.read(kitsuneApiProvider).getRandomVocabulary(limit: 20);
    if (mounted) {
      setState(() => _randomItems = items);
    }
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _isSearching = false;
      });
      return;
    }

    setState(() => _isSearching = true);
    try {
      final items = await ref
          .read(kitsuneApiProvider)
          .searchVocabulary(query.trim(), limit: 30);
      if (mounted) {
        setState(() => _results = items);
      }
    } finally {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  Future<void> _openKanjiPreview(int kanjiId) async {
    try {
      final kanji = await ref.read(kitsuneApiProvider).getKanjiById(kanjiId);
      if (!mounted) return;

      await showDialog<void>(
        context: context,
        builder: (_) => _KanjiQuickDialog(kanji: kanji),
      );
    } catch (_) {
      _showMessage('Không thể tải thông tin Kanji.');
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final displayItems = _results.isNotEmpty ? _results : _randomItems;
    final isShowingRandom = _results.isEmpty;

    return Scaffold(
      appBar: AppBar(title: const Text('Từ vựng')),
      body: KitsuneBackdrop(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Column(
                children: [
                  const KitsuneHeroCard(
                    title: 'Tra nhanh, lưu đúng và quay lại ôn sau.',
                    subtitle:
                        'Tìm theo chữ Nhật, romaji hoặc nghĩa tiếng Việt rồi tiếp tục học ngay trong cùng một nhịp.',
                    accent: KitsuneColors.primary,
                  ),
                  const SizedBox(height: AppTheme.space16),
                  KitsuneSearchField(
                    controller: _searchController,
                    hintText: 'Tìm từ vựng...',
                    onChanged: (value) {
                      Future.delayed(const Duration(milliseconds: 320), () {
                        if (value == _searchController.text) {
                          _search(value);
                        }
                      });
                      setState(() {});
                    },
                    onClear: () {
                      _searchController.clear();
                      _search('');
                      setState(() {});
                    },
                  ),
                ],
              ),
            ),
            Expanded(
              child: _isSearching
                  ? const KitsuneLoadingFox(size: 90)
                  : displayItems.isEmpty
                      ? SingleChildScrollView(
                          padding: const EdgeInsets.all(16),
                          child: KitsuneEmptyState(
                            icon: Icons.menu_book_rounded,
                            title: _searchController.text.trim().isEmpty
                                ? 'Bắt đầu bằng một từ khóa'
                                : 'Không tìm thấy từ vựng',
                            message: _searchController.text.trim().isEmpty
                                ? 'Bạn có thể tìm theo tiếng Nhật, cách đọc hoặc nghĩa tiếng Việt.'
                                : 'Thử đổi cách viết, romaji hoặc nghĩa để mở rộng kết quả.',
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                          itemCount: displayItems.length + 1,
                          itemBuilder: (_, index) {
                            if (index == 0) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: KitsuneSectionHeader(
                                  title: isShowingRandom
                                      ? 'Khám phá ngẫu nhiên'
                                      : 'Kết quả phù hợp',
                                  subtitle: isShowingRandom
                                      ? 'Một vài thẻ để bạn mở rộng vốn từ khi chưa nhập từ khóa.'
                                      : '${displayItems.length} mục khớp với truy vấn hiện tại.',
                                  accent: isShowingRandom
                                      ? KitsuneColors.stamp
                                      : KitsuneColors.secondary,
                                ),
                              );
                            }

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _buildVocabCard(displayItems[index - 1]),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVocabCard(VocabularyDto vocab) {
    return KitsuneSurface(
      onTap: () => Navigator.pushNamed(context, '/vocabulary/${vocab.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          vocab.word,
                          style: AppTheme.japaneseStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: KitsuneColors.onSurface,
                          ),
                        ),
                        const SizedBox(width: AppTheme.space8),
                        InkWell(
                          borderRadius: BorderRadius.circular(20),
                          onTap: () => _speak(vocab.word),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(
                              Icons.volume_up_rounded,
                              size: 20,
                              color: _speakingWord == vocab.word
                                  ? KitsuneColors.primary
                                  : KitsuneColors.onSurfaceVariant,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (vocab.pronunciation != null) ...[
                      const SizedBox(height: AppTheme.space4),
                      Text(
                        vocab.pronunciation!,
                        style: const TextStyle(
                          fontSize: 14,
                          color: KitsuneColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppTheme.space16),
              Container(
                constraints: const BoxConstraints(maxWidth: 160),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: KitsuneColors.secondarySurface,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  vocab.meaning,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: KitsuneColors.secondary,
                  ),
                  textAlign: TextAlign.right,
                ),
              ),
            ],
          ),
          if (vocab.kanjiComponents.isNotEmpty) ...[
            const SizedBox(height: AppTheme.space14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: vocab.kanjiComponents.map((component) {
                return InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => _openKanjiPreview(component.kanjiId),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: KitsuneColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: KitsuneColors.secondary.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(
                      '${component.character} • ${component.amHanViet}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: KitsuneColors.onSurface,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
          const SizedBox(height: AppTheme.space14),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Mở chi tiết',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: KitsuneColors.primary,
                      ),
                ),
              ),
              const Icon(
                Icons.arrow_forward_rounded,
                size: 16,
                color: KitsuneColors.primary,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _KanjiQuickDialog extends StatelessWidget {
  const _KanjiQuickDialog({required this.kanji});

  final KanjiDetailDto kanji;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Dialog(
      insetPadding: const EdgeInsets.all(20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 680),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  tooltip: 'Đóng',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
              Center(
                child: Column(
                  children: [
                    Text(
                      kanji.character,
                      style: AppTheme.japaneseStyle(
                        fontSize: 82,
                        fontWeight: FontWeight.w900,
                        color: KitsuneColors.primary,
                      ),
                    ),
                    const SizedBox(height: AppTheme.space4),
                    Text(
                      kanji.amHanViet,
                      style: textTheme.titleLarge?.copyWith(
                        color: KitsuneColors.secondary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (kanji.jlptLevel != null) ...[
                      const SizedBox(height: AppTheme.space8),
                      Chip(label: Text('N${kanji.jlptLevel}')),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppTheme.space20),
              _KanjiInfoGrid(kanji: kanji),
              if (kanji.mnemonic?.trim().isNotEmpty == true) ...[
                const SizedBox(height: AppTheme.space16),
                Text('Cách ghi nhớ', style: textTheme.titleSmall),
                const SizedBox(height: AppTheme.space6),
                Text(kanji.mnemonic!, style: textTheme.bodyMedium),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _KanjiInfoGrid extends StatelessWidget {
  const _KanjiInfoGrid({required this.kanji});

  final KanjiDetailDto kanji;

  @override
  Widget build(BuildContext context) {
    final entries = <({String label, String value, bool japanese})>[
      (
        label: 'Âm On',
        value: kanji.onyomi?.trim().isNotEmpty == true ? kanji.onyomi! : '—',
        japanese: true
      ),
      (
        label: 'Âm Kun',
        value: kanji.kunyomi?.trim().isNotEmpty == true ? kanji.kunyomi! : '—',
        japanese: true
      ),
      (label: 'Nghĩa', value: kanji.meaning, japanese: false),
      (label: 'Số nét', value: '${kanji.strokeCount} nét', japanese: false),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.55,
      ),
      itemCount: entries.length,
      itemBuilder: (_, index) {
        final entry = entries[index];
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: KitsuneColors.surfaceVariant,
            border: Border.all(color: KitsuneColors.surfaceBorder),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entry.label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: KitsuneColors.onSurfaceMuted,
                ),
              ),
              const SizedBox(height: 6),
              Expanded(
                child: Text(
                  entry.value,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: entry.japanese
                      ? AppTheme.japaneseStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: KitsuneColors.secondary,
                        )
                      : const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: KitsuneColors.onSurface,
                        ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
