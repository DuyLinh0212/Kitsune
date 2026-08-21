import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  readonly isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  readonly speakingText = signal<string | null>(null);
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  speak(text: string, lang = 'ja-JP'): void {
    if (!this.isSupported || !text.trim()) return;

    const synthesis = window.speechSynthesis;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const japaneseVoice = synthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('ja'));
    if (japaneseVoice) utterance.voice = japaneseVoice;

    utterance.onstart = () => this.speakingText.set(text);
    utterance.onend = () => this.finishSpeaking();
    utterance.onerror = () => this.finishSpeaking();

    this.activeUtterance = utterance;
    this.speakingText.set(text);
    synthesis.resume();
    synthesis.speak(utterance);
    window.setTimeout(() => {
      if (synthesis.paused) synthesis.resume();
    }, 100);
  }

  isSpeaking(text: string): boolean {
    return this.speakingText() === text;
  }

  private finishSpeaking(): void {
    this.speakingText.set(null);
    this.activeUtterance = null;
  }
}
