// kitsune_app/lib/core/network/supabase_client.dart

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/supabase_config.dart';

class SupabaseClient {
  static final SupabaseClient _instance = SupabaseClient._internal();
  factory SupabaseClient() => _instance;

  SupabaseClient._internal();

  late final Dio dio;
  String? _accessToken;
  String? _refreshToken;
  String? _currentUserEmail;

  String table(String name) => '/rest/v1/$name';
  String get baseUrl => SupabaseConfig.url;

  Future<void> init() async {
    final storage = const FlutterSecureStorage();
    _accessToken = await storage.read(key: 'access_token');
    _refreshToken = await storage.read(key: 'refresh_token');
    _currentUserEmail = await storage.read(key: 'user_email');

    dio = Dio(
      BaseOptions(
        baseUrl: SupabaseConfig.url,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'apikey': SupabaseConfig.anonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
        },
      ),
    );

    // Auth interceptor: attach bearer token, silently refresh once on 401.
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          final isAuthEndpoint = error.requestOptions.path.startsWith('/auth/v1');
          if (error.response?.statusCode == 401 && !isAuthEndpoint) {
            final refreshed = await refreshSession();
            if (refreshed) {
              try {
                final retryResponse = await dio.fetch(error.requestOptions);
                return handler.resolve(retryResponse);
              } catch (_) {
                // fall through to logout below
              }
            }
            await logout();
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<void> setSession({
    required String accessToken,
    String? refreshToken,
    required String email,
  }) async {
    final storage = const FlutterSecureStorage();
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _currentUserEmail = email;
    await storage.write(key: 'access_token', value: accessToken);
    if (refreshToken != null) {
      await storage.write(key: 'refresh_token', value: refreshToken);
    }
    await storage.write(key: 'user_email', value: email);
    dio.options.headers['Authorization'] = 'Bearer $accessToken';
  }

  /// Attempts to exchange the stored refresh token for a new access token.
  /// Returns true on success (session updated in place).
  Future<bool> refreshSession() async {
    if (_refreshToken == null) return false;

    try {
      final response = await Dio(BaseOptions(baseUrl: SupabaseConfig.url)).post(
        '/auth/v1/token?grant_type=refresh_token',
        data: {'refresh_token': _refreshToken},
        options: Options(headers: {
          'apikey': SupabaseConfig.anonKey,
          'Content-Type': 'application/json',
        }),
      );

      if (response.statusCode != 200) return false;

      final data = response.data as Map<String, dynamic>;
      final newAccessToken = data['access_token'] as String?;
      final newRefreshToken = data['refresh_token'] as String?;
      if (newAccessToken == null) return false;

      final storage = const FlutterSecureStorage();
      _accessToken = newAccessToken;
      _refreshToken = newRefreshToken ?? _refreshToken;
      await storage.write(key: 'access_token', value: newAccessToken);
      if (newRefreshToken != null) {
        await storage.write(key: 'refresh_token', value: newRefreshToken);
      }
      dio.options.headers['Authorization'] = 'Bearer $newAccessToken';
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> logout() async {
    final storage = const FlutterSecureStorage();
    _accessToken = null;
    _refreshToken = null;
    _currentUserEmail = null;
    await storage.delete(key: 'access_token');
    await storage.delete(key: 'refresh_token');
    await storage.delete(key: 'user_email');
    dio.options.headers.remove('Authorization');
  }

  bool get isLoggedIn => _accessToken != null;
  String? get userEmail => _currentUserEmail;
}
