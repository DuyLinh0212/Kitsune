import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/core/theme/app_theme.dart';
import 'package:kitsune_app/core/theme/colors.dart';
import 'package:kitsune_app/core/ui/kitsune_ui.dart';
import 'package:kitsune_app/core/ui/loading_fox.dart';
import 'package:kitsune_app/providers/quiz_provider.dart';
import 'package:kitsune_app/providers/providers.dart';

class QuizCreatePage extends ConsumerStatefulWidget {
  const QuizCreatePage({super.key});

  @override
  ConsumerState<QuizCreatePage> createState() => _QuizCreatePageState();
}

class _QuizCreatePageState extends ConsumerState<QuizCreatePage> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _timeLimitController = TextEditingController();
  final _searchController = TextEditingController();
  int _step = 0;
  final Set<int> _selectedVocabIds = {};
  final Set<int> _selectedKanjiIds = {};
  final Set<String> _selectedModes = {};
  List<FolderDto> _folders = [];
  List<dynamic> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadFolders();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _timeLimitController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFolders() async {
    try {
      final api = ref.read(kitsuneApiProvider);
      final folders = await api.getFolders();
      if (mounted) {
        setState(() => _folders = folders);
      }
    } catch (_) {}
  }

  Future<void> _searchVocab(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isSearching = true);
    try {
      final api = ref.read(kitsuneApiProvider);
      final results = await api.searchVocabulary(query.trim());
      if (mounted) {
        setState(() => _searchResults = results);
      }
    } finally {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  Future<void> _toggleFolderImport(FolderDto folder) async {
    final api = ref.read(kitsuneApiProvider);
    final folderItems = await api.getVocabulariesByFolder(folder.id);

    if (!mounted) {
      return;
    }

    setState(() {
      final ids = folderItems.map((item) => item.id).toSet();
      final containsAll = ids.every(_selectedVocabIds.contains);
      if (containsAll) {
        _selectedVocabIds.removeAll(ids);
      } else {
        _selectedVocabIds.addAll(ids);
      }
    });
  }

  Future<void> _createQuiz(AppStrings strings) async {
    if (_titleController.text.trim().isEmpty || _selectedModes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(strings.quizCreateValidation),
        ),
      );
      return;
    }

    try {
      final api = ref.read(kitsuneApiProvider);
      await api.createQuiz(
        title: _titleController.text.trim(),
        description: _descController.text.trim().isEmpty
            ? null
            : _descController.text.trim(),
        timeLimit: int.tryParse(_timeLimitController.text),
        modes: _selectedModes.toList(),
        vocabIds: _selectedVocabIds.toList(),
        kanjiIds: _selectedKanjiIds.toList(),
      );
      if (mounted) {
        ref.invalidate(myQuizzesProvider);
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${strings.errorPrefix}: $error'),
            backgroundColor: KitsuneColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final steps = [
      strings.quizStepInfo,
      strings.quizStepContent,
      strings.quizStepModes,
    ];

    return Scaffold(
      appBar: AppBar(title: Text(strings.quizCreateTitle)),
      body: KitsuneBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            KitsuneHeroCard(
              title: strings.createQuizHeaderTitle,
              subtitle: strings.createQuizHeaderSubtitle,
              accent: KitsuneColors.primary,
              trailing: Container(
                width: 84,
                height: 84,
                decoration: BoxDecoration(
                  color: KitsuneColors.stampSurface,
                  borderRadius: BorderRadius.circular(26),
                ),
                child: Center(
                  child: Text(
                    '${_selectedVocabIds.length + _selectedKanjiIds.length}',
                    style: AppTheme.numeralStyle(
                      fontSize: 28,
                      color: KitsuneColors.primary,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppTheme.space20),
            Row(
              children: List.generate(steps.length, (index) {
                final isActive = _step == index;
                final isDone = _step > index;

                return Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(right: index == steps.length - 1 ? 0 : 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: isActive
                            ? KitsuneColors.primarySurface
                            : KitsuneColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isActive || isDone
                              ? KitsuneColors.primary
                              : KitsuneColors.surfaceBorder,
                        ),
                      ),
                      child: Column(
                        children: [
                          Text(
                            '${index + 1}',
                            style: AppTheme.numeralStyle(
                              fontSize: 16,
                              color: isDone || isActive
                                  ? KitsuneColors.primary
                                  : KitsuneColors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            steps[index],
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDone || isActive
                                  ? KitsuneColors.primary
                                  : KitsuneColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: AppTheme.space20),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 220),
              child: _buildStepContent(context, strings),
            ),
            const SizedBox(height: AppTheme.space20),
            Row(
              children: [
                if (_step > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _step--),
                      child: Text(strings.back),
                    ),
                  ),
                if (_step > 0) const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _step == 2
                        ? () => _createQuiz(strings)
                        : () => setState(() => _step++),
                    child: Text(_step == 2 ? strings.createQuizFAB : strings.quizStepNext),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent(BuildContext context, AppStrings strings) {
    switch (_step) {
      case 0:
        return KitsuneSurface(
          key: const ValueKey('step-0'),
          child: Column(
            children: [
              TextField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: strings.quizTitleRequired,
                  prefixIcon: const Icon(Icons.title_rounded),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _descController,
                decoration: InputDecoration(
                  labelText: strings.quizDescOptional,
                  prefixIcon: const Icon(Icons.notes_rounded),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _timeLimitController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: strings.quizTimeLimitOptional,
                  prefixIcon: const Icon(Icons.timer_outlined),
                  hintText: strings.quizTimeLimitHint,
                ),
              ),
            ],
          ),
        );
      case 1:
        return KitsuneSurface(
          key: const ValueKey('step-1'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              KitsuneSectionHeader(
                title: strings.quizSelectContentTitle,
                subtitle: strings.quizSelectContentSubtitle,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _folders.map((folder) {
                  final isImported = folder.vocabCount > 0;
                  return FilterChip(
                    label: Text('${folder.name} (${folder.vocabCount})'),
                    selected: isImported &&
                        _selectedVocabIds.isNotEmpty,
                    onSelected: (_) => _toggleFolderImport(folder),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              KitsuneSearchField(
                controller: _searchController,
                hintText: strings.searchVocabToAddHint,
                onChanged: (value) {
                  _searchVocab(value);
                  setState(() {});
                },
                onClear: () {
                  _searchController.clear();
                  _searchVocab('');
                  setState(() {});
                },
              ),
              const SizedBox(height: 16),
              if (_isSearching)
                KitsuneLoadingFox(message: strings.searchingVocabLoading, size: 72)
              else if (_searchResults.isEmpty)
                Text(
                  strings.noSearchResultsQuiz,
                  style: Theme.of(context).textTheme.bodySmall,
                )
              else
                ..._searchResults.map((item) {
                  final isSelected = _selectedVocabIds.contains(item.id);
                  return CheckboxListTile(
                    value: isSelected,
                    activeColor: KitsuneColors.primary,
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.word ?? item.character ?? ''),
                    subtitle: Text(item.meaning),
                    onChanged: (value) {
                      setState(() {
                        if (value == true) {
                          _selectedVocabIds.add(item.id);
                        } else {
                          _selectedVocabIds.remove(item.id);
                        }
                      });
                    },
                  );
                }),
            ],
          ),
        );
      default:
        return KitsuneSurface(
          key: const ValueKey('step-2'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              KitsuneSectionHeader(
                title: strings.quizSelectModesTitle,
                subtitle: strings.quizSelectModesSubtitle,
              ),
              const SizedBox(height: 16),
              ...QuizMode.vocabModes.map((m) => _modeTile(m, strings)),
              const SizedBox(height: 12),
              ...QuizMode.kanjiModes.map((m) => _modeTile(m, strings)),
            ],
          ),
        );
    }
  }

  Widget _modeTile(QuizMode mode, AppStrings strings) {
    final isSelected = _selectedModes.contains(mode.code);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: KitsuneSurface(
        color: isSelected ? KitsuneColors.primarySurface : KitsuneColors.surface,
        onTap: () {
          setState(() {
            if (isSelected) {
              _selectedModes.remove(mode.code);
            } else {
              _selectedModes.add(mode.code);
            }
          });
        },
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.check_circle_rounded : Icons.circle_outlined,
              color: isSelected
                  ? KitsuneColors.primary
                  : KitsuneColors.onSurfaceVariant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                strings.quizModeTitle(mode.code),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: KitsuneColors.onSurface,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
