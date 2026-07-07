// kitsune_app/lib/providers/auth_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/api/kitsune_api.dart';
import 'package:kitsune_app/core/models/user.dart';

class AuthNotifier extends StateNotifier<AsyncValue<UserProfile?>> {
  final KitsuneApi _api;

  AuthNotifier(this._api) : super(const AsyncValue.loading()) {
    _restoreSession();
  }

  /// Attempts to restore a previously-persisted session on cold start,
  /// so a user with a valid stored session never sees the login screen again.
  /// Runs automatically once, from the constructor.
  Future<void> _restoreSession() async {
    if (!_api.client.isLoggedIn) {
      state = const AsyncValue.data(null);
      return;
    }
    state = await AsyncValue.guard(() => _api.restoreSession());
  }

  Future<void> login(String login, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _api.login(login, password));
  }

  Future<void> register(RegisterRequest payload) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _api.register(payload));
  }

  Future<void> forgotPassword(String email) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _api.forgotPassword(email);
      return _api.currentUser;
    });
  }

  Future<void> logout() async {
    await _api.logout();
    state = const AsyncValue.data(null);
  }

  Future<void> updateProfile({String? fullName, String? avatarUrl}) async {
    state = await AsyncValue.guard(
      () => _api.updateProfile(fullName: fullName, avatarUrl: avatarUrl),
    );
  }

  UserProfile? get currentUser => _api.currentUser;
  bool get isLoggedIn => _api.hasValidSession();
}
