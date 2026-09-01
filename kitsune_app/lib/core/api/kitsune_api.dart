// kitsune_app/lib/core/api/kitsune_api.dart

import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart' show Options, RequestOptions, Response;
import 'package:kitsune_app/core/constants/app_constants.dart';
import 'package:kitsune_app/core/constants/supabase_config.dart';
import 'package:kitsune_app/core/models/dashboard.dart';
import 'package:kitsune_app/core/models/exam.dart';
import 'package:kitsune_app/core/models/folder.dart';
import 'package:kitsune_app/core/models/grammar.dart';
import 'package:kitsune_app/core/models/kanji.dart';
import 'package:kitsune_app/core/models/learning_knowledge.dart';
import 'package:kitsune_app/core/models/quiz.dart';
import 'package:kitsune_app/core/models/srs.dart';
import 'package:kitsune_app/core/models/user.dart';
import 'package:kitsune_app/core/models/vocabulary.dart';
import 'package:kitsune_app/core/network/supabase_client.dart';
import 'package:kitsune_app/core/srs/srs_engine.dart';
import 'package:kitsune_app/core/models/topic.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Single entry point for every Supabase REST/Storage/Auth call the app makes.
/// Replaces the previous per-feature `*_repository.dart` files.
class KitsuneApi {
  static const _lessonSrsCacheVersion = 1;
  static const _lessonSrsCachePrefix = 'kitsune.srs.lessonSession.';
  static const _globalSrsId = 0;
  static const _globalSrsName = 'SRS chung';
  static const _knowledgeQueuePrefix = 'kitsune.knowledge.pending.v2.';

  final SupabaseClient client;
  UserProfile? _currentUser;
  Future<void>? _knowledgeFlush;

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

    final createdUser =
        UserProfile.fromJson(createResponse.data as Map<String, dynamic>);

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

  Future<UserProfile> updateProfile(
      {String? fullName, String? avatarUrl}) async {
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
    return data
        .map((r) => FolderDto.fromJson(r as Map<String, dynamic>))
        .toList();
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
    final response =
        await client.dio.post(client.table('VocabularyFolder'), data: {
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
    await client.dio.delete(client.table('VocabularyFolder'),
        queryParameters: {'Id': 'eq.$id'});
  }

  Future<void> addVocabularyCopy(
    int folderId,
    String word,
    String? pronunciation,
    String meaning,
    int languageId, {
    int? kanjiId,
  }) async {
    await _ensureNoFolderDuplicate(
      folderId,
      word,
      isKanji: kanjiId != null,
      kanjiId: kanjiId,
    );
    final response = await client.dio.post(client.table('Vocabularies'), data: {
      'FolderId': folderId,
      'LanguageId': languageId,
      'Word': word,
      'Pronunciation': pronunciation,
      'Meaning': meaning,
      'SpecificData': kanjiId != null
          ? {'_kitsuneItemType': 'kanji', '_kanjiId': kanjiId}
          : {'_kitsuneItemType': 'vocabulary'},
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
    await _ensureNoFolderDuplicate(folderId, word, isKanji: false);
    final response = await client.dio.post(client.table('Vocabularies'), data: {
      'FolderId': folderId,
      'LanguageId': languageId,
      'Word': word,
      'Pronunciation': pronunciation,
      'Meaning': meaning,
      'SpecificData': {'_kitsuneItemType': 'vocabulary'},
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

  Future<void> _ensureNoFolderDuplicate(
    int folderId,
    String word, {
    required bool isKanji,
    int? kanjiId,
  }) async {
    final response = await client.dio.get(
      client.table('Vocabularies'),
      queryParameters: {
        'select': 'Id,Word,SpecificData,KanjiComponents(KanjiId)',
        'FolderId': 'eq.$folderId',
        'Word': 'eq.$word',
      },
    );
    final rows = response.data as List<dynamic>;
    final duplicate = rows.any((raw) {
      final row = raw as Map<String, dynamic>;
      final specificData = row['SpecificData'] as Map<String, dynamic>?;
      final storedType = specificData?['_kitsuneItemType'];

      if (storedType == 'kanji') {
        return isKanji &&
            (kanjiId == null || specificData?['_kanjiId'] == kanjiId);
      }
      if (storedType == 'vocabulary' || specificData != null) {
        return !isKanji;
      }

      final components = (row['KanjiComponents'] as List<dynamic>?) ?? [];
      final isLegacyKanji = word.trim().runes.length == 1 &&
          components.length == 1 &&
          (components.first as Map<String, dynamic>)['KanjiId'] != null;
      if (isLegacyKanji) {
        final storedKanjiId =
            (components.first as Map<String, dynamic>)['KanjiId'] as int?;
        return isKanji && (kanjiId == null || storedKanjiId == kanjiId);
      }
      return !isKanji;
    });

    if (duplicate) {
      throw Exception(
        isKanji
            ? 'Kanji này đã có trong thư mục!'
            : 'Từ vựng này đã có trong thư mục!',
      );
    }
  }

  Future<void> removeVocabulary(int vocabularyId) async {
    await client.dio.delete(client.table('Vocabularies'),
        queryParameters: {'Id': 'eq.$vocabularyId'});
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
    return data
        .map((r) => VocabularyDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  // ── Vocabulary ───────────────────────────────────────────────────────────────

  Future<List<VocabularyDto>> searchVocabulary(String query,
      {int? limit = 30}) async {
    final normalizedQuery = _normalize(query);
    if (normalizedQuery.isEmpty) {
      return _fetchVocabByParams(
        queryParameters: {if (limit != null) 'limit': '$limit'},
      );
    }

    final candidateLimit =
        limit == null ? 100 : (limit * 4 > 100 ? limit * 4 : 100);

    final exactResponses = await Future.wait([
      _fetchVocabByParams(queryParameters: {
        'Word': 'ilike.$normalizedQuery',
        'limit': '$candidateLimit',
      }),
      _fetchVocabByParams(queryParameters: {
        'Meaning': 'ilike.$normalizedQuery',
        'limit': '$candidateLimit',
      }),
      _fetchVocabByParams(queryParameters: {
        'Pronunciation': 'ilike.$normalizedQuery',
        'limit': '$candidateLimit',
      }),
    ]);

    final containsResponses = await Future.wait([
      _fetchVocabByParams(queryParameters: {
        'Word': 'ilike.*$normalizedQuery*',
        'limit': '$candidateLimit',
      }),
      _fetchVocabByParams(queryParameters: {
        'Meaning': 'ilike.*$normalizedQuery*',
        'limit': '$candidateLimit',
      }),
      _fetchVocabByParams(queryParameters: {
        'Pronunciation': 'ilike.*$normalizedQuery*',
        'limit': '$candidateLimit',
      }),
    ]);

    final merged = <int, VocabularyDto>{};
    for (final items in [...exactResponses, ...containsResponses]) {
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
        final lengthCompare = a.key.word.length.compareTo(b.key.word.length);
        if (lengthCompare != 0) return lengthCompare;
        return a.key.id.compareTo(b.key.id);
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
    final items =
        await _fetchVocabByParams(queryParameters: {'limit': '$limit'});
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
      await client.dio.delete(client.table('VocabularyBookmarks'),
          queryParameters: {'Id': 'eq.$id'});
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
      'IntervalDays': SrsEngine.intervalDays(1),
      'Repetitions': 0,
      'NextReviewDate': SrsEngine.computeNextReviewDate(1),
    });
  }

  Future<List<VocabularyDto>> _fetchVocabByParams(
      {required Map<String, String> queryParameters}) async {
    final response = await client.dio.get(
      client.table('Vocabularies'),
      queryParameters: {
        'select': SupabaseConfig.vocabSelect,
        ...queryParameters
      },
    );
    final data = response.data as List<dynamic>;
    return data
        .map((r) => VocabularyDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  int _scoreVocab(VocabularyDto item, String query) {
    final fields = <MapEntry<String, int>>[
      MapEntry(item.word, 500),
      MapEntry(item.pronunciation ?? '', 400),
      MapEntry(item.meaning, 300),
      MapEntry(_specificDataText(item, 'amHanViet'), 250),
      MapEntry(_specificDataText(item, 'kanji'), 200),
      MapEntry(_specificDataText(item, 'exampleMeaning'), 120),
      MapEntry(_specificDataText(item, 'exampleSentence'), 100),
      ...item.kanjiComponents.expand((component) => [
            MapEntry(component.character, 180),
            MapEntry(component.amHanViet, 160),
          ]),
    ];

    var bestScore = 0;
    for (final field in fields) {
      final value = _normalize(field.key);
      if (value.isEmpty) continue;
      if (value == query) {
        final score = 3000 + field.value;
        if (score > bestScore) bestScore = score;
        continue;
      }

      final index = value.indexOf(query);
      if (index < 0) continue;
      final tier = index == 0 ? 2000 : 1000;
      final positionPenalty = index > 100 ? 100 : index;
      final score = tier + field.value - positionPenalty;
      if (score > bestScore) bestScore = score;
    }
    return bestScore;
  }

  String _specificDataText(VocabularyDto item, String key) {
    final value = item.specificData?[key];
    return value is String ? value : '';
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
      queryParameters: {
        'select': SupabaseConfig.kanjiSelect,
        'limit': '$limit'
      },
    );
    final data = (response.data as List<dynamic>)..shuffle();
    return data
        .map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<List<KanjiDetailDto>> getFirstKanji({int limit = 40}) async {
    final response = await client.dio.get(
      client.table('Kanji'),
      queryParameters: {
        'select': SupabaseConfig.kanjiSelect,
        'limit': '$limit'
      },
    );
    final data = response.data as List<dynamic>;
    return data
        .map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>))
        .toList();
  }

  Future<List<KanjiDetailDto>> _fetchKanjiByParams(
      {required Map<String, String> queryParameters}) async {
    final response = await client.dio.get(
      client.table('Kanji'),
      queryParameters: {
        'select': SupabaseConfig.kanjiSelect,
        ...queryParameters
      },
    );
    final data = response.data as List<dynamic>;
    return data
        .map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>))
        .toList();
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

  Future<int?> getActiveLessonId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('kitsune.srs.activeLessonId');
  }

  Future<void> setActiveLessonId(int? lessonId) async {
    final prefs = await SharedPreferences.getInstance();
    if (lessonId == null) {
      await prefs.remove('kitsune.srs.activeLessonId');
    } else {
      await prefs.setInt('kitsune.srs.activeLessonId', lessonId);
    }
  }

  Future<int?> getDailySrsGoal() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(
        '${AppConstants.dailySrsGoalPrefix}${_formatDate(DateTime.now())}');
  }

  Future<void> setDailySrsGoal(int goal) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(
      '${AppConstants.dailySrsGoalPrefix}${_formatDate(DateTime.now())}',
      goal.clamp(1, 10000),
    );
  }

  Future<FolderSrsSession?> getFolderSession({int? folderId}) async {
    final resolvedId = folderId ?? await getActiveFolderId();
    if (resolvedId == null) return null;

    final email = client.userEmail;
    if (email == null) return null;

    final userId = await getCurrentUserId();
    var context = await _loadSrsContext(resolvedId, userId);
    final insertedCards = await _ensureSrsCards(context);
    if (insertedCards) {
      context = await _loadSrsContext(resolvedId, userId);
    }
    final overview = _buildSrsOverview(context);
    final cards = _mapSrsCards(context);
    final flashcards = cards.where((c) => c.boxLevel == 0).toList();
    final quizCards = cards
        .where((card) => SrsEngine.isScheduledReviewDue(
              level: card.boxLevel,
              nextReviewDate: card.nextReviewDate,
            ))
        .toList();

    final session = FolderSrsSession(
      folderId: resolvedId,
      folderName: context.folderName,
      overview: overview,
      cards: cards,
      flashcards: flashcards,
      quizCards: quizCards,
    );
    return session;
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
    final session = await getFolderSession(folderId: folderId);
    if (session == null) {
      throw Exception('Không thể khởi tạo SRS cho thư mục này');
    }
    await setActiveFolderId(folderId);
    return session;
  }

  Future<SrsCardProgressUpdate> completeFlashcard(int cardId) {
    return _updateSrsCardProgress(cardId, correct: true, isFlashcard: true);
  }

  Future<SrsCardProgressUpdate> submitQuizAnswer(int cardId, bool correct) {
    return _updateSrsCardProgress(cardId, correct: correct, isFlashcard: false);
  }

  Future<_SrsContext> _loadLessonSrsContext(int lessonId, int userId) async {
    final responses = await Future.wait([
      client.dio.get(client.table('Lessons'), queryParameters: {
        'select': 'Id,Title',
        'Id': 'eq.$lessonId',
        'limit': '1',
      }),
      client.dio.get(client.table('LessonItems'), queryParameters: {
        'select': 'Id,VocabularyId,KanjiId',
        'LessonId': 'eq.$lessonId',
        'order': 'OrderIndex.asc',
      }),
      client.dio.get(client.table('UserLessonProgress'), queryParameters: {
        'select': 'CompletedItemCount',
        'UserId': 'eq.$userId',
        'LessonId': 'eq.$lessonId',
        'limit': '1',
      }),
    ]);
    final lessonRows = responses[0].data as List<dynamic>;
    if (lessonRows.isEmpty) throw Exception('Không tìm thấy bài học');
    final lesson = lessonRows.first as Map<String, dynamic>;
    final items =
        (responses[1].data as List<dynamic>).cast<Map<String, dynamic>>();
    final progressRows = responses[2].data as List<dynamic>;
    final completedItemCount = progressRows.isEmpty
        ? 0
        : (progressRows.first as Map<String, dynamic>)['CompletedItemCount']
                as num? ??
            0;
    final boundedCompletedCount =
        completedItemCount.toInt().clamp(0, items.length).toInt();
    final studiedItems = items.take(boundedCompletedCount).toList();
    final vocabularyIds = studiedItems
        .map((row) => (row['VocabularyId'] as num?)?.toInt())
        .whereType<int>()
        .toList();
    final kanjiIds = studiedItems
        .map((row) => (row['KanjiId'] as num?)?.toInt())
        .whereType<int>()
        .toList();

    final contentResponses = await Future.wait([
      vocabularyIds.isEmpty
          ? Future.value(
              Response(data: <dynamic>[], requestOptions: RequestOptions()))
          : client.dio.get(client.table('Vocabularies'), queryParameters: {
              'select': 'Id,Word,Pronunciation,Meaning,FolderId,SpecificData',
              'Id': 'in.(${vocabularyIds.join(',')})',
            }),
      kanjiIds.isEmpty
          ? Future.value(
              Response(data: <dynamic>[], requestOptions: RequestOptions()))
          : client.dio.get(client.table('Kanji'), queryParameters: {
              'select': SupabaseConfig.kanjiSelect,
              'Id': 'in.(${kanjiIds.join(',')})',
            }),
    ]);
    final vocabs = (contentResponses[0].data as List<dynamic>)
        .cast<Map<String, dynamic>>();
    final kanjiRows = (contentResponses[1].data as List<dynamic>)
        .cast<Map<String, dynamic>>();
    final components = kanjiRows
        .map((kanji) => <String, dynamic>{
              'VocabularyId': 0,
              'KanjiId': kanji['Id'],
              'Kanji': kanji,
            })
        .toList();
    final cards = await _loadFolderSrsCards(userId, vocabularyIds, kanjiIds);
    final cardIds = cards.map((row) => (row['Id'] as num).toInt()).toList();
    final details = await Future.wait([
      _loadKanjiExamples(kanjiIds),
      _loadTodayNewLearned(cardIds),
      _loadWrongReviewCounts(cardIds),
    ]);
    return _SrsContext(
      folderId: lessonId,
      folderName: lesson['Title'] as String,
      userId: userId,
      vocabs: vocabs,
      kanjiComponents: components,
      kanjiExamples: details[0] as Map<int, List<SrsVocabularyExample>>,
      todayNewLearned: details[1] as int,
      wrongReviewCounts: details[2] as Map<int, int>,
      cards: cards,
      lessonItems: studiedItems,
    );
  }

  Future<void> _linkLessonCards(int userId, List<Map<String, dynamic>> items,
      List<Map<String, dynamic>> cards) async {
    String key(int? vocabularyId, int? kanjiId) =>
        '${vocabularyId ?? 'v'}:${kanjiId ?? 'k'}';
    final cardByKey = <String, Map<String, dynamic>>{
      for (final card in cards)
        key((card['VocabularyId'] as num?)?.toInt(),
            (card['KanjiId'] as num?)?.toInt()): card,
    };
    final links = <Map<String, dynamic>>[];
    for (final item in items) {
      final card = cardByKey[key((item['VocabularyId'] as num?)?.toInt(),
          (item['KanjiId'] as num?)?.toInt())];
      if (card != null) {
        links.add({
          'UserId': userId,
          'CardId': card['Id'],
          'LessonItemId': item['Id']
        });
      }
    }
    if (links.isEmpty) return;
    await client.dio.post(
      client.table('SrsCardLessons'),
      queryParameters: {'on_conflict': 'UserId,LessonItemId'},
      options: Options(headers: {'Prefer': 'resolution=merge-duplicates'}),
      data: links,
    );
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
        'select': 'Id, Word, Pronunciation, Meaning, FolderId, SpecificData',
        'FolderId': 'eq.$folderId',
        'order': 'CreatedAt.asc',
      },
    );
    final allVocabs =
        (vocabRes.data as List<dynamic>).cast<Map<String, dynamic>>();

    final vocabIds = allVocabs.map((v) => v['Id'] as int).toList();
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
      kanjiComponents =
          (kcRes.data as List<dynamic>).cast<Map<String, dynamic>>();
    }

    final kanjiIds = _uniqueKanji(kanjiComponents)
        .map((kanji) => kanji['Id'] as int)
        .toList();
    final componentsByVocabulary = <int, List<Map<String, dynamic>>>{};
    for (final component in kanjiComponents) {
      final vocabularyId = component['VocabularyId'] as int;
      componentsByVocabulary.putIfAbsent(vocabularyId, () => []).add(component);
    }
    final vocabs = allVocabs
        .where((vocab) => !_isKanjiOnlyVocabulary(
              vocab,
              components:
                  componentsByVocabulary[vocab['Id'] as int] ?? const [],
            ))
        .toList();
    final kanjiExamples = await _loadKanjiExamples(kanjiIds);
    final visibleVocabIds = vocabs.map((vocab) => vocab['Id'] as int).toSet();
    final visibleKanjiIds = kanjiIds.toSet();
    final cards = await _loadFolderSrsCards(
      userId,
      visibleVocabIds.toList(),
      visibleKanjiIds.toList(),
    );
    final folderCardIds = cards.map((card) => card['Id'] as int).toList();
    final results = await Future.wait([
      _loadTodayNewLearned(folderCardIds),
      _loadWrongReviewCounts(folderCardIds),
    ]);
    final todayNewLearned = results[0] as int;
    final wrongReviewCounts = results[1] as Map<int, int>;

    return _SrsContext(
      folderId: folderId,
      folderName: folderName,
      userId: userId,
      vocabs: vocabs,
      kanjiComponents: kanjiComponents,
      kanjiExamples: kanjiExamples,
      todayNewLearned: todayNewLearned,
      wrongReviewCounts: wrongReviewCounts,
      cards: cards,
    );
  }

  Future<List<Map<String, dynamic>>> _loadFolderSrsCards(
    int userId,
    List<int> vocabularyIds,
    List<int> kanjiIds,
  ) async {
    if (vocabularyIds.isEmpty && kanjiIds.isEmpty) {
      return const <Map<String, dynamic>>[];
    }

    final query = <String, dynamic>{
      'select': SupabaseConfig.srsCardSelect,
      'UserId': 'eq.$userId',
    };
    if (vocabularyIds.isNotEmpty && kanjiIds.isNotEmpty) {
      query['or'] =
          '(VocabularyId.in.(${vocabularyIds.join(',')}),KanjiId.in.(${kanjiIds.join(',')}))';
    } else if (vocabularyIds.isNotEmpty) {
      query['VocabularyId'] = 'in.(${vocabularyIds.join(',')})';
    } else {
      query['KanjiId'] = 'in.(${kanjiIds.join(',')})';
    }

    final response = await client.dio.get(
      client.table('SRSCards'),
      queryParameters: query,
    );
    return (response.data as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<Map<int, int>> _loadWrongReviewCounts(List<int> cardIds) async {
    final counts = <int, int>{};
    if (cardIds.isEmpty) return counts;

    try {
      final response = await client.dio.get(
        client.table('SRSReviewLogs'),
        queryParameters: {
          'select': 'CardId,Rating,OldBoxLevel,NewBoxLevel',
          'CardId': 'in.(${cardIds.join(',')})',
        },
      );
      for (final raw in response.data as List<dynamic>) {
        final row = raw as Map<String, dynamic>;
        final rating = (row['Rating'] as num?)?.toInt() ?? 4;
        final oldLevel = (row['OldBoxLevel'] as num?)?.toInt() ?? 0;
        final newLevel = (row['NewBoxLevel'] as num?)?.toInt() ?? oldLevel;
        if (rating <= 2 || newLevel < oldLevel) {
          final cardId = (row['CardId'] as num).toInt();
          counts[cardId] = (counts[cardId] ?? 0) + 1;
        }
      }
    } catch (_) {
      // Drawing-mode weighting falls back to its baseline when logs are unavailable.
    }

    return counts;
  }

  Future<Map<int, List<SrsVocabularyExample>>> _loadKanjiExamples(
      List<int> kanjiIds) async {
    final result = <int, List<SrsVocabularyExample>>{};
    if (kanjiIds.isEmpty) return result;

    final response = await client.dio.get(
      client.table('KanjiComponents'),
      queryParameters: {
        'select':
            'KanjiId,VocabularyId,Vocabulary:VocabularyId(Id,Word,Pronunciation,Meaning,FolderId,SpecificData)',
        'KanjiId': 'in.(${kanjiIds.join(',')})',
        'order': 'VocabularyId.asc',
      },
    );

    for (final raw in response.data as List<dynamic>) {
      final row = raw as Map<String, dynamic>;
      final kanjiId = row['KanjiId'] as int;
      final vocabulary = row['Vocabulary'] as Map<String, dynamic>?;
      if (vocabulary == null || _isKanjiOnlyVocabulary(vocabulary)) continue;
      final current = result.putIfAbsent(kanjiId, () => []);
      final word = vocabulary['Word'] as String? ?? '';
      if (current.length >= 3 || current.any((item) => item.word == word))
        continue;
      current.add(SrsVocabularyExample(
        word: word,
        pronunciation: vocabulary['Pronunciation'] as String?,
        meaning: vocabulary['Meaning'] as String? ?? '',
      ));
    }
    return result;
  }

  Future<int> _loadTodayNewLearned(List<int> cardIds) async {
    final localIds = await _getLocalNewCardIds();
    if (cardIds.isEmpty) return localIds.length;
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day).toUtc();
    final end = start.add(const Duration(days: 1));

    try {
      final response = await client.dio.get(
        client.table('SRSReviewLogs'),
        queryParameters: {
          'select': 'CardId',
          'CardId': 'in.(${cardIds.join(',')})',
          'OldBoxLevel': 'eq.0',
          'ReviewedAt': 'gte.${start.toIso8601String()}',
          'and': '(ReviewedAt.lt.${end.toIso8601String()})',
        },
      );
      final databaseCount = (response.data as List<dynamic>)
          .map((row) => (row as Map<String, dynamic>)['CardId'] as int)
          .toSet()
          .length;
      return max(databaseCount, localIds.length);
    } catch (_) {
      return localIds.length;
    }
  }

  Future<Set<int>> _loadTodayNewLearnedCardIds(List<int> cardIds) async {
    final localIds = await _getLocalNewCardIds();
    if (cardIds.isEmpty) return localIds;
    final now = DateTime.now();
    final start = DateTime(now.year, now.month, now.day).toUtc();
    final end = start.add(const Duration(days: 1));
    try {
      final response = await client.dio.get(
        client.table('SRSReviewLogs'),
        queryParameters: {
          'select': 'CardId',
          'CardId': 'in.(${cardIds.join(',')})',
          'OldBoxLevel': 'eq.0',
          'ReviewedAt': 'gte.${start.toIso8601String()}',
          'and': '(ReviewedAt.lt.${end.toIso8601String()})',
        },
      );
      return {
        ...localIds,
        for (final row in response.data as List<dynamic>)
          ((row as Map<String, dynamic>)['CardId'] as num).toInt(),
      };
    } catch (_) {
      return localIds;
    }
  }

  Future<bool> _ensureSrsCards(_SrsContext context,
      {bool learned = false}) async {
    final existingKeys = <String>{};
    for (final card in context.cards) {
      existingKeys.add(SrsEngine.encodeKey(
          card['VocabularyId'] as int?, card['KanjiId'] as int?));
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
        'BoxLevel': learned ? 1 : 0,
        'EaseFactor': 2.5,
        'IntervalDays': learned ? 1 : 0,
        'Repetitions': learned ? 1 : 0,
        'NextReviewDate': now,
        'LastReviewedAt': learned ? now : null,
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
        'BoxLevel': learned ? 1 : 0,
        'EaseFactor': 2.5,
        'IntervalDays': learned ? 1 : 0,
        'Repetitions': learned ? 1 : 0,
        'NextReviewDate': now,
        'LastReviewedAt': learned ? now : null,
      });
      existingKeys.add(key);
    }

    if (inserts.isEmpty) return false;
    await client.dio.post(client.table('SRSCards'), data: inserts);
    return true;
  }

  Future<bool> _promoteStudiedLessonCards(_SrsContext context) async {
    final cardIds = context.cards
        .where((card) => (card['BoxLevel'] as num?)?.toInt() == 0)
        .map((card) => (card['Id'] as num).toInt())
        .toList();
    if (cardIds.isEmpty) return false;

    final now = DateTime.now().toUtc().toIso8601String();
    await client.dio.patch(
      client.table('SRSCards'),
      queryParameters: {
        'Id': 'in.(${cardIds.join(',')})',
        'UserId': 'eq.${context.userId}',
      },
      data: {
        'BoxLevel': 1,
        'EaseFactor': 2.5,
        'IntervalDays': 1,
        'Repetitions': 1,
        'NextReviewDate': now,
        'LastReviewedAt': now,
      },
    );
    return true;
  }

  bool _isKanjiOnlyVocabulary(
    Map<String, dynamic> vocab, {
    List<Map<String, dynamic>> components = const [],
  }) {
    final specificData = vocab['SpecificData'] as Map<String, dynamic>?;
    final itemType = specificData?['_kitsuneItemType'];
    if (itemType == 'kanji') return true;
    if (itemType == 'vocabulary' || specificData != null) return false;

    final word = (vocab['Word'] as String? ?? '').trim();
    if (word.runes.length != 1 || components.length != 1) return false;
    final kanji = components.first['Kanji'] as Map<String, dynamic>?;
    return kanji?['Character'] == word;
  }

  FolderSrsOverview _buildSrsOverview(_SrsContext context) {
    final cards = _mapSrsCards(context);
    final total = cards.length;
    final newCards = cards.where((c) => c.boxLevel == 0).length;
    final dueCards = cards
        .where((card) => SrsEngine.isScheduledReviewDue(
              level: card.boxLevel,
              nextReviewDate: card.nextReviewDate,
            ))
        .length;
    final masteredCards = cards.where((c) => c.boxLevel >= 7).length;

    final future = cards
        .where((card) =>
            card.boxLevel > 0 &&
            !SrsEngine.isScheduledReviewDue(
              level: card.boxLevel,
              nextReviewDate: card.nextReviewDate,
            ) &&
            card.nextReviewDate.isNotEmpty)
        .toList()
      ..sort((a, b) => a.nextReviewDate.compareTo(b.nextReviewDate));

    return FolderSrsOverview(
      folderId: context.folderId,
      folderName: context.folderName,
      totalCards: total,
      newCards: newCards,
      dueCards: dueCards,
      learnedCards: total - newCards,
      masteredCards: masteredCards,
      todayNewLearned: context.todayNewLearned,
      nextDueAt: future.isNotEmpty ? future.first.nextReviewDate : null,
      canSwitchFolder: true,
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
      final nextReviewDate = SrsEngine.effectiveNextReviewDate(
        level: boxLevel,
        storedNextReviewDate: row['NextReviewDate'] as String?,
        lastReviewedAt: row['LastReviewedAt'] as String?,
      );
      final isDue = boxLevel == 0 ||
          SrsEngine.isScheduledReviewDue(
            level: boxLevel,
            nextReviewDate: nextReviewDate,
            now: DateTime.fromMillisecondsSinceEpoch(nowMs),
          );

      if (vocab == null && kanji == null) continue;

      result.add(SRSCardDto(
        id: row['Id'] as int,
        userId: row['UserId'] as int,
        folderId: context.folderId,
        type: kId != null ? SrsItemType.kanji : SrsItemType.vocabulary,
        vocabularyId: vId,
        kanjiId: kId,
        word: kanji?['Character'] as String? ?? vocab?['Word'] as String? ?? '',
        pronunciation:
            kId == null ? (vocab?['Pronunciation'] as String?) : null,
        meaning:
            kanji?['Meaning'] as String? ?? vocab?['Meaning'] as String? ?? '',
        character: kanji?['Character'] as String?,
        amHanViet: kanji?['AmHanViet'] as String?,
        radicalCharacter: (kanji?['Radical']
            as Map<String, dynamic>?)?['RadicalCharacter'] as String?,
        radicalName: (kanji?['Radical']
            as Map<String, dynamic>?)?['RadicalName'] as String?,
        onyomi: kanji?['Onyomi'] as String?,
        kunyomi: kanji?['Kunyomi'] as String?,
        examples: kId != null
            ? (context.kanjiExamples[kId] ?? const <SrsVocabularyExample>[])
            : const <SrsVocabularyExample>[],
        strokeCount: kanji?['StrokeCount'] as int?,
        boxLevel: boxLevel,
        wrongReviewCount: context.wrongReviewCounts[row['Id'] as int] ?? 0,
        nextReviewDate: nextReviewDate,
        isDue: isDue,
        isNew: boxLevel == 0,
      ));
    }

    result.sort((a, b) {
      final aLevelBias = a.boxLevel == 0 ? 0 : 1000 + a.boxLevel * 100;
      final bLevelBias = b.boxLevel == 0 ? 0 : 1000 + b.boxLevel * 100;
      final aDueBias =
          (DateTime.tryParse(a.nextReviewDate)?.millisecondsSinceEpoch ?? 0) ~/
              1000000;
      final bDueBias =
          (DateTime.tryParse(b.nextReviewDate)?.millisecondsSinceEpoch ?? 0) ~/
              1000000;
      return (aLevelBias + aDueBias).compareTo(bLevelBias + bDueBias);
    });

    return result;
  }

  Future<SrsCardProgressUpdate> _updateSrsCardProgress(int cardId,
      {required bool correct, required bool isFlashcard}) async {
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
    final nextLevel =
        isFlashcard ? 1 : SrsEngine.resolveNextLevel(currentLevel, correct);
    final nextReviewDate = SrsEngine.computeNextReviewDate(nextLevel);

    final patch = <String, dynamic>{
      'BoxLevel': nextLevel,
      'EaseFactor': 2.5,
      'IntervalDays': SrsEngine.intervalDays(nextLevel),
      'Repetitions': SrsEngine.resolveReps(currentLevel, nextLevel, correct),
      'NextReviewDate': nextReviewDate,
      'LastReviewedAt': DateTime.now().toUtc().toIso8601String(),
    };

    await client.dio.patch(
      client.table('SRSCards'),
      data: patch,
      queryParameters: {'Id': 'eq.$cardId'},
    );

    try {
      await client.dio.post(
        client.table('SRSReviewLogs'),
        data: {
          'CardId': cardId,
          'Rating': isFlashcard || correct ? 3 : 1,
          'OldBoxLevel': currentLevel,
          'NewBoxLevel': nextLevel,
          'OldEaseFactor': (row['EaseFactor'] as num?)?.toDouble() ?? 2.5,
          'NewEaseFactor': 2.5,
          'ReviewedAt': DateTime.now().toUtc().toIso8601String(),
        },
      );
    } catch (_) {
      // Card scheduling remains usable when review-log RLS is not deployed yet.
    }
    if (isFlashcard) {
      await _recordLocalNewCard(cardId);
    }
    return SrsCardProgressUpdate(
      cardId: cardId,
      boxLevel: nextLevel,
      intervalDays: SrsEngine.intervalDays(nextLevel),
      nextReviewDate: nextReviewDate,
      wrongReviewCountDelta: correct || isFlashcard ? 0 : 1,
    );
  }

  Future<void> _recordLocalNewCard(int cardId) async {
    final prefs = await SharedPreferences.getInstance();
    final key =
        '${AppConstants.dailySrsLearnedPrefix}${_formatDate(DateTime.now())}';
    final values = (prefs.getStringList(key) ?? const <String>[]).toSet();
    values.add(cardId.toString());
    await prefs.setStringList(key, values.toList());
  }

  Future<Set<int>> _getLocalNewCardIds() async {
    final prefs = await SharedPreferences.getInstance();
    final key =
        '${AppConstants.dailySrsLearnedPrefix}${_formatDate(DateTime.now())}';
    return (prefs.getStringList(key) ?? const <String>[])
        .map(int.tryParse)
        .whereType<int>()
        .toSet();
  }

  List<Map<String, dynamic>> _uniqueKanji(
      List<Map<String, dynamic>> components) {
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
    return data
        .map((r) => QuizMeta.fromJson(r as Map<String, dynamic>))
        .toList();
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
    return data
        .map((r) => QuizMeta.fromJson(r as Map<String, dynamic>))
        .toList();
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
    final vocabModes = allModes
        .where((m) => QuizMode.vocabModes.any((vm) => vm.code == m))
        .toList();
    final kanjiModes = allModes
        .where((m) => QuizMode.kanjiModes.any((km) => km.code == m))
        .toList();

    List<VocabularyDto> vocabs = [];
    if (quiz.description.vocabIds.isNotEmpty) {
      final idsStr = quiz.description.vocabIds.join(',');
      final vocabRes = await client.dio.get(
        client.table('Vocabularies'),
        queryParameters: {
          'select': 'Id, Word, Pronunciation, Meaning',
          'Id': 'in.($idsStr)'
        },
      );
      vocabs = (vocabRes.data as List<dynamic>)
          .map((r) => VocabularyDto.fromJson(r as Map<String, dynamic>))
          .toList();
    }

    List<KanjiDetailDto> kanjis = [];
    if (quiz.description.kanjiIds.isNotEmpty) {
      final idsStr = quiz.description.kanjiIds.join(',');
      final kanjiRes = await client.dio.get(
        client.table('Kanji'),
        queryParameters: {
          'select': 'Id, Character, AmHanViet, Meaning, Onyomi, Kunyomi',
          'Id': 'in.($idsStr)'
        },
      );
      kanjis = (kanjiRes.data as List<dynamic>)
          .map((r) => KanjiDetailDto.fromJson(r as Map<String, dynamic>))
          .toList();
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
        final wrongs = _generateWrongOptions(vocab.meaning, wrongPool,
            vocabs.map((v) => v.meaning).toList(), rng);
        questions.add(QuizQuestion(
          id: vocab.id,
          questionText: 'Nghĩa của "${vocab.word}" là gì?',
          options: ([vocab.meaning, ...wrongs]..shuffle(rng)),
          correctAnswer: vocab.meaning,
          type: QuestionType.mcq,
        ));
      } else if (mode == 'WORD_FROM_MEAN') {
        final wrongs = _generateWrongOptions(
            vocab.word, wrongPool, vocabs.map((v) => v.word).toList(), rng);
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
          questionText:
              'Viết nghĩa của từ "${vocab.word}" (${vocab.pronunciation ?? ''}):',
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
        final wrongs = _generateWrongOptions(kanji.amHanViet, wrongPool,
            kanjis.map((k) => k.amHanViet).toList(), rng);
        questions.add(QuizQuestion(
          id: kanji.id,
          questionText: 'Âm Hán Việt của "${kanji.character}" là gì?',
          options: ([kanji.amHanViet, ...wrongs]..shuffle(rng)),
          correctAnswer: kanji.amHanViet,
          type: QuestionType.mcq,
        ));
      } else if (mode == 'ON_KUN_READ') {
        final readings = [kanji.onyomi ?? '', kanji.kunyomi ?? '']
          ..removeWhere((e) => e.isEmpty);
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
          questionText:
              'Chữ Kanji nào có nghĩa "${kanji.meaning}" (Âm Hán Việt: ${kanji.amHanViet})?',
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

  List<String> _generateWrongOptions(String correct, List<String> pool,
      List<String> itemMeanings, Random rng) {
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

  // ── Exams ─────────────────────────────────────────────────────────────────

  Future<List<ExamSummary>> listPublicExams(
      {String query = '', int? jlptLevel}) async {
    final parameters = <String, dynamic>{
      'select':
          'Id,Title,Description,JlptLevel,TimeLimitInSeconds,ExamQuestions(Id)',
      'IsPublic': 'eq.true',
      'IsDeleted': 'eq.false',
      'order': 'CreatedAt.desc',
    };
    if (jlptLevel != null) parameters['JlptLevel'] = 'eq.$jlptLevel';
    if (query.trim().isNotEmpty)
      parameters['Title'] = 'ilike.%${query.trim().replaceAll(',', ' ')}%';
    final response = await client.dio
        .get(client.table('Exams'), queryParameters: parameters);
    return (response.data as List<dynamic>)
        .map((row) =>
            ExamSummary.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  Future<ExamDetail> getExamForPlay(int examId) async {
    final response = await client.dio.get(
      client.table('Exams'),
      queryParameters: {
        'select':
            'Id,Title,Description,JlptLevel,TimeLimitInSeconds,ExamQuestions(Id,QuestionType,QuestionText,PassageText,OptionsJson,CorrectAnswer,Explanation,OrderIndex)',
        'Id': 'eq.$examId',
        'IsDeleted': 'eq.false',
      },
    );
    final rows = response.data as List<dynamic>;
    if (rows.isEmpty) throw Exception('Không tìm thấy đề kiểm tra.');
    return ExamDetail.fromJson(Map<String, dynamic>.from(rows.first as Map));
  }

  Future<ExamAttemptResult> saveExamAttempt({
    required ExamDetail exam,
    required Map<int, String> answers,
    required int timeSpentInSeconds,
  }) async {
    final userId = await getCurrentUserId();
    final evaluated = exam.questions.map((question) {
      final selected = answers[question.id];
      return <String, dynamic>{
        'QuestionId': question.id,
        'SelectedAnswer': selected,
        'IsCorrect': selected == question.correctAnswer,
      };
    }).toList();
    final correctCount =
        evaluated.where((answer) => answer['IsCorrect'] == true).length;
    final totalCount = exam.questions.length;
    final accuracy = totalCount == 0 ? 0.0 : correctCount * 100 / totalCount;
    final attemptResponse =
        await client.dio.post(client.table('ExamAttempts'), data: {
      'ExamId': exam.id,
      'UserId': userId,
      'AccuracyPercentage': accuracy,
      'TimeSpentInSeconds': timeSpentInSeconds,
      'CorrectAnswersCount': correctCount,
      'TotalQuestionsCount': totalCount,
    });
    final attemptId =
        (attemptResponse.data as Map<String, dynamic>)['Id'] as int;
    if (evaluated.isNotEmpty) {
      await client.dio.post(
        client.table('ExamAttemptAnswers'),
        data: evaluated
            .map((answer) => {'AttemptId': attemptId, ...answer})
            .toList(),
      );
    }
    try {
      await recordExamKnowledgeEvidence(
        exam: exam,
        evaluatedAnswers: evaluated,
        attemptId: attemptId,
      );
    } catch (_) {
      // The canonical exam attempt is already saved; evidence stays queued.
    }
    return ExamAttemptResult(
        id: attemptId,
        correctCount: correctCount,
        totalCount: totalCount,
        accuracy: accuracy);
  }

  // ── Grammar ────────────────────────────────────────────────────────────────

  // ── Grammar ────────────────────────────────────────────────────────────────

  Future<List<GrammarPoint>> searchGrammar(
      {String query = '', int? jlptLevel}) async {
    final parameters = <String, dynamic>{
      'select': SupabaseConfig.grammarSelect,
      'IsDeleted': 'eq.false',
      'order': 'CreatedAt.desc',
      'limit': '100',
    };
    if (jlptLevel != null) parameters['JlptLevel'] = 'eq.$jlptLevel';
    if (query.trim().isNotEmpty) {
      final escaped = query.trim().replaceAll(',', ' ');
      parameters['or'] =
          '(Title.ilike.%$escaped%,Meaning.ilike.%$escaped%,Structure.ilike.%$escaped%)';
    }
    final response = await client.dio
        .get(client.table('GrammarPoints'), queryParameters: parameters);
    return (response.data as List<dynamic>)
        .map((row) =>
            GrammarPoint.fromJson(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  // ── Dashboard / Stats ────────────────────────────────────────────────────────

  Future<UserStats> loadUserStats(int userId) async {
    final results = await Future.wait([
      _fetchStreak(userId),
      _fetchXP(userId),
      _fetchSrsDue(userId),
    ]);
    return UserStats(
        streak: results[0], totalXP: results[1], srsCardsDue: results[2]);
  }

  Future<List<DashboardFolder>> loadDashboardFolders(int userId) async {
    try {
      // Dùng lại getFolders() đã hoạt động đúng (có JWT, có RLS)
      final folders = await getFolders();
      final limited = folders.take(4).toList();

      return limited
          .map((f) => DashboardFolder(
                id: f.id,
                name: f.name,
                vocabCount: f.vocabCount,
              ))
          .toList();
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
          final lastAttempt = attemptData.isNotEmpty
              ? attemptData[0] as Map<String, dynamic>
              : null;
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
          'select':
              'UserId, AccuracyPercentage, CorrectAnswersCount, Users:UserId(Username, FullName)',
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
        final name = (users?['FullName'] as String? ??
            users?['Username'] as String? ??
            'Ẩn danh');
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
                accuracy: e.value.quizCount > 0
                    ? (e.value.totalAccuracy / e.value.quizCount)
                    : 0.0,
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
        final date = DateTime.parse(
            (row as Map<String, dynamic>)['CreatedAt'] as String);
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
      final responses = await Future.wait([
        client.dio.get(
          client.table('QuizAttempts'),
          queryParameters: {'select': 'CreatedAt', 'UserId': 'eq.$userId'},
        ),
        client.dio.get(
          client.table('ExamAttempts'),
          queryParameters: {'select': 'CreatedAt', 'UserId': 'eq.$userId'},
        ),
        client.dio.get(
          client.table('SRSCards'),
          queryParameters: {'select': 'Id', 'UserId': 'eq.$userId'},
        ),
      ]);
      final quizRows = responses[0].data as List<dynamic>;
      final examRows = responses[1].data as List<dynamic>;
      final cardRows = responses[2].data as List<dynamic>;
      final cardIds =
          cardRows.map((row) => (row as Map<String, dynamic>)['Id']).join(',');
      final reviewRows = cardIds.isEmpty
          ? <dynamic>[]
          : (await client.dio.get(
              client.table('SRSReviewLogs'),
              queryParameters: {
                'select': 'ReviewedAt',
                'CardId': 'in.($cardIds)'
              },
            ))
              .data as List<dynamic>;

      final dates = <String>{};
      for (final row in [...quizRows, ...examRows]) {
        dates.add(_formatDate(
            DateTime.parse((row as Map<String, dynamic>)['CreatedAt'] as String)
                .toLocal()));
      }
      for (final row in reviewRows) {
        dates.add(_formatDate(DateTime.parse(
                (row as Map<String, dynamic>)['ReviewedAt'] as String)
            .toLocal()));
      }

      var cursor = DateTime.now();
      if (!dates.contains(_formatDate(cursor)))
        cursor = cursor.subtract(const Duration(days: 1));
      if (!dates.contains(_formatDate(cursor))) return 0;

      var streak = 0;
      while (dates.contains(_formatDate(cursor))) {
        streak++;
        cursor = cursor.subtract(const Duration(days: 1));
      }
      return streak;
    } catch (_) {
      return 0;
    }
  }

  Future<int> _fetchXP(int userId) async {
    try {
      final response = await client.dio.get(
        client.table('QuizAttempts'),
        queryParameters: {
          'select': 'CorrectAnswersCount',
          'UserId': 'eq.$userId'
        },
      );
      final data = response.data as List<dynamic>;
      return data.fold<int>(
          0,
          (sum, row) =>
              sum +
              (((row as Map<String, dynamic>)['CorrectAnswersCount'] ?? 0)
                      as int) *
                  10);
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

  // ── Topics, lessons and v3 minigames ───────────────────────────────────────

  Future<List<TopicDto>> getTopicsWithLessons() async {
    final userId = await getCurrentUserId();
    final responses = await Future.wait([
      client.dio.get(client.table('Topics'), queryParameters: {
        'select': 'Id,Title,Description,JlptLevel',
        'IsPublished': 'eq.true',
        'order': 'CreatedAt.asc',
      }),
      client.dio.get(client.table('Lessons'), queryParameters: {
        'select': 'Id,TopicId,Title,Description,OrderIndex,EstimatedMinutes',
        'IsPublished': 'eq.true',
        'order': 'OrderIndex.asc',
      }),
      client.dio.get(client.table('LessonItems'), queryParameters: {
        'select': 'LessonId',
      }),
      client.dio.get(client.table('UserLessonProgress'), queryParameters: {
        'select': 'LessonId,CompletedItemCount',
        'UserId': 'eq.$userId',
      }),
    ]);
    final topics =
        (responses[0].data as List<dynamic>).cast<Map<String, dynamic>>();
    final lessons =
        (responses[1].data as List<dynamic>).cast<Map<String, dynamic>>();
    final itemRows =
        (responses[2].data as List<dynamic>).cast<Map<String, dynamic>>();
    final progressRows =
        (responses[3].data as List<dynamic>).cast<Map<String, dynamic>>();
    final itemCounts = <int, int>{};
    for (final row in itemRows) {
      final id = (row['LessonId'] as num).toInt();
      itemCounts[id] = (itemCounts[id] ?? 0) + 1;
    }
    final progress = <int, int>{
      for (final row in progressRows)
        (row['LessonId'] as num).toInt():
            (row['CompletedItemCount'] as num?)?.toInt() ?? 0,
    };
    return topics.map((topic) {
      final topicId = (topic['Id'] as num).toInt();
      final topicLessons = lessons
          .where((lesson) => (lesson['TopicId'] as num).toInt() == topicId)
          .map((lesson) {
        final lessonId = (lesson['Id'] as num).toInt();
        return LessonDto(
          id: lessonId,
          topicId: topicId,
          title: lesson['Title'] as String,
          description: lesson['Description'] as String? ?? '',
          orderIndex: (lesson['OrderIndex'] as num?)?.toInt() ?? 0,
          estimatedMinutes: (lesson['EstimatedMinutes'] as num?)?.toInt() ?? 10,
          itemCount: itemCounts[lessonId] ?? 0,
          completedItemCount: progress[lessonId] ?? 0,
        );
      }).toList();
      return TopicDto(
        id: topicId,
        title: topic['Title'] as String,
        description: topic['Description'] as String? ?? '',
        jlptLevel: (topic['JlptLevel'] as num?)?.toInt(),
        lessons: topicLessons,
      );
    }).toList();
  }

  Future<FolderSrsSession?> getLessonSrsSession({int? lessonId}) async {
    final resolvedId = lessonId ?? await getActiveLessonId();
    if (resolvedId == null || client.userEmail == null) {
      return null;
    }
    final userId = await getCurrentUserId();
    var context = await _loadLessonSrsContext(resolvedId, userId);
    final insertedCards = await _ensureSrsCards(context, learned: true);
    final promotedCards = await _promoteStudiedLessonCards(context);
    if (insertedCards || promotedCards) {
      context = await _loadLessonSrsContext(resolvedId, userId);
    }
    await _linkLessonCards(userId, context.lessonItems, context.cards);
    final cards = _mapSrsCards(context);
    final session = FolderSrsSession(
      folderId: resolvedId,
      folderName: context.folderName,
      overview: _buildSrsOverview(context),
      cards: cards,
      flashcards: cards.where((card) => card.boxLevel == 0).toList(),
      quizCards: cards
          .where((card) => SrsEngine.isScheduledReviewDue(
              level: card.boxLevel, nextReviewDate: card.nextReviewDate))
          .toList(),
    );
    unawaited(cacheLessonSrsSession(session));
    return session;
  }

  Future<FolderSrsSession?> getGlobalSrsSession() async {
    if (client.userEmail == null) return null;
    final userId = await getCurrentUserId();
    final cardResponse = await client.dio.get(
      client.table('SRSCards'),
      queryParameters: {
        'select': SupabaseConfig.srsCardSelect,
        'UserId': 'eq.$userId',
        'BoxLevel': 'gt.0',
      },
    );
    final cards =
        (cardResponse.data as List<dynamic>).cast<Map<String, dynamic>>();
    final vocabularyIds = cards
        .map((card) => (card['VocabularyId'] as num?)?.toInt())
        .whereType<int>()
        .toSet()
        .toList();
    final kanjiIds = cards
        .map((card) => (card['KanjiId'] as num?)?.toInt())
        .whereType<int>()
        .toSet()
        .toList();
    final content = await Future.wait<dynamic>([
      vocabularyIds.isEmpty
          ? Future.value(
              Response(data: <dynamic>[], requestOptions: RequestOptions()))
          : client.dio.get(client.table('Vocabularies'), queryParameters: {
              'select': 'Id,Word,Pronunciation,Meaning,FolderId,SpecificData',
              'Id': 'in.(${vocabularyIds.join(',')})',
            }),
      kanjiIds.isEmpty
          ? Future.value(
              Response(data: <dynamic>[], requestOptions: RequestOptions()))
          : client.dio.get(client.table('Kanji'), queryParameters: {
              'select': SupabaseConfig.kanjiSelect,
              'Id': 'in.(${kanjiIds.join(',')})',
            }),
      _loadKanjiExamples(kanjiIds),
      _loadTodayNewLearned(
          cards.map((card) => (card['Id'] as num).toInt()).toList()),
      _loadWrongReviewCounts(
          cards.map((card) => (card['Id'] as num).toInt()).toList()),
    ]);
    final vocabularyResponse = content[0] as Response<dynamic>;
    final kanjiResponse = content[1] as Response<dynamic>;
    final kanjiRows =
        (kanjiResponse.data as List<dynamic>).cast<Map<String, dynamic>>();
    final context = _SrsContext(
      folderId: _globalSrsId,
      folderName: _globalSrsName,
      userId: userId,
      vocabs: (vocabularyResponse.data as List<dynamic>)
          .cast<Map<String, dynamic>>(),
      kanjiComponents: kanjiRows
          .map((kanji) => <String, dynamic>{
                'VocabularyId': 0,
                'KanjiId': kanji['Id'],
                'Kanji': kanji
              })
          .toList(),
      kanjiExamples: content[2] as Map<int, List<SrsVocabularyExample>>,
      todayNewLearned: content[3] as int,
      wrongReviewCounts: content[4] as Map<int, int>,
      cards: cards,
    );
    final mappedCards = _mapSrsCards(context);
    final overview = _buildSrsOverview(context);
    return FolderSrsSession(
      folderId: _globalSrsId,
      folderName: _globalSrsName,
      overview: overview,
      cards: mappedCards,
      flashcards: mappedCards.where((card) => card.boxLevel == 0).toList(),
      quizCards: mappedCards
          .where((card) => SrsEngine.isScheduledReviewDue(
              level: card.boxLevel, nextReviewDate: card.nextReviewDate))
          .toList(),
    );
  }

  Future<FolderSrsOverview> getLessonSrsOverview(int lessonId) async {
    final session = await getLessonSrsSession(lessonId: lessonId);
    if (session == null) {
      throw Exception('Không tìm thấy session SRS của bài học');
    }
    return session.overview;
  }

  /// Builds all lesson summaries from their items and existing SRS cards.
  /// Full sessions also fetch Kanji prompts and review history, so using one for
  /// every dashboard row created a mobile request waterfall.
  Future<List<FolderSrsOverview>> getLessonSrsOverviews(
      List<LessonDto> lessons) async {
    if (lessons.isEmpty || client.userEmail == null) {
      return const <FolderSrsOverview>[];
    }

    final userId = await getCurrentUserId();
    final lessonIds = lessons.map((lesson) => lesson.id).toList();
    final itemResponse = await client.dio.get(
      client.table('LessonItems'),
      queryParameters: {
        'select': 'LessonId,VocabularyId,KanjiId',
        'LessonId': 'in.(${lessonIds.join(',')})',
      },
    );
    final items =
        (itemResponse.data as List<dynamic>).cast<Map<String, dynamic>>();
    final vocabularyIds = items
        .map((item) => (item['VocabularyId'] as num?)?.toInt())
        .whereType<int>()
        .toSet()
        .toList();
    final kanjiIds = items
        .map((item) => (item['KanjiId'] as num?)?.toInt())
        .whereType<int>()
        .toSet()
        .toList();
    final cards = await _loadFolderSrsCards(userId, vocabularyIds, kanjiIds);
    final cardIds = cards.map((card) => (card['Id'] as num).toInt()).toList();
    final learnedToday = await _loadTodayNewLearnedCardIds(cardIds);
    final cardsByKey = <String, Map<String, dynamic>>{
      for (final card in cards)
        SrsEngine.encodeKey(
          (card['VocabularyId'] as num?)?.toInt(),
          (card['KanjiId'] as num?)?.toInt(),
        ): card,
    };
    final itemsByLesson = <int, List<Map<String, dynamic>>>{};
    for (final item in items) {
      final lessonId = (item['LessonId'] as num).toInt();
      itemsByLesson.putIfAbsent(lessonId, () => []).add(item);
    }

    return lessons.map((lesson) {
      final lessonItems = itemsByLesson[lesson.id] ?? const [];
      final lessonCards = lessonItems
          .map((item) => cardsByKey[SrsEngine.encodeKey(
                (item['VocabularyId'] as num?)?.toInt(),
                (item['KanjiId'] as num?)?.toInt(),
              )])
          .whereType<Map<String, dynamic>>()
          .toList();
      final learned = lessonCards
          .where((card) => (card['BoxLevel'] as int? ?? 0) > 0)
          .length;
      final futureDates = lessonCards
          .where((card) {
            final level = card['BoxLevel'] as int? ?? 0;
            final nextReviewDate = card['NextReviewDate'] as String? ?? '';
            return level > 0 &&
                !SrsEngine.isScheduledReviewDue(
                  level: level,
                  nextReviewDate: nextReviewDate,
                );
          })
          .map((card) => card['NextReviewDate'] as String? ?? '')
          .where((date) => date.isNotEmpty)
          .toList()
        ..sort();
      return FolderSrsOverview(
        folderId: lesson.id,
        folderName: lesson.title,
        totalCards: lessonItems.length,
        newCards: lessonItems.length - learned,
        dueCards: lessonCards.where((card) {
          return SrsEngine.isScheduledReviewDue(
            level: card['BoxLevel'] as int? ?? 0,
            nextReviewDate: card['NextReviewDate'] as String? ?? '',
          );
        }).length,
        learnedCards: learned,
        masteredCards: lessonCards
            .where((card) => (card['BoxLevel'] as int? ?? 0) >= 7)
            .length,
        todayNewLearned: lessonCards
            .where((card) => learnedToday.contains((card['Id'] as num).toInt()))
            .length,
        nextDueAt: futureDates.isEmpty ? null : futureDates.first,
        canSwitchFolder: true,
      );
    }).toList();
  }

  Future<FolderSrsSession?> getCachedLessonSrsSession() async {
    final cacheKey = _lessonSrsCacheKey();
    if (cacheKey == null) return null;
    try {
      final raw = (await SharedPreferences.getInstance()).getString(cacheKey);
      if (raw == null) return null;
      final payload = jsonDecode(raw) as Map<String, dynamic>;
      if (payload['version'] != _lessonSrsCacheVersion) return null;
      return _sessionFromJson(payload['session'] as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> cacheLessonSrsSession(FolderSrsSession session) async {
    final cacheKey = _lessonSrsCacheKey();
    if (cacheKey == null) return;
    try {
      await (await SharedPreferences.getInstance()).setString(
        cacheKey,
        jsonEncode({
          'version': _lessonSrsCacheVersion,
          'savedAt': DateTime.now().toUtc().toIso8601String(),
          'session': _sessionToJson(session),
        }),
      );
    } catch (_) {
      // The live review session remains usable when local storage is unavailable.
    }
  }

  String? _lessonSrsCacheKey() {
    final email = client.userEmail?.trim().toLowerCase();
    if (email == null || email.isEmpty) return null;
    final userScope = base64Url.encode(utf8.encode(email)).replaceAll('=', '');
    return '$_lessonSrsCachePrefix$userScope';
  }

  Map<String, dynamic> _sessionToJson(FolderSrsSession session) => {
        'folderId': session.folderId,
        'folderName': session.folderName,
        'overview': _overviewToJson(session.overview),
        'cards': session.cards.map(_cardToJson).toList(),
      };

  Map<String, dynamic> _overviewToJson(FolderSrsOverview overview) => {
        'folderId': overview.folderId,
        'folderName': overview.folderName,
        'totalCards': overview.totalCards,
        'newCards': overview.newCards,
        'dueCards': overview.dueCards,
        'learnedCards': overview.learnedCards,
        'masteredCards': overview.masteredCards,
        'todayNewLearned': overview.todayNewLearned,
        'nextDueAt': overview.nextDueAt,
      };

  Map<String, dynamic> _cardToJson(SRSCardDto card) => {
        'id': card.id,
        'userId': card.userId,
        'folderId': card.folderId,
        'type': card.type.name,
        'vocabularyId': card.vocabularyId,
        'kanjiId': card.kanjiId,
        'word': card.word,
        'pronunciation': card.pronunciation,
        'meaning': card.meaning,
        'character': card.character,
        'amHanViet': card.amHanViet,
        'radicalCharacter': card.radicalCharacter,
        'radicalName': card.radicalName,
        'onyomi': card.onyomi,
        'kunyomi': card.kunyomi,
        'examples': card.examples
            .map((example) => {
                  'word': example.word,
                  'pronunciation': example.pronunciation,
                  'meaning': example.meaning,
                })
            .toList(),
        'strokeCount': card.strokeCount,
        'boxLevel': card.boxLevel,
        'wrongReviewCount': card.wrongReviewCount,
        'nextReviewDate': card.nextReviewDate,
        'isDue': card.isDue,
        'isNew': card.isNew,
      };

  FolderSrsSession _sessionFromJson(Map<String, dynamic> json) {
    final cards = (json['cards'] as List<dynamic>)
        .cast<Map<String, dynamic>>()
        .map(_cardFromJson)
        .toList();
    return FolderSrsSession(
      folderId: (json['folderId'] as num).toInt(),
      folderName: json['folderName'] as String,
      overview: _overviewFromJson(json['overview'] as Map<String, dynamic>),
      cards: cards,
      flashcards: cards.where((card) => card.boxLevel == 0).toList(),
      quizCards: cards
          .where((card) => SrsEngine.isScheduledReviewDue(
                level: card.boxLevel,
                nextReviewDate: card.nextReviewDate,
              ))
          .toList(),
    );
  }

  FolderSrsOverview _overviewFromJson(Map<String, dynamic> json) =>
      FolderSrsOverview(
        folderId: (json['folderId'] as num).toInt(),
        folderName: json['folderName'] as String,
        totalCards: (json['totalCards'] as num).toInt(),
        newCards: (json['newCards'] as num).toInt(),
        dueCards: (json['dueCards'] as num).toInt(),
        learnedCards: (json['learnedCards'] as num).toInt(),
        masteredCards: (json['masteredCards'] as num).toInt(),
        todayNewLearned: (json['todayNewLearned'] as num).toInt(),
        nextDueAt: json['nextDueAt'] as String?,
        canSwitchFolder: true,
      );

  SRSCardDto _cardFromJson(Map<String, dynamic> json) => SRSCardDto(
        id: (json['id'] as num).toInt(),
        userId: (json['userId'] as num).toInt(),
        folderId: (json['folderId'] as num).toInt(),
        type: json['type'] == SrsItemType.kanji.name
            ? SrsItemType.kanji
            : SrsItemType.vocabulary,
        vocabularyId: (json['vocabularyId'] as num?)?.toInt(),
        kanjiId: (json['kanjiId'] as num?)?.toInt(),
        word: json['word'] as String,
        pronunciation: json['pronunciation'] as String?,
        meaning: json['meaning'] as String,
        character: json['character'] as String?,
        amHanViet: json['amHanViet'] as String?,
        radicalCharacter: json['radicalCharacter'] as String?,
        radicalName: json['radicalName'] as String?,
        onyomi: json['onyomi'] as String?,
        kunyomi: json['kunyomi'] as String?,
        examples: (json['examples'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map((example) => SrsVocabularyExample(
                  word: example['word'] as String,
                  pronunciation: example['pronunciation'] as String?,
                  meaning: example['meaning'] as String,
                ))
            .toList(),
        strokeCount: (json['strokeCount'] as num?)?.toInt(),
        boxLevel: (json['boxLevel'] as num).toInt(),
        wrongReviewCount: (json['wrongReviewCount'] as num?)?.toInt() ?? 0,
        nextReviewDate: json['nextReviewDate'] as String,
        isDue: json['isDue'] as bool? ?? false,
        isNew: json['isNew'] as bool? ?? false,
      );

  Future<LessonDto> getLessonDetail(int lessonId) async {
    final responses = await Future.wait([
      client.dio.get(client.table('Lessons'), queryParameters: {
        'select': 'Id,TopicId,Title,Description,OrderIndex,EstimatedMinutes',
        'Id': 'eq.$lessonId',
        'limit': '1',
      }),
      client.dio.get(client.table('LessonItems'), queryParameters: {
        'select':
            'Id,LessonId,VocabularyId,KanjiId,OrderIndex,ExampleSentence,ExampleTranslation,Vocabulary:VocabularyId(Word,Pronunciation,Meaning),Kanji:KanjiId(Character,AmHanViet,Onyomi,Kunyomi,Meaning)',
        'LessonId': 'eq.$lessonId',
        'order': 'OrderIndex.asc',
      }),
    ]);
    final lessonRows = responses[0].data as List<dynamic>;
    if (lessonRows.isEmpty) throw Exception('Không tìm thấy bài học');
    final lesson = lessonRows.first as Map<String, dynamic>;
    final rows =
        (responses[1].data as List<dynamic>).cast<Map<String, dynamic>>();
    final items = rows.map((row) {
      final vocab = row['Vocabulary'] as Map<String, dynamic>?;
      final kanji = row['Kanji'] as Map<String, dynamic>?;
      return LessonItemDto(
        id: (row['Id'] as num).toInt(),
        vocabularyId: (row['VocabularyId'] as num?)?.toInt(),
        kanjiId: (row['KanjiId'] as num?)?.toInt(),
        word: vocab?['Word'] as String? ?? kanji?['Character'] as String? ?? '',
        pronunciation: vocab?['Pronunciation'] as String? ??
            kanji?['Onyomi'] as String? ??
            kanji?['Kunyomi'] as String? ??
            '',
        amHanViet: kanji?['AmHanViet'] as String?,
        meaning:
            vocab?['Meaning'] as String? ?? kanji?['Meaning'] as String? ?? '',
        exampleSentence: row['ExampleSentence'] as String?,
        exampleTranslation: row['ExampleTranslation'] as String?,
      );
    }).toList();
    return LessonDto(
      id: lessonId,
      topicId: (lesson['TopicId'] as num).toInt(),
      title: lesson['Title'] as String,
      description: lesson['Description'] as String? ?? '',
      orderIndex: (lesson['OrderIndex'] as num?)?.toInt() ?? 0,
      estimatedMinutes: (lesson['EstimatedMinutes'] as num?)?.toInt() ?? 10,
      itemCount: items.length,
      items: items,
    );
  }

  Future<void> saveLessonProgress(
      int lessonId, int completedItemCount, int totalItems,
      {int? lastItemId}) async {
    final userId = await getCurrentUserId();
    final now = DateTime.now().toUtc().toIso8601String();
    await client.dio.post(
      client.table('UserLessonProgress'),
      queryParameters: {'on_conflict': 'UserId,LessonId'},
      options: Options(headers: {'Prefer': 'resolution=merge-duplicates'}),
      data: {
        'UserId': userId,
        'LessonId': lessonId,
        'CompletedItemCount': completedItemCount.clamp(0, totalItems),
        'LastItemId': lastItemId,
        'LastStudiedAt': now,
        'CompletedAt':
            totalItems > 0 && completedItemCount >= totalItems ? now : null,
      },
    );
    try {
      await getLessonSrsSession(lessonId: lessonId);
    } catch (_) {
      // The lesson progress above is already durable. SRS initialization can retry later.
    }
  }

  Future<List<GameVocabularyDto>> getGameVocabulary({int limit = 30}) async {
    final response =
        await client.dio.get(client.table('Vocabularies'), queryParameters: {
      'select': 'Id,Word,Pronunciation,Meaning',
      'Pronunciation': 'not.is.null',
      'limit': '${(limit * 3).clamp(20, 500)}',
    });
    final rows = (response.data as List<dynamic>).cast<Map<String, dynamic>>()
      ..shuffle();
    return rows
        .take(limit)
        .map((row) => GameVocabularyDto(
              id: (row['Id'] as num).toInt(),
              word: row['Word'] as String,
              pronunciation: row['Pronunciation'] as String? ?? '',
              meaning: row['Meaning'] as String,
            ))
        .toList();
  }

  Future<void> recordMinigame(String gameType, int score, int correct,
      int wrong, int durationSeconds) async {
    final userId = await getCurrentUserId();
    await client.dio.post(client.table('MinigameSessions'), data: {
      'UserId': userId,
      'GameType': gameType,
      'Score': score,
      'CorrectCount': correct,
      'WrongCount': wrong,
      'DurationSeconds': durationSeconds,
    });
  }

  // ── Persistent learner Knowledge Graph ────────────────────────────────────

  Future<void> recordSrsKnowledgeEvidence({
    required SRSCardDto card,
    required String questionMode,
    required bool correct,
  }) async {
    final userId = await getCurrentUserId();
    final skillCode = _srsSkillCode(questionMode);
    if (skillCode == null) return;
    final sessionKey = const Uuid().v4();
    final occurredAt = DateTime.now().toUtc().toIso8601String();
    final rows = <Map<String, dynamic>>[
      _knowledgeEvidenceRow(
        userId: userId,
        skillCode: skillCode,
        sourceType: 'SRS',
        sourceCardId: card.id,
        sourceAttemptId: null,
        sourceQuestionId: null,
        sessionKey: sessionKey,
        questionMode: questionMode,
        itemType: card.type == SrsItemType.kanji ? 'KANJI' : 'VOCABULARY',
        vocabularyId: card.vocabularyId,
        kanjiId: card.kanjiId,
        strokeCount: card.strokeCount,
        correct: correct,
        occurredAt: occurredAt,
      ),
    ];
    if (card.type == SrsItemType.kanji && card.strokeCount != null) {
      rows.add(_knowledgeEvidenceRow(
        userId: userId,
        skillCode: _strokeSkillCode(card.strokeCount!),
        sourceType: 'SRS',
        sourceCardId: card.id,
        sourceAttemptId: null,
        sourceQuestionId: null,
        sessionKey: sessionKey,
        questionMode: questionMode,
        itemType: 'KANJI',
        vocabularyId: card.vocabularyId,
        kanjiId: card.kanjiId,
        strokeCount: card.strokeCount,
        correct: correct,
        occurredAt: occurredAt,
      ));
    }
    await _queueKnowledgeEvidence(userId, rows);
  }

  Future<void> recordExamKnowledgeEvidence({
    required ExamDetail exam,
    required List<Map<String, dynamic>> evaluatedAnswers,
    required int attemptId,
  }) async {
    final userId = await getCurrentUserId();
    final answers = <int, bool>{
      for (final answer in evaluatedAnswers)
        answer['QuestionId'] as int: answer['IsCorrect'] == true,
    };
    final occurredAt = DateTime.now().toUtc().toIso8601String();
    final rows = exam.questions.map((question) {
      return _knowledgeEvidenceRow(
        userId: userId,
        skillCode: _examSkillCode(question.type),
        sourceType: 'EXAM',
        sourceCardId: null,
        sourceAttemptId: attemptId,
        sourceQuestionId: question.id,
        sessionKey: const Uuid().v4(),
        questionMode: question.type,
        itemType: _examItemType(question.type),
        vocabularyId: null,
        kanjiId: null,
        strokeCount: null,
        correct: answers[question.id] ?? false,
        occurredAt: occurredAt,
      );
    }).toList();
    await _queueKnowledgeEvidence(userId, rows);
  }

  Future<LearningKnowledgeGraph> loadKnowledgeGraph() async {
    final userId = await getCurrentUserId();
    try {
      await flushPendingKnowledgeEvidence();
    } catch (_) {
      // Continue with the last successfully synchronized evidence.
    }
    final response = await client.dio.get(
      client.table('LearningKnowledgeStats'),
      queryParameters: {
        'select': 'UserId,SkillCode,Label,Attempts,Correct,Score',
        'UserId': 'eq.$userId',
      },
    );
    final rows = (response.data as List<dynamic>)
        .map((row) => Map<String, dynamic>.from(row as Map))
        .toList();
    return LearningKnowledgeGraph.fromStats(
      rows,
      title: 'Bản đồ năng lực cá nhân',
      subtitle: 'Tổng hợp từ câu ôn tập và đề kiểm tra trên mọi thiết bị.',
    );
  }

  Future<LearningKnowledgeGraph> loadExamKnowledgeGraph(int attemptId) async {
    try {
      await flushPendingKnowledgeEvidence();
    } catch (_) {
      // The result screen can still use evidence already synchronized.
    }
    final response = await client.dio.get(
      client.table('LearningEvidence'),
      queryParameters: {
        'select': 'SkillCode,IsCorrect',
        'SourceAttemptId': 'eq.$attemptId',
      },
    );
    final grouped = <String, List<bool>>{};
    for (final raw in response.data as List<dynamic>) {
      final row = Map<String, dynamic>.from(raw as Map);
      final code = row['SkillCode'] as String;
      grouped.putIfAbsent(code, () => <bool>[]).add(row['IsCorrect'] == true);
    }
    final rows = grouped.entries.map((entry) {
      final correct = entry.value.where((value) => value).length;
      return <String, dynamic>{
        'SkillCode': entry.key,
        'Label': _knowledgeSkillLabel(entry.key),
        'Attempts': entry.value.length,
        'Correct': correct,
      };
    }).toList();
    return LearningKnowledgeGraph.fromStats(
      rows,
      title: 'Bản đồ năng lực của đề này',
      subtitle: 'Được đọc từ evidence đã lưu của lần làm đề này.',
    );
  }

  Future<void> flushPendingKnowledgeEvidence() {
    final active = _knowledgeFlush;
    if (active != null) return active;
    late final Future<void> operation;
    operation = _flushPendingKnowledgeEvidenceCore().whenComplete(() {
      if (identical(_knowledgeFlush, operation)) _knowledgeFlush = null;
    });
    _knowledgeFlush = operation;
    return operation;
  }

  Future<void> _queueKnowledgeEvidence(
    int userId,
    List<Map<String, dynamic>> rows,
  ) async {
    if (rows.isEmpty) return;
    final preferences = await SharedPreferences.getInstance();
    final key = '$_knowledgeQueuePrefix$userId';
    final existing = _decodeKnowledgeQueue(preferences.getString(key));
    final next = [...existing, ...rows];
    await preferences.setString(
      key,
      jsonEncode(next.length > 2000 ? next.sublist(next.length - 2000) : next),
    );
    try {
      await flushPendingKnowledgeEvidence();
    } catch (_) {
      // Keep the queue for the next review/profile load.
    }
  }

  Future<void> _flushPendingKnowledgeEvidenceCore() async {
    final userId = await getCurrentUserId();
    final preferences = await SharedPreferences.getInstance();
    final key = '$_knowledgeQueuePrefix$userId';
    final pending = _decodeKnowledgeQueue(preferences.getString(key));
    if (pending.isEmpty) return;
    await client.dio.post(
      client.table('LearningEvidence'),
      queryParameters: {'on_conflict': 'Id'},
      data: pending,
      options: Options(headers: {
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
      }),
    );
    final persistedIds = pending.map((row) => row['Id'] as String).toSet();
    final latest = _decodeKnowledgeQueue(preferences.getString(key));
    final remaining = latest
        .where((row) => !persistedIds.contains(row['Id'] as String))
        .toList();
    await preferences.setString(key, jsonEncode(remaining));
  }

  List<Map<String, dynamic>> _decodeKnowledgeQueue(String? raw) {
    if (raw == null || raw.isEmpty) return <Map<String, dynamic>>[];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((row) => Map<String, dynamic>.from(row as Map))
          .toList();
    } catch (_) {
      return <Map<String, dynamic>>[];
    }
  }

  Map<String, dynamic> _knowledgeEvidenceRow({
    required int userId,
    required String skillCode,
    required String sourceType,
    required int? sourceCardId,
    required int? sourceAttemptId,
    required int? sourceQuestionId,
    required String sessionKey,
    required String questionMode,
    required String itemType,
    required int? vocabularyId,
    required int? kanjiId,
    required int? strokeCount,
    required bool correct,
    required String occurredAt,
  }) {
    return <String, dynamic>{
      'Id': const Uuid().v4(),
      'UserId': userId,
      'SkillCode': skillCode,
      'SourceType': sourceType,
      'SourceCardId': sourceCardId,
      'SourceAttemptId': sourceAttemptId,
      'SourceQuestionId': sourceQuestionId,
      'SessionKey': sessionKey,
      'QuestionMode': questionMode,
      'ItemType': itemType,
      'VocabularyId': vocabularyId,
      'KanjiId': kanjiId,
      'StrokeCount': strokeCount,
      'IsCorrect': correct,
      'ResponseTimeMs': null,
      'Properties': <String, dynamic>{},
      'OccurredAt': occurredAt,
    };
  }

  String? _srsSkillCode(String mode) => switch (mode) {
        'MEAN_FROM_WORD' => 'shape_meaning',
        'WORD_FROM_MEAN' || 'WORD_FROM_HIRAGANA' => 'word_recall',
        'FILL_BLANK' => 'vocab_context',
        'ON_READ' => 'on_reading',
        'KUN_READ' => 'kun_reading',
        'HAN_VIET' => 'han_viet',
        'COMPOSE_KANJI' => 'shape_meaning',
        'DRAW_KANJI' => 'handwriting',
        'KANJI_IN_CONTEXT' => 'kanji_context',
        _ => null,
      };

  String _strokeSkillCode(int count) => count > 14
      ? 'stroke_15_plus'
      : count >= 9
          ? 'stroke_9_14'
          : 'stroke_1_8';

  String _examSkillCode(String type) {
    if (type == 'KANJI_READING') return 'on_kun_reading';
    if (type == 'KANJI_WRITING') return 'handwriting';
    if (type == 'VOCAB_MEANING' || type == 'SYNONYM' || type == 'ANTONYM') {
      return 'vocabulary';
    }
    if (type == 'VOCAB_USAGE') return 'vocab_context';
    if (type == 'SENTENCE_ORDER') return 'sentence_structure';
    if (type.startsWith('GRAMMAR_')) return 'grammar';
    return 'reading';
  }

  String _examItemType(String type) {
    if (type.startsWith('KANJI_')) return 'KANJI';
    if (type.startsWith('VOCAB_') || type == 'SYNONYM' || type == 'ANTONYM') {
      return 'VOCABULARY';
    }
    if (type.startsWith('GRAMMAR_') || type == 'SENTENCE_ORDER') {
      return 'GRAMMAR';
    }
    return 'READING';
  }

  String _knowledgeSkillLabel(String code) => switch (code) {
        'shape_meaning' => 'Nhớ mặt chữ & nghĩa',
        'word_recall' => 'Gợi nhớ từ vựng',
        'vocab_context' => 'Từ vựng trong ngữ cảnh',
        'on_reading' => 'Âm On',
        'kun_reading' => 'Âm Kun',
        'han_viet' => 'Âm Hán Việt',
        'handwriting' => 'Viết Kanji',
        'kanji_context' => 'Kanji trong từ ghép',
        'stroke_1_8' => 'Kanji 1–8 nét',
        'stroke_9_14' => 'Kanji 9–14 nét',
        'stroke_15_plus' => 'Kanji trên 14 nét',
        'on_kun_reading' => 'Đọc Kanji',
        'vocabulary' => 'Vốn từ & sắc thái',
        'sentence_structure' => 'Cấu trúc câu',
        'grammar' => 'Ngữ pháp',
        'reading' => 'Đọc hiểu',
        _ => code,
      };

  // ── Shared helpers ───────────────────────────────────────────────────────────

  String _normalize(String value) => value
      .trim()
      .toLowerCase()
      .replaceAll('*', '')
      .replaceAll('%', '')
      .replaceAll(RegExp(r'\s+'), ' ');
}

class _SrsContext {
  final int folderId;
  final String folderName;
  final int userId;
  final List<Map<String, dynamic>> vocabs;
  final List<Map<String, dynamic>> kanjiComponents;
  final Map<int, List<SrsVocabularyExample>> kanjiExamples;
  final int todayNewLearned;
  final Map<int, int> wrongReviewCounts;
  final List<Map<String, dynamic>> cards;
  final List<Map<String, dynamic>> lessonItems;

  _SrsContext({
    required this.folderId,
    required this.folderName,
    required this.userId,
    required this.vocabs,
    required this.kanjiComponents,
    required this.kanjiExamples,
    required this.todayNewLearned,
    required this.wrongReviewCounts,
    required this.cards,
    this.lessonItems = const [],
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
