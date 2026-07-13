import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  readonly isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  readonly speakingText = signal<string | null>(null);

  speak(text: string, lang = 'ja-JP'): void {
    if (!this.isSupported || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;

    utterance.onstart = () => this.speakingText.set(text);
    utterance.onend = () => this.speakingText.set(null);
    utterance.onerror = () => this.speakingText.set(null);

    window.speechSynthesis.speak(utterance);
  }

  isSpeaking(text: string): boolean {
    return this.speakingText() === text;
  }
}
