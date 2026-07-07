// kitsune_app/lib/providers/dashboard_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kitsune_app/core/models/dashboard.dart';
import 'package:kitsune_app/providers/providers.dart';

// User stats provider
final userStatsProvider = FutureProvider.family<UserStats, int>((ref, userId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.loadUserStats(userId);
});

// Dashboard folders provider
final dashboardFoldersProvider = FutureProvider.family<List<DashboardFolder>, int>((ref, userId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.loadDashboardFolders(userId);
});

// Dashboard my quizzes provider
final dashboardQuizzesProvider = FutureProvider.family<List<DashboardQuiz>, int>((ref, userId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.loadDashboardQuizzes(userId);
});

// Leaderboard provider
final leaderboardProvider = FutureProvider<List<LeaderboardItem>>((ref) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.loadLeaderboard();
});

// Week chart provider
final weekChartProvider = FutureProvider.family<List<int>, int>((ref, userId) async {
  final api = ref.watch(kitsuneApiProvider);
  return api.loadWeekChart(userId);
});
