// kitsune_app/lib/providers/srs_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/srs.dart';
import 'package:kitsune_app/providers/providers.dart';

final srsSessionProvider = FutureProvider.family<FolderSrsSession?, int>((ref, folderId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getFolderSession(folderId: folderId);
});

final srsOverviewProvider = FutureProvider.family<FolderSrsOverview, int>((ref, folderId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.getFolderOverview(folderId);
});
