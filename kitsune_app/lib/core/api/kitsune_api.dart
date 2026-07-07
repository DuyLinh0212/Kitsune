// kitsune_app/lib/core/api/kitsune_api.dart

import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart' show Options;
import 'package:kitsune_app/core/constants/app_constants.dart';
import 'package:kitsune_app/core/constants/supabase_config.dart';
import 'package:kitsune_app/core/models/dashboard.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/core/models/srs.dart';
import 'package:kitsune_app/core/models/user.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/network/supabase_client.dart';
import 'package:kitsune_app/core/srs/srs_engine.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Single entry point for every Supabase REST/Storage/Auth call the app makes.
/// Replaces the previous per-feature `*_repository.dart` files.
class KitsuneApi {
  final SupabaseClient client;
  UserProfile? _currentUser;

  KitsuneApi({required this.client});

  UserProfile? get currentUser => _currentUser;
  bool hasValidSession() => client.isLoggedIn && _currentUser != null;

  // ── Auth ─────────────────────────────────────────────────────────────────────

  Future<UserProfile> login(String login, String password) async {
    String email = login;
    if (!login.contains('@')) {
      final response = await client.dio.get(
        client.table('Users'),
        queryParameters: {'select': 'Email', 'Username': 'eq.$login'},
      );
      final data = response.data as List<dynamic>;
      if (data.isEmpty) throw Exception('Tên đăng nhập không tồn tại');
      email = (data[0] as Map<String, dynamic>)['Email'] as String;
    }

    final authResponse = await client.dio.post(
      '/auth/v1/token?grant_type=password',
      data: {'email': email, 'password': password},
    );

    if (authResponse.statusCode != 200) {
      throw Exception('Đăng nhập thất bại');
    }

    final authData = authResponse.data as Map<String, dynamic>;
    await client.setSession(
      accessToken: authData['access_token'] as String,
      refreshToken: authData['refresh_token'] as String?,
      email: email,
    );

    return _fetchAndEmitProfile(email);
  }

  Future<UserProfile> register(RegisterRequest payload) async {
    final authResponse = await client.dio.post(
      '/auth/v1/signup',
      data: {
        'email': payload.email,
        'password': payload.password,
        'data': {
          'username': payload.username,
          'full_name': payload.fullName,
        },
      },
    );

    if (authResponse.statusCode != 200) {
      throw Exception('Đăng ký thất bại');
    }

    final authData = authResponse.data as Map<String, dynamic>;
    final accessToken = authData['access_token'] as String?;
    if (accessToken != null) {
      await client.setSession(
        accessToken: accessToken,
        refreshToken: authData['refresh_token'] as String?,
        email: payload.email,
      );
    }

    return _fetchAndEmitProfile(payload.email);
  }

  Future<void> forgotPassword(String email) async {
    final response = await client.dio.post(
      '/auth/v1/recover',
      data: {'email': email},
    );
    if (response.statusCode != 200) {
      throw Exception('Gửi email đặt lại mật khẩu thất bại');
    }
  }

  Future<void> logout() async {
    try {
      await client.dio.post('/auth/v1/logout');
    } catch (_) {
      // Ignore errors during logout
    }
    _currentUser = null;
    await client.logout();
  }

  /// Attempts to restore a previously-persisted session on cold start.
  /// Returns the profile if the stored (or refreshed) token is still valid.
  Future<UserProfile?> restoreSession() async {
    if (!client.isLoggedIn) return null;
    final email = client.userEmail;
    if (email == null) return null;

    try {
      return await _fetchAndEmitProfile(email);
    } catch (_) {
      final refreshed = await client.refreshSession();
      if (!refreshed) {
        await logout();
        return null;
      }
      try {
        return await _fetchAndEmitProfile(email);
      } catch (_) {
        await logout();
        return null;
      }
    }
  }

  Future<UserProfile> _fetchAndEmitProfile(String email) async {
    final profile = await fetchProfile(email);
    _currentUser = profile;
    return profile;
  }

  Future<UserProfile> fetchProfile(String email) async {
    final response = await client.dio.get(
      client.table('Users'),
      queryParameters: {
        'select': SupabaseConfig.userProfileSelect,
        'Email': 'eq.$email',
      },
    );

    final data = response.data as List<dynamic>;
    if (data.isNotEmpty) {
      return UserProfile.fromJson(data[0] as Map<String, dynamic>);
    }

    return _createUserProfile(email);
  }

  Future<UserProfile> _createUserProfile(String email) async {
    final base = email.split('@')[0].replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
    final username =
        '${base}_${DateTime.now().millisecondsSinceEpoch.toString().padLeft(4, '0').substring(0, 4)}';

    final createResponse = await client.dio.post(
      client.table('Users'),
      data: {
        'Username': username,
        'PasswordHash': 'SUPABASE_AUTH',
        'Email': email,
        'FullName': null,
        'IsActive': true,
        'IsVerified': false,
      },
    );

    if (createResponse.statusCode != 201) {
      return _retryFetchProfile(email);
    }

    final createdUser = UserProfile.fromJson(createResponse.data as Map<String, dynamic>);

    try {
      final roleResponse = await client.dio.get(
        client.table('Role'),
        queryParameters: {'select': 'Id', 'RoleName': 'eq.USER'},
      );
      final roleData = roleResponse.data as List<dynamic>;
      if (roleData.isNotEmpty) {
        final roleId = (roleData[0] as Map<String, dynamic>)['Id'] as int;
        await client.dio.post(
          client.table('User_Role'),
          data: {'UserId': createdUser.id, 'RoleId': roleId},
        );
      }
    } catch (_) {
      // Non-critical: user can still use the app without explicit role assignment
    }

    return createdUser;
  }

  Future<UserProfile> _retryFetchProfile(String email) async {
    final response = await client.dio.get(
      client.table('Users'),
      queryParameters: {
        'select': SupabaseConfig.userProfileSelect,
        'Email': 'eq.$email',
      },
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Không thể tạo hồ sơ người dùng');
    return UserProfile.fromJson(data[0] as Map<String, dynamic>);
  }

  Future<int> getCurrentUserId() async {
    final email = client.userEmail;
    if (email == null) throw Exception('Chưa đăng nhập');
    final response = await client.dio.get(
      client.table('Users'),
      queryParameters: {'select': 'Id', 'Email': 'eq.$email'},
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Không tìm thấy hồ sơ người dùng');
    return (data[0] as Map<String, dynamic>)['Id'] as int;
  }

  Future<UserProfile> updateProfile({String? fullName, String? avatarUrl}) async {
    final patch = <String, dynamic>{};
    if (fullName != null) patch['FullName'] = fullName;
    if (avatarUrl != null) patch['AvatarUrl'] = avatarUrl;

    final userId = await getCurrentUserId();
    final response = await client.dio.patch(
      client.table('Users'),
      data: patch,
      queryParameters: {'Id': 'eq.$userId'},
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Cập nhật thất bại');
    final profile = UserProfile.fromJson(data[0] as Map<String, dynamic>);
    _currentUser = profile;
    return profile;
  }

  /// Uploads raw image bytes to the `avatars` storage bucket and returns its public URL.
  /// Requires the `avatars` bucket (public read, authenticated write) to exist in Supabase.
  Future<String> uploadAvatar(List<int> bytes, String fileName) async {
    final userId = await getCurrentUserId();
    final objectPath = 'user-$userId/$fileName';

    await client.dio.post(
      '/storage/v1/object/avatars/$objectPath',
      data: bytes,
      options: Options(
        headers: {
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
      ),
    );

    return '${client.baseUrl}/storage/v1/object/public/avatars/$objectPath';
  }

  // ── Folders ──────────────────────────────────────────────────────────────────

  Future<List<FolderDto>> getFolders() async {
    final userId = await getCurrentUserId();
    final response = await client.dio.get(
      client.table('VocabularyFolder'),
      queryParameters: {
        'select': '*, Vocabularies(count)',
        'UserId': 'eq.$userId',
        'order': 'CreatedAt.desc',
      },
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => FolderDto.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<FolderDto> getFolderById(int id) async {
    final response = await client.dio.get(
      client.table('VocabularyFolder'),
      queryParameters: {'select': '*', 'Id': 'eq.$id'},
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Không tìm thấy thư mục');
    return FolderDto.fromJson(data[0] as Map<String, dynamic>);
  }

  Future<FolderDto> createFolder(CreateFolderDto dto) async {
    final userId = await getCurrentUserId();
    final response = await client.dio.post(client.table('VocabularyFolder'), data: {
      'UserId': userId,
      'FolderName': dto.name,
      'Description': dto.description,
      'IsPublic': dto.isPublic,
    });
    return FolderDto.fromJson(response.data as Map<String, dynamic>);
  }

  Future<FolderDto> updateFolder(int id, UpdateFolderDto dto) async {
    final patch = <String, dynamic>{};
    if (dto.name != null) patch['FolderName'] = dto.name;
    if (dto.description != null) patch['Description'] = dto.description;
    if (dto.isPublic != null) patch['IsPublic'] = dto.isPublic;
    final response = await client.dio.patch(
      client.table('VocabularyFolder'),
      data: patch,
      queryParameters: {'Id': 'eq.$id'},
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Cập nhật thất bại');
    return FolderDto.fromJson(data[0] as Map<String, dynamic>);
  }

  Future<void> deleteFolder(int id) async {
    await client.dio.delete(client.table('VocabularyFolder'), queryParameters: {'Id': 'eq.$id'});
  }

  Future<void> addVocabularyCopy(
    int folderId,
    String word,
    String? pronunciation,
    String meaning,
    int languageId, {
    int? kanjiId,
  }) async {
    final response = await client.dio.post(client.table('Vocabularies'), data: {
      'FolderId': folderId,
      'LanguageId': languageId,
      'Word': word,
      'Pronunciation': pronunciation,
      'Meaning': meaning,
    });
    if (kanjiId != null) {
      final newVocab = response.data as Map<String, dynamic>;
      await client.dio.post(client.table('KanjiComponents'), data: {
        'VocabularyId': newVocab['Id'],
        'KanjiId': kanjiId,
        'Order': 0,
      });
    }
  }

  Future<void> addVocabularyDetailCopy(
    int folderId, {
    required int languageId,
    required String word,
    String? pronunciation,
    required String meaning,
    required List<int> kanjiIds,
  }) async {
    final response = await client.dio.post(client.table('Vocabularies'), data: {
      'FolderId': folderId,
      'LanguageId': languageId,
      'Word': word,
      'Pronunciation': pronunciation,
      'Meaning': meaning,
    });
    final newVocab = response.data as Map<String, dynamic>;

    if (kanjiIds.isEmpty) return;

    final inserts = <Map<String, dynamic>>[];
    for (var index = 0; index < kanjiIds.length; index++) {
      inserts.add({
        'VocabularyId': newVocab['Id'],
        'KanjiId': kanjiIds[index],
        'Order': index,
      });
    }

    await client.dio.post(client.table('KanjiComponents'), data: inserts);
  }

  Future<void> removeVocabulary(int vocabularyId) async {
    await client.dio.delete(client.table('Vocabularies'), queryParameters: {'Id': 'eq.$vocabularyId'});
  }

  /// Fetches vocabularies scoped to a single folder directly (no global-search cap),
  /// fixing the bug where a folder's words could fall outside a 100-row global scan.
  Future<List<VocabularyDto>> getVocabulariesByFolder(int folderId) async {
    final response = await client.dio.get(
      client.table('Vocabularies'),
      queryParameters: {
        'select': SupabaseConfig.vocabSelect,
        'FolderId': 'eq.$folderId',
        'order': 'CreatedAt.desc',
      },
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => VocabularyDto.fromJson(r as Map<String, dynamic>)).toList();
  }

  // ── Vocabulary ───────────────────────────────────────────────────────────────

  Future<List<VocabularyDto>> searchVocabulary(String query, {int? limit}) async {
    final normalizedQuery = _normalize(query);
    if (normalizedQuery.isEmpty) {
      return _fetchVocabByParams(
        queryParameters: {if (limit != null) 'limit': '$limit'},
      );
    }

    final responses = await Future.wait([
      _fetchVocabByParams(queryParameters: {
        'Word': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
      _fetchVocabByParams(queryParameters: {
        'Meaning': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
      _fetchVocabByParams(queryParameters: {
        'Pronunciation': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
    ]);

    final merged = <int, VocabularyDto>{};
    for (final items in responses) {
      for (final item in items) {
        merged[item.id] = item;
      }
    }

    final ranked = merged.values
        .map((item) => MapEntry(item, _scoreVocab(item, normalizedQuery)))
        .where((entry) => entry.value > 0)
        .toList()
      ..sort((a, b) {
        final scoreCompare = b.value.compareTo(a.value);
        if (scoreCompare != 0) return scoreCompare;
        return a.key.word.length.compareTo(b.key.word.length);
      });

    final results = ranked.map((entry) => entry.key).toList();
    return limit == null ? results : results.take(limit).toList();
  }

  Future<VocabularyDto> getVocabularyById(int id) async {
    final response = await client.dio.get(
      client.table('Vocabularies'),
      queryParameters: {'select': SupabaseConfig.vocabSelect, 'Id': 'eq.$id'},
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Khong tim thay tu vung');
    return VocabularyDto.fromJson(data[0] as Map<String, dynamic>);
  }

  Future<List<VocabularyDto>> getRandomVocabulary({int limit = 20}) async {
    final items = await _fetchVocabByParams(queryParameters: {'limit': '$limit'});
    items.shuffle();
    return items;
  }

  Future<bool> getVocabularyBookmarkStatus(int vocabularyId) async {
    try {
      final userId = await getCurrentUserId();
      final response = await client.dio.get(
        client.table('VocabularyBookmarks'),
        queryParameters: {
          'select': 'Id',
          'UserId': 'eq.$userId',
          'VocabularyId': 'eq.$vocabularyId',
        },
      );
      return (response.data as List<dynamic>).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<bool> toggleVocabularyBookmark(int vocabularyId) async {
    final userId = await getCurrentUserId();
    final response = await client.dio.get(
      client.table('VocabularyBookmarks'),
      queryParameters: {
        'select': 'Id',
        'UserId': 'eq.$userId',
        'VocabularyId': 'eq.$vocabularyId',
      },
    );
    final data = response.data as List<dynamic>;
    if (data.isNotEmpty) {
      final id = (data[0] as Map<String, dynamic>)['Id'] as int;
      await client.dio.delete(client.table('VocabularyBookmarks'), queryParameters: {'Id': 'eq.$id'});
      return false;
    }

    await client.dio.post(client.table('VocabularyBookmarks'), data: {
      'UserId': userId,
      'VocabularyId': vocabularyId,
      'IsPinned': true,
      'PinnedAt': DateTime.now().toIso8601String(),
    });
    return true;
  }

  Future<bool> getVocabularySrsStatus(int vocabularyId) async {
    try {
      final userId = await getCurrentUserId();
      final response = await client.dio.get(
        client.table('SRSCards'),
        queryParameters: {
          'select': 'Id',
          'UserId': 'eq.$userId',
          'VocabularyId': 'eq.$vocabularyId',
        },
      );
      return (response.data as List<dynamic>).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<void> addVocabularyToSrs(int vocabularyId) async {
    final userId = await getCurrentUserId();
    await client.dio.post(client.table('SRSCards'), data: {
      'UserId': userId,
      'VocabularyId': vocabularyId,
      'KanjiId': null,
      'BoxLevel': 1,
      'EaseFactor': 2.5,
      'IntervalDays': 0,
      'Repetitions': 0,
      'NextReviewDate': DateTime.now().toIso8601String(),
    });
  }

  Future<List<VocabularyDto>> _fetchVocabByParams({required Map<String, String> queryParameters}) async {
    final response = await client.dio.get(
      client.table('Vocabularies'),
      queryParameters: {'select': SupabaseConfig.vocabSelect, ...queryParameters},
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => VocabularyDto.fromJson(r as Map<String, dynamic>)).toList();
  }

  int _scoreVocab(VocabularyDto item, String query) {
    final exactFields = <String>[
      item.word,
      item.meaning,
      item.pronunciation ?? '',
      item.specificData?['amHanViet'] as String? ?? '',
      item.specificData?['kanji'] as String? ?? '',
    ].map(_normalize).toList();

    final containsFields = <String>[
      item.word,
      item.meaning,
      item.pronunciation ?? '',
      item.specificData?['amHanViet'] as String? ?? '',
      item.specificData?['kanji'] as String? ?? '',
      item.specificData?['exampleMeaning'] as String? ?? '',
      item.specificData?['exampleSentence'] as String? ?? '',
      ...item.kanjiComponents.map((component) => component.character),
      ...item.kanjiComponents.map((component) => component.amHanViet),
    ].map(_normalize).toList();

    if (_normalize(item.word) == query) return 150;
    if (exactFields.any((field) => field == query)) return 120;
    if (containsFields.any((field) => field.startsWith(query))) return 80;
    if (containsFields.any((field) => field.contains(query))) return 40;
    return 0;
  }

  // ── Kanji ────────────────────────────────────────────────────────────────────

  Future<List<KanjiDetailDto>> searchKanji(String query, {int? limit}) async {
    final normalizedQuery = _normalize(query);
    if (normalizedQuery.isEmpty) return [];

    final exactResponses = await Future.wait([
      _fetchKanjiByParams(queryParameters: {
        'Character': 'eq.$normalizedQuery',
        if (limit != null) 'limit': '$limit',
      }),
      _fetchKanjiByParams(queryParameters: {
        'AmHanViet': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
      _fetchKanjiByParams(queryParameters: {
        'Meaning': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
      _fetchKanjiByParams(queryParameters: {
        'Onyomi': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
      _fetchKanjiByParams(queryParameters: {
        'Kunyomi': 'ilike.*$normalizedQuery*',
        if (limit != null) 'limit': '$limit',
      }),
    ]);

    final merged = <int, KanjiDetailDto>{};
    for (final items in exactResponses) {
      for (final item in items) {
        merged[item.id] = item;
      }
    }

    final ranked = merged.values
        .map((item) => MapEntry(item, _scoreKanji(item, normalizedQuery)))
        .where((entry) => entry.value > 0)
        .toList()
      ..sort((a, b) {
        final scoreCompare = b.value.compareTo(a.value);
        if (scoreCompare != 0) return scoreCompare;
        final jlptA = a.key.jlptLevel ?? 99;
        final jlptB = b.key.jlptLevel ?? 99;
        final jlptCompare = jlptA.compareTo(jlptB);
        if (jlptCompare != 0) return jlptCompare;
        return a.key.character.compareTo(b.key.character);
      });

    final results = ranked.map((entry) => entry.key).toList();
    return limit == null ? results : results.take(limit).toList();
  }

  Future<KanjiDetailDto> getKanjiById(int id) async {
    final response = await client.dio.get(
      client.table('Kanji'),
      queryParameters: {'select': SupabaseConfig.kanjiSelect, 'Id': 'eq.$id'},
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Khong tim thay kanji');
    return KanjiDetailDto.fromJson(data[0] as Map<String, dynamic>);
  }

  Future<List<KanjiDetailDto>> getRandomKanji({int limit = 40}) async {
    final response = await client.dio.get(
      client.table('Kanji'),
      queryParameters: {'select': SupabaseConfig.kanjiSelect, 'limit': '$limit'},
    );
    final data = (response.data as List<dynamic>)..shuffle();
    return data.map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<List<KanjiDetailDto>> getFirstKanji({int limit = 40}) async {
    final response = await client.dio.get(
      client.table('Kanji'),
      queryParameters: {'select': SupabaseConfig.kanjiSelect, 'limit': '$limit'},
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<List<KanjiDetailDto>> _fetchKanjiByParams({required Map<String, String> queryParameters}) async {
    final response = await client.dio.get(
      client.table('Kanji'),
      queryParameters: {'select': SupabaseConfig.kanjiSelect, ...queryParameters},
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>)).toList();
  }

  int _scoreKanji(KanjiDetailDto item, String query) {
    final exactFields = <String>[
      item.character,
      item.meaning,
      item.amHanViet,
      item.onyomi ?? '',
      item.kunyomi ?? '',
      item.radical?.radicalCharacter ?? '',
      item.radical?.radicalName ?? '',
    ].map(_normalize).toList();

    final containsFields = <String>[
      item.character,
      item.meaning,
      item.amHanViet,
      item.onyomi ?? '',
      item.kunyomi ?? '',
      item.mnemonic ?? '',
      item.radical?.radicalCharacter ?? '',
      item.radical?.radicalName ?? '',
      item.radical?.englishName ?? '',
      item.radical?.description ?? '',
    ].map(_normalize).toList();

    if (_normalize(item.character) == query) return 150;
    if (exactFields.any((field) => field == query)) return 120;
    if (containsFields.any((field) => field.startsWith(query))) return 80;
    if (containsFields.any((field) => field.contains(query))) return 40;
    return 0;
  }

  // ── SRS ──────────────────────────────────────────────────────────────────────

  Future<int?> getActiveFolderId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(AppConstants.activeFolderKey);
  }

  Future<void> setActiveFolderId(int? folderId) async {
    final prefs = await SharedPreferences.getInstance();
    if (folderId == null) {
      await prefs.remove(AppConstants.activeFolderKey);
    } else {
      await prefs.setInt(AppConstants.activeFolderKey, folderId);
    }
  }

  Future<FolderSrsSession?> getFolderSession({int? folderId}) async {
    final resolvedId = folderId ?? await getActiveFolderId();
    if (resolvedId == null) return null;

    final email = client.userEmail;
    if (email == null) return null;

    final userId = await getCurrentUserId();
    final context = await _loadSrsContext(resolvedId, userId);
    await _ensureSrsCards(context);
    final overview = _buildSrsOverview(context);
    final cards = _mapSrsCards(context);
    final flashcards = cards.where((c) => c.boxLevel == 0).toList();
    final quizCards = cards.where((c) => c.boxLevel > 0 && c.isDue).toList();

    return FolderSrsSession(
      folderId: resolvedId,
      folderName: context.folderName,
      overview: overview,
      cards: [...flashcards, ...quizCards],
      flashcards: flashcards,
      quizCards: quizCards,
    );
  }

  Future<FolderSrsOverview> getFolderOverview(int folderId) async {
    final session = await getFolderSession(folderId: folderId);
    if (session == null) throw Exception('Không tìm thấy session SRS');
    return session.overview;
  }

  Future<bool> canSwitchFolder(int folderId) async {
    try {
      final overview = await getFolderOverview(folderId);
      return overview.canSwitchFolder;
    } catch (_) {
      return true;
    }
  }

  Future<FolderSrsSession> activateFolder(int folderId) async {
    final currentId = await getActiveFolderId();
    if (currentId != null && currentId != folderId) {
      final canSwitch = await canSwitchFolder(currentId);
      if (!canSwitch) {
        throw Exception('Thư mục hiện tại chưa học xong. Hãy hoàn tất các thẻ mới trước khi đổi thư mục.');
      }
    }

    final session = await getFolderSession(folderId: folderId);
    if (session == null) throw Exception('Không thể khởi tạo SRS cho thư mục này');
    await setActiveFolderId(folderId);
    return session;
  }

  Future<void> completeFlashcard(int cardId) async {
    await _updateSrsCardProgress(cardId, correct: true, isFlashcard: true);
  }

  Future<void> submitQuizAnswer(int cardId, bool correct) async {
    await _updateSrsCardProgress(cardId, correct: correct, isFlashcard: false);
  }

  Future<_SrsContext> _loadSrsContext(int folderId, int userId) async {
    final folderRes = await client.dio.get(
      client.table('VocabularyFolder'),
      queryParameters: {'select': 'Id, FolderName', 'Id': 'eq.$folderId'},
    );
    final folderData = folderRes.data as List<dynamic>;
    if (folderData.isEmpty) throw Exception('Không tìm thấy thư mục');
    final folder = folderData[0] as Map<String, dynamic>;
    final folderName = folder['FolderName'] as String;

    final vocabRes = await client.dio.get(
      client.table('Vocabularies'),
      queryParameters: {
        'select': 'Id, Word, Pronunciation, Meaning, FolderId',
        'FolderId': 'eq.$folderId',
        'order': 'CreatedAt.asc',
      },
    );
    final vocabs = (vocabRes.data as List<dynamic>).cast<Map<String, dynamic>>();

    final cardRes = await client.dio.get(
      client.table('SRSCards'),
      queryParameters: {
        'select': SupabaseConfig.srsCardSelect,
        'UserId': 'eq.$userId',
      },
    );
    final cards = (cardRes.data as List<dynamic>).cast<Map<String, dynamic>>();

    final vocabIds = vocabs.map((v) => v['Id'] as int).toList();
    List<Map<String, dynamic>> kanjiComponents = [];
    if (vocabIds.isNotEmpty) {
      final idsStr = vocabIds.join(',');
      final kcRes = await client.dio.get(
        client.table('KanjiComponents'),
        queryParameters: {
          'select': SupabaseConfig.kanjiComponentWithKanjiSelect,
          'VocabularyId': 'in.($idsStr)',
          'order': 'Order.asc',
        },
      );
      kanjiComponents = (kcRes.data as List<dynamic>).cast<Map<String, dynamic>>();
    }

    return _SrsContext(
      folderId: folderId,
      folderName: folderName,
      userId: userId,
      vocabs: vocabs,
      kanjiComponents: kanjiComponents,
      cards: cards,
    );
  }

  Future<void> _ensureSrsCards(_SrsContext context) async {
    final existingKeys = <String>{};
    for (final card in context.cards) {
      existingKeys.add(SrsEngine.encodeKey(card['VocabularyId'] as int?, card['KanjiId'] as int?));
    }

    final now = DateTime.now().toIso8601String();
    final inserts = <Map<String, dynamic>>[];

    for (final vocab in context.vocabs) {
      final key = SrsEngine.encodeKey(vocab['Id'] as int, null);
      if (existingKeys.contains(key)) continue;
      inserts.add({
        'UserId': context.userId,
        'VocabularyId': vocab['Id'],
        'KanjiId': null,
        'BoxLevel': 0,
        'EaseFactor': 2.5,
        'IntervalDays': 0,
        'Repetitions': 0,
        'NextReviewDate': now,
      });
      existingKeys.add(key);
    }

    final uniqueKanji = _uniqueKanji(context.kanjiComponents);
    for (final kanji in uniqueKanji) {
      final key = SrsEngine.encodeKey(null, kanji['Id'] as int);
      if (existingKeys.contains(key)) continue;
      inserts.add({
        'UserId': context.userId,
        'VocabularyId': null,
        'KanjiId': kanji['Id'],
        'BoxLevel': 0,
        'EaseFactor': 2.5,
        'IntervalDays': 0,
        'Repetitions': 0,
        'NextReviewDate': now,
      });
      existingKeys.add(key);
    }

    if (inserts.isEmpty) return;
    await client.dio.post(client.table('SRSCards'), data: inserts);
  }

  FolderSrsOverview _buildSrsOverview(_SrsContext context) {
    final cards = _mapSrsCards(context);
    final total = cards.length;
    final newCards = cards.where((c) => c.boxLevel == 0).length;
    final dueCards = cards.where((c) => c.boxLevel > 0 && c.isDue).length;
    final masteredCards = cards.where((c) => c.boxLevel >= 7).length;

    final future = cards.where((c) => !c.isDue && c.nextReviewDate.isNotEmpty).toList()
      ..sort((a, b) => a.nextReviewDate.compareTo(b.nextReviewDate));

    return FolderSrsOverview(
      folderId: context.folderId,
      folderName: context.folderName,
      totalCards: total,
      newCards: newCards,
      dueCards: dueCards,
      learnedCards: total - newCards,
      masteredCards: masteredCards,
      nextDueAt: future.isNotEmpty ? future.first.nextReviewDate : null,
      canSwitchFolder: newCards == 0,
    );
  }

  List<SRSCardDto> _mapSrsCards(_SrsContext context) {
    final vocabMap = {for (final v in context.vocabs) v['Id'] as int: v};
    final kanjiMap = <int, Map<String, dynamic>>{};
    for (final item in _uniqueKanji(context.kanjiComponents)) {
      kanjiMap[item['Id'] as int] = item;
    }

    final nowMs = DateTime.now().millisecondsSinceEpoch;
    final result = <SRSCardDto>[];

    for (final row in context.cards) {
      final vId = row['VocabularyId'] as int?;
      final kId = row['KanjiId'] as int?;
      final vocab = vId != null ? vocabMap[vId] : null;
      final kanji = kId != null ? kanjiMap[kId] : null;
      final boxLevel = SrsEngine.normalizeLevel(row['BoxLevel'] as int?);
      final nextReviewDate = (row['NextReviewDate'] as String?) ?? DateTime.now().toIso8601String();
      final isDue = DateTime.parse(nextReviewDate).millisecondsSinceEpoch <= nowMs || boxLevel == 0;

      if (vocab == null && kanji == null) continue;

      result.add(SRSCardDto(
        id: row['Id'] as int,
        userId: row['UserId'] as int,
        folderId: context.folderId,
        type: vId != null ? SrsItemType.vocabulary : SrsItemType.kanji,
        vocabularyId: vId,
        kanjiId: kId,
        word: vocab?['Word'] as String? ?? kanji?['Character'] as String? ?? '',
        pronunciation: vocab?['Pronunciation'] as String?,
        meaning: vocab?['Meaning'] as String? ?? kanji?['Meaning'] as String? ?? '',
        character: kanji?['Character'] as String?,
        amHanViet: kanji?['AmHanViet'] as String?,
        onyomi: kanji?['Onyomi'] as String?,
        kunyomi: kanji?['Kunyomi'] as String?,
        strokeCount: kanji?['StrokeCount'] as int?,
        boxLevel: boxLevel,
        nextReviewDate: nextReviewDate,
        isDue: isDue,
        isNew: boxLevel == 0,
      ));
    }

    result.sort((a, b) {
      final aLevelBias = a.boxLevel == 0 ? 0 : 1000 + a.boxLevel * 100;
      final bLevelBias = b.boxLevel == 0 ? 0 : 1000 + b.boxLevel * 100;
      final aDueBias = (DateTime.tryParse(a.nextReviewDate)?.millisecondsSinceEpoch ?? 0) ~/ 1000000;
      final bDueBias = (DateTime.tryParse(b.nextReviewDate)?.millisecondsSinceEpoch ?? 0) ~/ 1000000;
      return (aLevelBias + aDueBias).compareTo(bLevelBias + bDueBias);
    });

    return result;
  }

  Future<void> _updateSrsCardProgress(int cardId, {required bool correct, required bool isFlashcard}) async {
    final userId = await getCurrentUserId();

    final cardRes = await client.dio.get(
      client.table('SRSCards'),
      queryParameters: {
        'select': SupabaseConfig.srsCardSelect,
        'Id': 'eq.$cardId',
        'UserId': 'eq.$userId',
      },
    );
    final cardData = cardRes.data as List<dynamic>;
    if (cardData.isEmpty) throw Exception('Không tìm thấy thẻ SRS');
    final row = cardData[0] as Map<String, dynamic>;

    final currentLevel = SrsEngine.normalizeLevel(row['BoxLevel'] as int?);
    final nextLevel = isFlashcard ? 1 : SrsEngine.resolveNextLevel(currentLevel, correct);
    final nextReviewDate = SrsEngine.computeNextReviewDate(nextLevel);

    final patch = <String, dynamic>{
      'BoxLevel': nextLevel,
      'EaseFactor': 2.5,
      'IntervalDays': SrsEngine.intervalDays(nextLevel),
      'Repetitions': SrsEngine.resolveReps(currentLevel, nextLevel, correct),
      'NextReviewDate': nextReviewDate,
    };

    await client.dio.patch(
      client.table('SRSCards'),
      data: patch,
      queryParameters: {'Id': 'eq.$cardId'},
    );
  }

  List<Map<String, dynamic>> _uniqueKanji(List<Map<String, dynamic>> components) {
    final map = <int, Map<String, dynamic>>{};
    for (final comp in components) {
      final kanji = comp['Kanji'] as Map<String, dynamic>?;
      if (kanji != null) {
        map[kanji['Id'] as int] = kanji;
      }
    }
    return map.values.toList();
  }

  // ── Quizzes ──────────────────────────────────────────────────────────────────

  Future<List<QuizMeta>> getPublicQuizzes() async {
    final response = await client.dio.get(
      client.table('Quizzes'),
      queryParameters: {
        'select': SupabaseConfig.quizMetaSelect,
        'order': 'CreatedAt.desc',
        'limit': '50',
      },
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => QuizMeta.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<List<QuizMeta>> getMyQuizzes() async {
    final userId = await getCurrentUserId();
    final response = await client.dio.get(
      client.table('Quizzes'),
      queryParameters: {
        'select': 'Id, Title, Description, TimeLimitInSeconds, CreatedAt',
        'CreatorId': 'eq.$userId',
        'order': 'CreatedAt.desc',
      },
    );
    final data = response.data as List<dynamic>;
    return data.map((r) => QuizMeta.fromJson(r as Map<String, dynamic>)).toList();
  }

  Future<QuizMeta> createQuiz({
    required String title,
    String? description,
    int? timeLimit,
    required List<String> modes,
    required List<int> vocabIds,
    required List<int> kanjiIds,
  }) async {
    final userId = await getCurrentUserId();
    final desc = QuizDescription(
      modes: modes,
      userDescription: description,
      vocabIds: vocabIds,
      kanjiIds: kanjiIds,
    );

    final response = await client.dio.post(
      client.table('Quizzes'),
      data: {
        'CreatorId': userId,
        'Title': title,
        'Description': jsonEncode(desc.toJson()),
        'TimeLimitInSeconds': timeLimit ?? 0,
      },
    );
    return QuizMeta.fromJson(response.data as Map<String, dynamic>);
  }

  Future<QuizMeta> getQuiz(int quizId) async {
    final response = await client.dio.get(
      client.table('Quizzes'),
      queryParameters: {
        'select': SupabaseConfig.quizMetaSelect,
        'Id': 'eq.$quizId',
      },
    );
    final data = response.data as List<dynamic>;
    if (data.isEmpty) throw Exception('Không tìm thấy bài quiz');
    return QuizMeta.fromJson(data[0] as Map<String, dynamic>);
  }

  Future<List<QuizQuestion>> generateQuizQuestions(QuizMeta quiz) async {
    final rng = Random();
    final questions = <QuizQuestion>[];
    final allModes = quiz.description.modes;
    final vocabModes = allModes.where((m) => QuizMode.vocabModes.any((vm) => vm.code == m)).toList();
    final kanjiModes = allModes.where((m) => QuizMode.kanjiModes.any((km) => km.code == m)).toList();

    List<VocabularyDto> vocabs = [];
    if (quiz.description.vocabIds.isNotEmpty) {
      final idsStr = quiz.description.vocabIds.join(',');
      final vocabRes = await client.dio.get(
        client.table('Vocabularies'),
        queryParameters: {'select': 'Id, Word, Pronunciation, Meaning', 'Id': 'in.($idsStr)'},
      );
      vocabs = (vocabRes.data as List<dynamic>).map((r) => VocabularyDto.fromJson(r as Map<String, dynamic>)).toList();
    }

    List<KanjiDetailDto> kanjis = [];
    if (quiz.description.kanjiIds.isNotEmpty) {
      final idsStr = quiz.description.kanjiIds.join(',');
      final kanjiRes = await client.dio.get(
        client.table('Kanji'),
        queryParameters: {'select': 'Id, Character, AmHanViet, Meaning, Onyomi, Kunyomi', 'Id': 'in.($idsStr)'},
      );
      kanjis = (kanjiRes.data as List<dynamic>).map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>)).toList();
    }

    List<String> wrongPool = [];
    if (kanjis.isNotEmpty) {
      try {
        final poolRes = await client.dio.get(
          client.table('Kanji'),
          queryParameters: {'select': 'Meaning, AmHanViet', 'limit': '500'},
        );
        wrongPool = (poolRes.data as List<dynamic>).map((r) {
          final map = r as Map<String, dynamic>;
          return '${map['Meaning'] ?? ''} (${map['AmHanViet'] ?? ''})';
        }).toList();
      } catch (_) {}
    }

    for (final vocab in vocabs) {
      if (vocabModes.isEmpty) continue;
      final mode = vocabModes[rng.nextInt(vocabModes.length)];
      if (mode == 'MEAN_FROM_WORD') {
        final wrongs = _generateWrongOptions(vocab.meaning, wrongPool, vocabs.map((v) => v.meaning).toList(), rng);
        questions.add(QuizQuestion(
          id: vocab.id,
          questionText: 'Nghĩa của "${vocab.word}" là gì?',
          options: ([vocab.meaning, ...wrongs]..shuffle(rng)),
          correctAnswer: vocab.meaning,
          type: QuestionType.mcq,
        ));
      } else if (mode == 'WORD_FROM_MEAN') {
        final wrongs = _generateWrongOptions(vocab.word, wrongPool, vocabs.map((v) => v.word).toList(), rng);
        questions.add(QuizQuestion(
          id: vocab.id,
          questionText: 'Từ nào có nghĩa là "${vocab.meaning}"?',
          options: ([vocab.word, ...wrongs]..shuffle(rng)),
          correctAnswer: vocab.word,
          type: QuestionType.mcq,
        ));
      } else if (mode == 'FILL_BLANK') {
        questions.add(QuizQuestion(
          id: vocab.id,
          questionText: 'Viết nghĩa của từ "${vocab.word}" (${vocab.pronunciation ?? ''}):',
          options: [vocab.meaning],
          correctAnswer: vocab.meaning,
          type: QuestionType.fill,
        ));
      }
    }

    for (final kanji in kanjis) {
      if (kanjiModes.isEmpty) continue;
      final mode = kanjiModes[rng.nextInt(kanjiModes.length)];
      if (mode == 'HAN_VIET') {
        final wrongs = _generateWrongOptions(kanji.amHanViet, wrongPool, kanjis.map((k) => k.amHanViet).toList(), rng);
        questions.add(QuizQuestion(
          id: kanji.id,
          questionText: 'Âm Hán Việt của "${kanji.character}" là gì?',
          options: ([kanji.amHanViet, ...wrongs]..shuffle(rng)),
          correctAnswer: kanji.amHanViet,
          type: QuestionType.mcq,
        ));
      } else if (mode == 'ON_KUN_READ') {
        final readings = [kanji.onyomi ?? '', kanji.kunyomi ?? '']..removeWhere((e) => e.isEmpty);
        final reading = readings.isNotEmpty ? readings.first : kanji.amHanViet;
        questions.add(QuizQuestion(
          id: kanji.id,
          questionText: 'Cách đọc của "${kanji.character}" là gì?',
          options: [reading],
          correctAnswer: reading,
          type: QuestionType.fill,
        ));
      } else if (mode == 'COMPOSE_KANJI') {
        questions.add(QuizQuestion(
          id: kanji.id,
          questionText: 'Chữ Kanji nào có nghĩa "${kanji.meaning}" (Âm Hán Việt: ${kanji.amHanViet})?',
          options: [kanji.character],
          correctAnswer: kanji.character,
          type: QuestionType.fill,
        ));
      }
    }

    return questions;
  }

  Future<void> saveQuizAttempt(QuizAttempt attempt) async {
    await client.dio.post(client.table('QuizAttempts'), data: attempt.toJson());
  }

  List<String> _generateWrongOptions(String correct, List<String> pool, List<String> itemMeanings, Random rng) {
    final candidates = <String>{};
    for (final p in pool) {
      if (candidates.length >= 3) break;
      if (p != correct) candidates.add(p);
    }
    for (final m in itemMeanings) {
      if (candidates.length >= 3) break;
      if (m != correct) candidates.add(m);
    }
    return candidates.take(3).toList();
  }

  // ── Dashboard / Stats ────────────────────────────────────────────────────────

  Future<UserStats> loadUserStats(int userId) async {
    final results = await Future.wait([
      _fetchStreak(userId),
      _fetchXP(userId),
      _fetchSrsDue(userId),
    ]);
    return UserStats(streak: results[0], totalXP: results[1], srsCardsDue: results[2]);
  }

  Future<List<DashboardFolder>> loadDashboardFolders(int userId) async {
    try {
      final response = await client.dio.get(
        client.table('VocabularyFolder'),
        queryParameters: {
          'select': 'Id, FolderName',
          'UserId': 'eq.$userId',
          'order': 'CreatedAt.desc',
          'limit': '4',
        },
      );
      final data = response.data as List<dynamic>;
      if (data.isEmpty) return [];

      final folders = <DashboardFolder>[];
      for (final f in data) {
        final map = f as Map<String, dynamic>;
        final folderId = map['Id'] as int;
        final countResponse = await client.dio.get(
          client.table('Vocabularies'),
          queryParameters: {
            'select': 'Id',
            'FolderId': 'eq.$folderId',
            'head': 'true',
            'count': 'exact',
          },
        );
        final countStr = countResponse.headers.value('content-range') ?? '0/0';
        final count = int.tryParse(countStr.split('/').last) ?? 0;
        folders.add(DashboardFolder(id: folderId, name: map['FolderName'] as String, vocabCount: count));
      }
      return folders;
    } catch (_) {
      return [];
    }
  }

  Future<List<DashboardQuiz>> loadDashboardQuizzes(int userId) async {
    try {
      final response = await client.dio.get(
        client.table('Quizzes'),
        queryParameters: {
          'select': 'Id, Title, CreatedAt',
          'CreatorId': 'eq.$userId',
          'order': 'CreatedAt.desc',
          'limit': '4',
        },
      );
      final data = response.data as List<dynamic>;
      if (data.isEmpty) return [];

      final quizzes = <DashboardQuiz>[];
      for (final q in data) {
        final map = q as Map<String, dynamic>;
        final quizId = map['Id'] as int;
        try {
          final attemptResponse = await client.dio.get(
            client.table('QuizAttempts'),
            queryParameters: {
              'select': 'AccuracyPercentage, CreatedAt',
              'QuizId': 'eq.$quizId',
              'UserId': 'eq.$userId',
              'order': 'CreatedAt.desc',
              'limit': '1',
            },
          );
          final attemptData = attemptResponse.data as List<dynamic>;
          final lastAttempt = attemptData.isNotEmpty ? attemptData[0] as Map<String, dynamic> : null;
          quizzes.add(DashboardQuiz(
            id: quizId,
            title: map['Title'] as String,
            lastAccuracy: lastAttempt?['AccuracyPercentage'] as double?,
            lastAttemptDate: lastAttempt?['CreatedAt'] as String?,
          ));
        } catch (_) {
          quizzes.add(DashboardQuiz(id: quizId, title: map['Title'] as String));
        }
      }
      return quizzes;
    } catch (_) {
      return [];
    }
  }

  Future<List<LeaderboardItem>> loadLeaderboard() async {
    try {
      final response = await client.dio.get(
        client.table('QuizAttempts'),
        queryParameters: {
          'select': 'UserId, AccuracyPercentage, CorrectAnswersCount, Users:UserId(Username, FullName)',
          'order': 'CreatedAt.desc',
          'limit': '200',
        },
      );
      final data = response.data as List<dynamic>;
      if (data.isEmpty) return [];

      final userMap = <int, _UserAgg>{};
      for (final row in data) {
        final map = row as Map<String, dynamic>;
        final userId = map['UserId'] as int;
        final usersRaw = map['Users'];
        final users = usersRaw is List
            ? (usersRaw.isNotEmpty ? usersRaw[0] as Map<String, dynamic> : null)
            : usersRaw as Map<String, dynamic>?;
        final name = (users?['FullName'] as String? ?? users?['Username'] as String? ?? 'Ẩn danh');
        final accuracy = (map['AccuracyPercentage'] ?? 0.0) as double;
        final correct = (map['CorrectAnswersCount'] ?? 0) as int;

        userMap.putIfAbsent(userId, () => _UserAgg(name: name));
        final agg = userMap[userId]!;
        agg.quizCount++;
        agg.totalAccuracy += accuracy;
        agg.totalCorrect += correct;
      }

      final sorted = userMap.entries
          .map((e) => _LeaderboardCalc(
                name: e.value.name,
                accuracy: e.value.quizCount > 0 ? (e.value.totalAccuracy / e.value.quizCount) : 0.0,
                quizCount: e.value.quizCount,
                correctAnswers: e.value.totalCorrect,
              ))
          .toList()
        ..sort((a, b) {
          final cmp = b.accuracy.compareTo(a.accuracy);
          return cmp != 0 ? cmp : b.quizCount.compareTo(a.quizCount);
        });

      return sorted
          .take(5)
          .toList()
          .asMap()
          .entries
          .map((e) => LeaderboardItem(
                rank: e.key + 1,
                name: e.value.name,
                accuracy: e.value.accuracy,
                quizCount: e.value.quizCount,
                correctAnswers: e.value.correctAnswers,
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<int>> loadWeekChart(int userId) async {
    try {
      final sevenDaysAgo = DateTime.now().subtract(const Duration(days: 6));
      final response = await client.dio.get(
        client.table('QuizAttempts'),
        queryParameters: {
          'select': 'CreatedAt',
          'UserId': 'eq.$userId',
          'CreatedAt': 'gte.${sevenDaysAgo.toIso8601String()}',
        },
      );
      final data = response.data as List<dynamic>;
      if (data.isEmpty) return [0, 0, 0, 0, 0, 0, 0];

      final counts = [0, 0, 0, 0, 0, 0, 0];
      final today = DateTime.now();
      for (final row in data) {
        final date = DateTime.parse((row as Map<String, dynamic>)['CreatedAt'] as String);
        final diff = today.difference(date).inDays;
        final idx = 6 - diff;
        if (idx >= 0 && idx < 7) counts[idx]++;
      }
      return counts;
    } catch (_) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
  }

  Future<int> _fetchStreak(int userId) async {
    try {
      final response = await client.dio.get(
        client.table('QuizAttempts'),
        queryParameters: {
          'select': 'CreatedAt',
          'UserId': 'eq.$userId',
          'order': 'CreatedAt.desc',
        },
      );
      final data = response.data as List<dynamic>;
      if (data.isEmpty) return 0;

      final dates = <String>{};
      for (final row in data) {
        final date = DateTime.parse((row as Map<String, dynamic>)['CreatedAt'] as String);
        dates.add(_formatDate(date));
      }

      final prefs = await SharedPreferences.getInstance();
      final storageKey = '${AppConstants.activeDatesPrefix}$userId';
      final stored = prefs.getStringList(storageKey) ?? [];
      final todayStr = _formatDate(DateTime.now());
      if (!stored.contains(todayStr)) {
        stored.add(todayStr);
        await prefs.setStringList(storageKey, stored);
      }
      for (final d in stored) {
        dates.add(d);
      }

      int count = 0;
      final today = DateTime.now();
      for (int i = 0; i < 365; i++) {
        final d = today.subtract(Duration(days: i));
        final key = _formatDate(d);
        if (i == 0 && !dates.contains(key)) continue;
        if (dates.contains(key)) {
          count++;
        } else {
          break;
        }
      }
      return count;
    } catch (_) {
      return 0;
    }
  }

  Future<int> _fetchXP(int userId) async {
    try {
      final response = await client.dio.get(
        client.table('QuizAttempts'),
        queryParameters: {'select': 'CorrectAnswersCount', 'UserId': 'eq.$userId'},
      );
      final data = response.data as List<dynamic>;
      return data.fold<int>(
          0, (sum, row) => sum + (((row as Map<String, dynamic>)['CorrectAnswersCount'] ?? 0) as int) * 10);
    } catch (_) {
      return 0;
    }
  }

  Future<int> _fetchSrsDue(int userId) async {
    try {
      final now = DateTime.now().toIso8601String();
      final response = await client.dio.get(
        client.table('SRSCards'),
        queryParameters: {
          'select': 'Id',
          'UserId': 'eq.$userId',
          'or': 'NextReviewDate.lte.$now,BoxLevel.eq.0',
          'head': 'true',
          'count': 'exact',
        },
      );
      final range = response.headers.value('content-range') ?? '0/0';
      return int.tryParse(range.split('/').last) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  String _formatDate(DateTime dt) =>
      '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';

  // ── Shared helpers ───────────────────────────────────────────────────────────

  String _normalize(String value) => value.trim().toLowerCase().replaceAll('*', '').replaceAll('%', '');
}

class _SrsContext {
  final int folderId;
  final String folderName;
  final int userId;
  final List<Map<String, dynamic>> vocabs;
  final List<Map<String, dynamic>> kanjiComponents;
  final List<Map<String, dynamic>> cards;

  _SrsContext({
    required this.folderId,
    required this.folderName,
    required this.userId,
    required this.vocabs,
    required this.kanjiComponents,
    required this.cards,
  });
}

class _UserAgg {
  final String name;
  int quizCount = 0;
  double totalAccuracy = 0.0;
  int totalCorrect = 0;

  _UserAgg({required this.name});
}

class _LeaderboardCalc {
  final String name;
  final double accuracy;
  final int quizCount;
  final int correctAnswers;

  _LeaderboardCalc({
    required this.name,
    required this.accuracy,
    required this.quizCount,
    required this.correctAnswers,
  });
}
