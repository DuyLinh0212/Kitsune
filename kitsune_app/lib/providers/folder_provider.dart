// kitsune_app/lib/providers/folder_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/providers/providers.dart';

final foldersProvider = FutureProvider<List<FolderDto>>((ref) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getFolders();
});

final folderDetailProvider = FutureProvider.family<FolderDto, int>((ref, id) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getFolderById(id);
});

// Vocabularies scoped directly to a folder (fixes the old global-search-capped bug).
final folderVocabulariesProvider = FutureProvider.family<List<VocabularyDto>, int>((ref, folderId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getVocabulariesByFolder(folderId);
});
