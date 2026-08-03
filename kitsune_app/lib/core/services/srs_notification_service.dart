// kitsune_app/lib/core/services/srs_notification_service.dart

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;

class SrsNotificationService {
  SrsNotificationService._();

  static final SrsNotificationService instance = SrsNotificationService._();
  static const int _nextReviewNotificationId = 4107;

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  bool _permissionRequested = false;

  Future<void> initialize({bool requestPermission = false}) async {
    if (!_initialized) {
      tz.initializeTimeZones();
      const settings = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      );
      await _plugin.initialize(settings: settings);
      _initialized = true;
    }

    if (requestPermission && !_permissionRequested) {
      _permissionRequested = true;
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await android?.requestNotificationsPermission();
      await android?.requestExactAlarmsPermission();

      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      await ios?.requestPermissions(alert: true, badge: true, sound: true);
    }
  }

  Future<void> scheduleNextReview(DateTime? nextDueAt) async {
    await initialize(requestPermission: true);
    await _plugin.cancel(id: _nextReviewNotificationId);
    if (nextDueAt == null || !nextDueAt.isAfter(DateTime.now())) return;

    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    final canScheduleExactly = await android?.canScheduleExactNotifications();
    final scheduleMode = canScheduleExactly == true
        ? AndroidScheduleMode.exactAllowWhileIdle
        : AndroidScheduleMode.inexactAllowWhileIdle;

    await _plugin.zonedSchedule(
      id: _nextReviewNotificationId,
      title: 'Đến giờ ôn tập rồi',
      body:
          'Thẻ SRS tiếp theo của bạn đã đến hạn. Mở Kitsune để giữ nhịp học nhé.',
      scheduledDate: tz.TZDateTime.from(nextDueAt.toUtc(), tz.UTC),
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'kitsune_srs_due',
          'Nhắc ôn tập SRS',
          channelDescription: 'Nhắc khi thẻ SRS tiếp theo đến hạn',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      androidScheduleMode: scheduleMode,
      payload: '/srs',
    );
  }
}
