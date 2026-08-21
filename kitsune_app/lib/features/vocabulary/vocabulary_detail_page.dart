import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/folder_provider.dart';
import 'package:kitsune_app/providers/providers.dart';
import 'package:kitsune_app/providers/vocabulary_provider.dart';


class VocabularyDetailPage extends ConsumerStatefulWidget {
  const VocabularyDetailPage({
    super.key,
    required this.vocabularyId,
  });

  final int vocabularyId;

  @override
  ConsumerState<VocabularyDetailPage> createState() => _VocabularyDetailPageState();
}

class _VocabularyDetailPageState extends ConsumerState<VocabularyDetailPage> {
  bool _isBookmarking = false;
  bool _isAddingToSrs = false;
  bool _isAddingToFolder = false;
  bool? _isBookmarked;
  bool? _isInSrs;
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
      final bookmarked = await api.getVocabularyBookmarkStatus(widget.vocabularyId);
      final inSrs = await api.getVocabularySrsStatus(widget.vocabularyId);
      if (mounted) {
        setState(() {
          _isBookmarked = bookmarked;
          _isInSrs = inSrs;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isBookmarked ??= false;
          _isInSrs ??= false;
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
      final bookmarked = await api.toggleVocabularyBookmark(widget.vocabularyId);
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

  Future<void> _addToSrs() async {
    if (_isAddingToSrs || (_isInSrs ?? false)) {
      return;
    }

    setState(() => _isAddingToSrs = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      await api.addVocabularyToSrs(widget.vocabularyId);
      if (mounted) {
        setState(() => _isInSrs = true);
      }
      _showMessage('Da them tu vung vao SRS.');
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _isAddingToSrs = false);
      }
    }
  }

  Future<void> _openFolderPicker(VocabularyDto vocab) async {
    if (_isAddingToFolder) {
      return;
    }

    final folders = await ref.read(foldersProvider.future);
    if (!mounted) {
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return _FolderPickerSheet(
          title: 'Them vao thu muc',
          subtitle: 'Chon mot thu muc de copy the nay vao lo trinh hoc rieng.',
          folders: folders,
          onCreateFolder: () => _showCreateFolderDialog(sheetContext),
          onSelectFolder: (folder) async {
            Navigator.pop(sheetContext);
            await _addVocabularyToFolder(folder.id, vocab);
          },
        );
      },
    );
  }

  Future<void> _showCreateFolderDialog(BuildContext sheetContext) async {
    final nameController = TextEditingController();
    final descController = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Tao thu muc moi'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Ten thu muc',
                  prefixIcon: Icon(Icons.folder_open_rounded),
                ),
              ),
              const SizedBox(height: AppTheme.space12),
              TextField(
                controller: descController,
                decoration: const InputDecoration(
                  labelText: 'Mo ta',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Huy'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(minimumSize: Size.zero),
              onPressed: () async {
                if (nameController.text.trim().isEmpty) {
                  return;
                }

                try {
                  final api = ref.read(kitsuneApiProvider);
                  await api.createFolder(
                    CreateFolderDto(
                      name: nameController.text.trim(),
                      description: descController.text.trim().isEmpty
                          ? null
                          : descController.text.trim(),
                    ),
                  );
                  ref.invalidate(foldersProvider);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                  if (sheetContext.mounted) {
                    Navigator.pop(sheetContext);
                  }
                  _showMessage('Da tao thu muc moi.');
                } catch (error) {
                  _showError(error);
                }
              },
              child: const Text('Tao'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _addVocabularyToFolder(int folderId, VocabularyDto vocab) async {
    setState(() => _isAddingToFolder = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      await api.addVocabularyDetailCopy(
        folderId,
        languageId: vocab.languageId,
        word: vocab.word,
        pronunciation: vocab.pronunciation,
        meaning: vocab.meaning,
        kanjiIds: vocab.kanjiComponents.map((component) => component.kanjiId).toList(),
      );
      ref.invalidate(foldersProvider);
      _showMessage('Da them vao thu muc.');
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) {
        setState(() => _isAddingToFolder = false);
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
      appBar: AppBar(title: const Text('Chi tiet tu vung')),
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
                    : 'Mo rong nho tu bang nghia, bo kanji va hanh dong hoc tiep theo.',
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
                      vocab.folderName.isEmpty ? 'Tu vung toan cuc' : vocab.folderName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.secondary,
                      ),
                    ),
                  ),
                  if (_isBookmarked != null)
                    KitsuneActionBadge(
                      icon: _isBookmarked! ? Icons.star_rounded : Icons.star_outline_rounded,
                      label: _isBookmarked! ? 'Da luu' : 'Chua luu',
                      color: KitsuneColors.stamp,
                      isActive: _isBookmarked!,
                    ),
                  if (_isInSrs != null)
                    KitsuneActionBadge(
                      icon: Icons.auto_awesome_motion_rounded,
                      label: _isInSrs! ? 'Dang trong SRS' : 'Chua vao SRS',
                      color: KitsuneColors.secondary,
                      isActive: _isInSrs!,
                    ),
                  InkWell(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    onTap: () => _speak(vocab.word),
                    child: KitsuneActionBadge(
                      icon: Icons.volume_up_rounded,
                      label: 'Phat am',
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
                      title: 'Nghia',
                      subtitle: 'Tap trung vao cach ban se nhan ra tu nay trong luc hoc.',
                      accent: KitsuneColors.secondary,
                    ),
                    const SizedBox(height: AppTheme.space12),
                    Text(
                      vocab.meaning,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            color: KitsuneColors.secondary,
                            height: 1.35,
                          ),
                    ),
                    if (vocab.pronunciation?.trim().isNotEmpty == true) ...[
                      const SizedBox(height: AppTheme.space12),
                      Text(
                        'Cach doc: ${vocab.pronunciation}',
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
                      title: 'Hanh dong nhanh',
                      subtitle: 'Luu lai, dua vao SRS, hoac copy sang thu muc dang hoc.',
                      accent: KitsuneColors.stamp,
                    ),
                    const SizedBox(height: AppTheme.space14),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _isAddingToSrs || (_isInSrs ?? false)
                                ? null
                                : _addToSrs,
                            icon: _isAddingToSrs
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: KitsuneLoadingFox(size: 28),
                                  )
                                : const Icon(Icons.auto_awesome_motion_rounded),
                            label: Text((_isInSrs ?? false) ? 'Da vao SRS' : 'Them vao SRS'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppTheme.space12),
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
                            label: Text((_isBookmarked ?? false) ? 'Bo luu' : 'Luu yeu thich'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _isAddingToFolder ? null : () => _openFolderPicker(vocab),
                            icon: _isAddingToFolder
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: KitsuneLoadingFox(size: 28),
                                  )
                                : const Icon(Icons.folder_copy_rounded),
                            label: const Text('Them vao thu muc'),
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
                        title: 'Thanh phan kanji',
                        subtitle: 'Doc tu nay nhu mot cong thuc de nho nhanh hon.',
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
                              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
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
                            .map((component) => '${component.character} (${component.amHanViet})')
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

class _FolderPickerSheet extends StatelessWidget {
  const _FolderPickerSheet({
    required this.title,
    required this.subtitle,
    required this.folders,
    required this.onSelectFolder,
    required this.onCreateFolder,
  });

  final String title;
  final String subtitle;
  final List<FolderDto> folders;
  final ValueChanged<FolderDto> onSelectFolder;
  final VoidCallback onCreateFolder;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          left: 12,
          right: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 12,
        ),
        child: KitsuneSurface(
          radius: AppTheme.radiusLg,
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: AppTheme.space8),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(height: 1.45),
              ),
              const SizedBox(height: AppTheme.space16),
              if (folders.isEmpty)
                const KitsuneEmptyState(
                  icon: Icons.folder_open_rounded,
                  title: 'Chua co thu muc nao',
                  message: 'Tao thu muc moi roi quay lai de them the nay vao lo trinh hoc.',
                )
              else
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: folders.length,
                    separatorBuilder: (_, index) => const SizedBox(height: 10),
                    itemBuilder: (_, index) {
                      final folder = folders[index];
                      return KitsuneSurface(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 14,
                        ),
                        onTap: () => onSelectFolder(folder),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: KitsuneColors.folderColors[
                                        index % KitsuneColors.folderColors.length]
                                    .withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(
                                Icons.folder_rounded,
                                color: KitsuneColors.folderColors[
                                    index % KitsuneColors.folderColors.length],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    folder.name,
                                    style: Theme.of(context).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: AppTheme.space4),
                                  Text(
                                    folder.description?.trim().isNotEmpty == true
                                        ? folder.description!
                                        : '${folder.vocabCount} muc hien co',
                                    style: Theme.of(context).textTheme.bodySmall,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: AppTheme.space16),
              OutlinedButton.icon(
                onPressed: onCreateFolder,
                icon: const Icon(Icons.create_new_folder_rounded),
                label: const Text('Tao thu muc moi'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
