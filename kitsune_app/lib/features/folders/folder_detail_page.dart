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
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết thư mục')),
      body: KitsuneBackdrop(
        child: _isLoading
            ? const KitsuneLoadingFox(message: 'Đang tải thư mục...')
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
                children: [
                  KitsuneHeroCard(
                    title: '${_vocabs.length} thẻ trong bộ học này.',
                    subtitle:
                        'Xem nhanh toàn bộ từ đang nằm trong thư mục để dọn lại, ôn lại hoặc chuyển sang SRS.',
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
                          '${_vocabs.length}',
                          style: AppTheme.numeralStyle(
                            fontSize: 28,
                            color: KitsuneColors.secondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppTheme.space20),
                  if (_vocabs.isEmpty)
                    const KitsuneEmptyState(
                      icon: Icons.folder_open_rounded,
                      title: 'Thư mục này đang trống',
                      message:
                          'Thêm từ vựng từ màn hình tìm kiếm để bắt đầu biến thư mục này thành một bộ học thực sự.',
                    )
                  else
                    ..._vocabs.map((vocab) {
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
                                      style: Theme.of(context).textTheme.titleMedium,
                                    ),
                                    if (vocab.pronunciation != null) ...[
                                      const SizedBox(height: AppTheme.space4),
                                      Text(
                                        vocab.pronunciation!,
                                        style: Theme.of(context).textTheme.bodySmall,
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
              ),
      ),
    );
  }

  void _showDeleteConfirm(VocabularyDto vocab) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Xóa từ vựng'),
          content: Text('Xóa "${vocab.word}" khỏi thư mục này?'),
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
                _removeVocab(vocab.id);
              },
              child: const Text('Xóa'),
            ),
          ],
        );
      },
    );
  }
}
