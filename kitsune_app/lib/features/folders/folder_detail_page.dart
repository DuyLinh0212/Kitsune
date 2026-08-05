import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/providers.dart';

class FolderDetailPage extends ConsumerStatefulWidget {
  const FolderDetailPage({super.key, required this.folderId});

  final int folderId;

  @override
  ConsumerState<FolderDetailPage> createState() => _FolderDetailPageState();
}

class _FolderDetailPageState extends ConsumerState<FolderDetailPage> {
  List<VocabularyDto> _vocabs = [];
  bool _isLoading = true;

  List<VocabularyDto> get _vocabularyItems =>
      _vocabs.where((vocab) => !_isKanjiOnly(vocab)).toList();

  List<_FolderKanjiGroup> get _kanjiGroups {
    final groups = <int, _FolderKanjiGroup>{};
    for (final vocab in _vocabs) {
      for (final component in vocab.kanjiComponents) {
        final group = groups.putIfAbsent(
          component.kanjiId,
          () => _FolderKanjiGroup(
            kanjiId: component.kanjiId,
            character: component.character,
            amHanViet: component.amHanViet,
          ),
        );
        group.usageCount += 1;
        if (!group.examples.contains(vocab.word) && group.examples.length < 3) {
          group.examples.add(vocab.word);
        }
        if (_isKanjiOnly(vocab)) {
          group.standaloneVocabularyId ??= vocab.id;
        }
      }
    }
    return groups.values.toList();
  }

  @override
  void initState() {
    super.initState();
    _loadVocabs();
  }

  Future<void> _loadVocabs() async {
    try {
      final api = ref.read(kitsuneApiProvider);
      final vocabs = await api.getVocabulariesByFolder(widget.folderId);
      if (mounted) {
        setState(() => _vocabs = vocabs);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _removeVocab(int vocabId) async {
    try {
      final api = ref.read(kitsuneApiProvider);
      await api.removeVocabulary(vocabId);
      if (mounted) {
        setState(() => _vocabs.removeWhere((vocab) => vocab.id == vocabId));
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã xóa từ vựng khỏi thư mục')),
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: $error'),
            backgroundColor: KitsuneColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final vocabularyItems = _vocabularyItems;
    final kanjiGroups = _kanjiGroups;

    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết thư mục')),
      body: KitsuneBackdrop(
        child: _isLoading
            ? const KitsuneLoadingFox(message: 'Đang tải thư mục...')
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                children: [
                  KitsuneHeroCard(
                    title:
                        '${vocabularyItems.length} từ · ${kanjiGroups.length} kanji trong bộ học này.',
                    subtitle:
                        'Kanji độc lập chỉ xuất hiện ở khu vực Kanji, không bị lặp trong danh sách từ vựng.',
                    accent: KitsuneColors.secondary,
                    trailing: Container(
                      width: 86,
                      height: 86,
                      decoration: BoxDecoration(
                        color: KitsuneColors.secondarySurface,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: Center(
                        child: Text(
                          '${vocabularyItems.length + kanjiGroups.length}',
                          style: AppTheme.numeralStyle(
                            fontSize: 28,
                            color: KitsuneColors.secondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.space20),
                  if (vocabularyItems.isEmpty && kanjiGroups.isEmpty)
                    const KitsuneEmptyState(
                      icon: Icons.folder_open_rounded,
                      title: 'Thư mục này đang trống',
                      message:
                          'Thêm từ vựng từ màn hình tìm kiếm để bắt đầu biến thư mục này thành một bộ học thực sự.',
                    ),
                  if (vocabularyItems.isNotEmpty) ...[
                    KitsuneSectionHeader(
                      title: 'Từ vựng',
                      subtitle: '${vocabularyItems.length} mục đang học',
                      accent: KitsuneColors.secondary,
                    ),
                    const SizedBox(height: AppTheme.space12),
                    ...vocabularyItems.map((vocab) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: KitsuneSurface(
                          child: Row(
                            children: [
                              Container(
                                width: 54,
                                height: 54,
                                decoration: BoxDecoration(
                                  color: KitsuneColors.primarySurface,
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: Center(
                                  child: Text(
                                    vocab.word,
                                    style: AppTheme.japaneseStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w800,
                                      color: KitsuneColors.primary,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppTheme.space12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      vocab.meaning,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium,
                                    ),
                                    if (vocab.pronunciation != null) ...[
                                      const SizedBox(height: AppTheme.space4),
                                      Text(
                                        vocab.pronunciation!,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: () => _showDeleteConfirm(vocab),
                                icon: const Icon(
                                  Icons.delete_outline_rounded,
                                  color: KitsuneColors.error,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                  if (kanjiGroups.isNotEmpty) ...[
                    const SizedBox(height: AppTheme.space12),
                    KitsuneSectionHeader(
                      title: 'Kanji trong thư mục',
                      subtitle:
                          '${kanjiGroups.length} chữ · không lặp vào bảng từ vựng',
                      accent: KitsuneColors.primary,
                    ),
                    const SizedBox(height: AppTheme.space12),
                    ...kanjiGroups.map((group) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: KitsuneSurface(
                          child: Row(
                            children: [
                              Container(
                                width: 58,
                                height: 58,
                                decoration: BoxDecoration(
                                  color: KitsuneColors.primarySurface,
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: Center(
                                  child: Text(
                                    group.character,
                                    style: AppTheme.japaneseStyle(
                                      fontSize: 25,
                                      fontWeight: FontWeight.w900,
                                      color: KitsuneColors.primary,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppTheme.space12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      group.amHanViet,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            color: KitsuneColors.primary,
                                            fontWeight: FontWeight.w800,
                                          ),
                                    ),
                                    const SizedBox(height: AppTheme.space4),
                                    Text(
                                      '${group.usageCount} từ liên quan${group.examples.isEmpty ? '' : ' · ${group.examples.join(', ')}'}',
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style:
                                          Theme.of(context).textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              if (group.standaloneVocabularyId != null)
                                IconButton(
                                  tooltip: 'Xóa Kanji khỏi thư mục',
                                  onPressed: () => _showDeleteConfirmById(
                                    group.standaloneVocabularyId!,
                                    group.character,
                                    isKanji: true,
                                  ),
                                  icon: const Icon(
                                    Icons.delete_outline_rounded,
                                    color: KitsuneColors.error,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ],
              ),
      ),
    );
  }

  void _showDeleteConfirm(VocabularyDto vocab) {
    _showDeleteConfirmById(vocab.id, vocab.word);
  }

  void _showDeleteConfirmById(
    int vocabularyId,
    String label, {
    bool isKanji = false,
  }) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(isKanji ? 'Xóa Kanji' : 'Xóa từ vựng'),
          content: Text('Xóa "$label" khỏi thư mục này?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: Size.zero,
                backgroundColor: KitsuneColors.error,
              ),
              onPressed: () {
                Navigator.pop(dialogContext);
                _removeVocab(vocabularyId);
              },
              child: const Text('Xóa'),
            ),
          ],
        );
      },
    );
  }

  bool _isKanjiOnly(VocabularyDto vocab) {
    final itemType = vocab.specificData?['_kitsuneItemType'];
    if (itemType == 'kanji') return true;
    if (itemType == 'vocabulary' || vocab.specificData != null) return false;

    // Legacy Kanji copies were created before `_kitsuneItemType` existed.
    return vocab.word.trim().runes.length == 1 &&
        vocab.kanjiComponents.length == 1 &&
        vocab.kanjiComponents.first.character == vocab.word.trim();
  }
}

class _FolderKanjiGroup {
  _FolderKanjiGroup({
    required this.kanjiId,
    required this.character,
    required this.amHanViet,
  });

  final int kanjiId;
  final String character;
  final String amHanViet;
  int usageCount = 0;
  final List<String> examples = [];
  int? standaloneVocabularyId;
}
