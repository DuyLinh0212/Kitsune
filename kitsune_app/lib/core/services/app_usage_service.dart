// kitsune_app/lib/core/services/app_usage_service.dart

import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppUsageService with WidgetsBindingObserver {
  AppUsageService._();

  static final AppUsageService instance = AppUsageService._();
  static const String _usagePrefix = 'kitsune.usage.seconds.';

  DateTime? _activeSince;
  bool _started = false;

  void startTracking() {
    if (_started) return;
    _started = true;
    WidgetsBinding.instance.addObserver(this);
    _activeSince = DateTime.now();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _activeSince = DateTime.now();
      return;
    }
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      unawaited(_flushActiveTime());
    }
  }

  Future<List<double>> loadWeekHours() async {
    await _flushActiveTime();
    final prefs = await SharedPreferences.getInstance();
    final now = DateTime.now();
    return List.generate(7, (index) {
      final date = now.subtract(Duration(days: 6 - index));
      final seconds = prefs.getInt('$_usagePrefix${_dateKey(date)}') ?? 0;
      return seconds / 3600;
    });
  }

  Future<void> _flushActiveTime() async {
    final activeSince = _activeSince;
    if (activeSince == null) return;
    final now = DateTime.now();
    _activeSince = now;
    final elapsed = now.difference(activeSince).inSeconds;
    if (elapsed <= 0) return;

    final prefs = await SharedPreferences.getInstance();
    final key = '$_usagePrefix${_dateKey(activeSince)}';
    await prefs.setInt(key, (prefs.getInt(key) ?? 0) + elapsed);
  }

  String _dateKey(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  }
}
