// kitsune_app/lib/core/services/tts_service.dart

import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  TtsService() {
    _tts.setLanguage('ja-JP');
    _tts.setSpeechRate(0.45);
    _tts.setStartHandler(() => _speakingText = _pendingText);
    _tts.setCompletionHandler(() => _speakingText = null);
    _tts.setErrorHandler((_) => _speakingText = null);
  }

  final FlutterTts _tts = FlutterTts();
  String? _speakingText;
  String? _pendingText;

  Future<void> speak(String text, {String lang = 'ja-JP'}) async {
    if (text.trim().isEmpty) return;
    _pendingText = text;
    await _tts.stop();
    await _tts.setLanguage(lang);
    await _tts.speak(text);
  }

  bool isSpeaking(String text) => _speakingText == text;
}
