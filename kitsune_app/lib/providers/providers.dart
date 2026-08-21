// kitsune_app/lib/providers/providers.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/api/kitsune_api.dart';
import 'package:kitsune_app/core/models/user.dart';
import 'package:kitsune_app/core/network/supabase_client.dart';
import 'package:kitsune_app/core/services/tts_service.dart';
import 'package:kitsune_app/providers/auth_provider.dart';

// Supabase client provider (lazy singleton)
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  final client = SupabaseClient();
  // Init is called in main.dart
  return client;
});

// Single consolidated API provider — replaces all per-feature repositories.
final kitsuneApiProvider = Provider<KitsuneApi>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return KitsuneApi(client: client);
});

// Auth state provider
final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<UserProfile?>>((ref) {
  final api = ref.watch(kitsuneApiProvider);
  return AuthNotifier(api);
});

// Text-to-speech provider (lazy singleton)
final ttsServiceProvider = Provider<TtsService>((ref) => TtsService());
