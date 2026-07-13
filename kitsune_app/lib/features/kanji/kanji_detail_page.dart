import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/features/kanji/widgets/kanji_stroke_writer.dart';
import 'package:kitsune_app/providers/folder_provider.dart';
import 'package:kitsune_app/providers/kanji_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class KanjiDetailPage extends ConsumerStatefulWidget {
  const KanjiDetailPage({
    super.key,
    required this.kanjiId,
  });

  final int kanjiId;

  @override
  ConsumerState<KanjiDetailPage> createState() => _KanjiDetailPageState();
}

class _KanjiDetailPageState extends ConsumerState<KanjiDetailPage> {
  bool _isAddingToFolder = false;
  Future<List<VocabularyDto>>? _exampleFuture;
  int? _exampleKanjiId;

  @override
  void didUpdateWidget(covariant KanjiDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.kanjiId != widget.kanjiId) {
      _exampleFuture = null;
      _exampleKanjiId = null;
    }
  }

  Future<List<VocabularyDto>> _loadExamples(KanjiDetailDto kanji) async {
    final api = ref.read(kitsuneApiProvider);
    final items = await api.searchVocabulary(kanji.character, limit: 30);
    final filtered = items.where((item) {
      if (item.word.contains(kanji.character)) {
        return true;
      }

      return item.kanjiComponents.any(
        (component) =>
            component.kanjiId == kanji.id ||
            component.character == kanji.character,
      );
    }).toList();

    filtered.sort((a, b) {
      final aExact = a.word.startsWith(kanji.character) ? 1 : 0;
      final bExact = b.word.startsWith(kanji.character) ? 1 : 0;
      final exactCompare = bExact.compareTo(aExact);
      if (exactCompare != 0) {
        return exactCompare;
      }

      return a.word.length.compareTo(b.word.length);
    });

    return filtered.take(6).toList();
  }

  Future<void> _openFolderPicker(KanjiDetailDto kanji) async {
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
        return _KanjiFolderPickerSheet(
          folders: folders,
          onCreateFolder: () => _showCreateFolderDialog(sheetContext),
          onSelectFolder: (folder) async {
            Navigator.pop(sheetContext);
            await _addKanjiToFolder(folder.id, kanji);
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
          title: const Text('Create new folder'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Folder name',
                  prefixIcon: Icon(Icons.folder_open_rounded),
                ),
              ),
              const SizedBox(height: AppTheme.space12),
              TextField(
                controller: descController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  prefixIcon: Icon(Icons.notes_rounded),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
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
                  _showMessage('Folder created.');
                } catch (error) {
                  _showError(error);
                }
              },
              child: const Text('Create'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _addKanjiToFolder(int folderId, KanjiDetailDto kanji) async {
    setState(() => _isAddingToFolder = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      await api.addVocabularyCopy(
        folderId,
        kanji.character,
        kanji.onyomi ?? kanji.kunyomi,
        kanji.meaning,
        1,
        kanjiId: kanji.id,
      );
      ref.invalidate(foldersProvider);
      _showMessage('Kanji added to folder.');
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
    final kanjiAsync = ref.watch(kanjiDetailProvider(widget.kanjiId));

    return Scaffold(
      body: KitsuneBackdrop(
        child: SafeArea(
          child: kanjiAsync.when(
            data: (kanji) {
              final accent = KitsuneColors.jlptColors[kanji.jlptLevel] ??
                  KitsuneColors.secondary;
              if (_exampleFuture == null || _exampleKanjiId != kanji.id) {
                _exampleKanjiId = kanji.id;
                _exampleFuture = _loadExamples(kanji);
              }

              return ListView(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
                children: [
                  _DetailHeader(character: kanji.character),
                  const SizedBox(height: AppTheme.space14),
                  _buildHeroCard(context, kanji, accent),
                  if (kanji.radical != null) ...[
                    const SizedBox(height: AppTheme.space14),
                    _buildRadicalCard(context, kanji.radical!, accent),
                  ],
                  const SizedBox(height: AppTheme.space14),
                  _buildExamplesCard(context, kanji),
                  if ((kanji.mnemonic ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: AppTheme.space14),
                    _buildMnemonicCard(context, kanji),
                  ],
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Error loading kanji: $error',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroCard(
    BuildContext context,
    KanjiDetailDto kanji,
    Color accent,
  ) {
    final hasOn = (kanji.onyomi ?? '').trim().isNotEmpty;
    final hasKun = (kanji.kunyomi ?? '').trim().isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: KitsuneColors.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: KitsuneColors.surfaceBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x142B2018),
            blurRadius: 24,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              KitsuneTailMark(color: accent),
              const Spacer(),
              if (kanji.jlptLevel != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: KitsuneColors.jlptSurfaces[kanji.jlptLevel],
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'JLPT N${kanji.jlptLevel}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: accent,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppTheme.space16),
          LayoutBuilder(
            builder: (context, constraints) {
              final stacked = constraints.maxWidth < 420;
              final identity = KanjiStrokeWriter(
                character: kanji.character,
                width: stacked ? 148 : 132,
                height: stacked ? 148 : 132,
                compact: true,
              );
              final metaColumn = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                    Text(
                      kanji.meaning,
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: AppTheme.space8),
                    Text(
                      kanji.amHanViet,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: KitsuneColors.primary,
                      ),
                    ),
                    const SizedBox(height: AppTheme.space10),
                    Text(
                      'Stroke count: ${kanji.strokeCount}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: KitsuneColors.onSurfaceVariant,
                          ),
                    ),
                    if (kanji.radical != null) ...[
                      const SizedBox(height: AppTheme.space6),
                      Text(
                        'Radical: ${kanji.radical!.radicalCharacter} - ${kanji.radical!.radicalName}',
                        style:
                            Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: KitsuneColors.onSurfaceVariant,
                                ),
                      ),
                    ],
                    const SizedBox(height: AppTheme.space14),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (hasOn)
                          _ReadingChip(
                            label: 'Onyomi',
                            value: kanji.onyomi!,
                            color: KitsuneColors.secondary,
                          ),
                        if (hasKun)
                          _ReadingChip(
                            label: 'Kunyomi',
                            value: kanji.kunyomi!,
                            color: KitsuneColors.primary,
                          ),
                        _ReadingChip(
                          label: 'Âm Hán Việt',
                          value: kanji.amHanViet,
                          color: accent,
                        ),
                      ],
                    ),
                ],
              );

              if (stacked) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    identity,
                    const SizedBox(height: AppTheme.space16),
                    metaColumn,
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  identity,
                  const SizedBox(width: AppTheme.space16),
                  Expanded(child: metaColumn),
                ],
              );
            },
          ),
          const SizedBox(height: AppTheme.space18),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isAddingToFolder ? null : () => _openFolderPicker(kanji),
                  icon: _isAddingToFolder
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.folder_copy_rounded),
                  label: const Text('Add to deck'),
                ),
              ),
              const SizedBox(width: AppTheme.space10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, '/srs'),
                  icon: const Icon(Icons.edit_note_rounded),
                  label: const Text('Practice'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRadicalCard(
    BuildContext context,
    RadicalDto radical,
    Color accent,
  ) {
    return KitsuneSurface(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Center(
              child: Text(
                radical.radicalCharacter,
                style: AppTheme.japaneseStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  color: accent,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppTheme.space14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  radical.radicalName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if ((radical.englishName ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: AppTheme.space4),
                  Text(
                    radical.englishName!,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
                if ((radical.description ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: AppTheme.space10),
                  Text(
                    radical.description!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.5,
                        ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExamplesCard(BuildContext context, KanjiDetailDto kanji) {
    return KitsuneSurface(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const KitsuneSectionHeader(
            title: 'Vocabulary examples',
            accent: KitsuneColors.primary,
          ),
          const SizedBox(height: AppTheme.space10),
          FutureBuilder<List<VocabularyDto>>(
            future: _exampleFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.2),
                    ),
                  ),
                );
              }

              if (snapshot.hasError) {
                return Text(
                  'Could not load example vocabulary yet.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: KitsuneColors.error,
                      ),
                );
              }

              final items = snapshot.data ?? const <VocabularyDto>[];
              if (items.isEmpty) {
                return Text(
                  'Chua tim thay tu vi du cho kanji ${kanji.character}.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: KitsuneColors.onSurfaceVariant,
                      ),
                );
              }

              return Column(
                children: [
                  for (var i = 0; i < items.length; i++) ...[
                    if (i > 0) const Divider(height: 1),
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => Navigator.pushNamed(
                          context,
                          '/vocabulary/${items[i].id}',
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          items[i].word,
                                          style: AppTheme.japaneseStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w800,
                                            color: KitsuneColors.onSurface,
                                          ),
                                        ),
                                        if ((items[i].pronunciation ?? '').trim().isNotEmpty) ...[
                                          const SizedBox(width: 6),
                                          Text(
                                            items[i].pronunciation!,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: KitsuneColors.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    Text(
                                      items[i].meaning,
                                      style: Theme.of(context).textTheme.bodySmall,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right_rounded,
                                size: 18,
                                color: KitsuneColors.onSurfaceVariant,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMnemonicCard(BuildContext context, KanjiDetailDto kanji) {
    return KitsuneSurface(
      color: KitsuneColors.stampSurface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.lightbulb_outline_rounded, color: KitsuneColors.stamp, size: 20),
          const SizedBox(width: AppTheme.space10),
          Expanded(
            child: Text(
              kanji.mnemonic!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    height: 1.4,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetailHeader extends StatelessWidget {
  const _DetailHeader({
    required this.character,
  });

  final String character;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => Navigator.maybePop(context),
            borderRadius: BorderRadius.circular(18),
            child: Ink(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: KitsuneColors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: KitsuneColors.surfaceBorder),
              ),
              child: const Icon(Icons.arrow_back_rounded),
            ),
          ),
        ),
        const SizedBox(width: AppTheme.space12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Kanji',
                style: Theme.of(context).textTheme.labelMedium,
              ),
              Text(
                character,
                style: AppTheme.japaneseStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w600,
                  color: KitsuneColors.onSurface,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ReadingChip extends StatelessWidget {
  const _ReadingChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 10,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: KitsuneColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _KanjiFolderPickerSheet extends StatelessWidget {
  const _KanjiFolderPickerSheet({
    required this.folders,
    required this.onSelectFolder,
    required this.onCreateFolder,
  });

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
              Text(
                'Choose folder',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: AppTheme.space8),
              Text(
                'Kanji will be copied into a study deck item so you can review it later.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      height: 1.45,
                    ),
              ),
              const SizedBox(height: AppTheme.space16),
              if (folders.isEmpty)
                const KitsuneEmptyState(
                  icon: Icons.folder_open_rounded,
                  title: 'No folder yet',
                  message: 'Create one first, then add this kanji into your study flow.',
                )
              else
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 320),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: folders.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
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
                                    style:
                                        Theme.of(context).textTheme.titleMedium,
                                  ),
                                  const SizedBox(height: AppTheme.space4),
                                  Text(
                                    (folder.description ?? '').trim().isNotEmpty
                                        ? folder.description!
                                        : '${folder.vocabCount} items inside',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
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
                label: const Text('Create new folder'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
