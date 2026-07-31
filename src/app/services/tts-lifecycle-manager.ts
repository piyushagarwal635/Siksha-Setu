import { HttpClient } from '@angular/common/http';

export type TtsSessionResult = { completed: boolean; error?: any };

/**
 * TtsLifecycleManager
 *
 * Rewritten to use browser-native window.speechSynthesis.
 * This eliminates the dependency on the Python backend and fixes the 500 errors.
 */
export class TtsLifecycleManager {
  private state: 'IDLE' | 'PLAYING' | 'STOPPING' = 'IDLE';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private safetyTimerId: any = null;

  constructor(private http: HttpClient, private apiUrl: string) {}

  public speak(
    text: string,
    language: string | undefined,
    onStartPlaying: () => void,
    onCompleted: (result: TtsSessionResult) => void,
    speed: number = 1.0
  ): boolean {
    if (this.state === 'PLAYING') {
      this.stop();
    }

    this.state = 'PLAYING';
    
    // Clean text to avoid reading markdown asterisks aloud
    const cleanedText = text.replace(/\*/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = speed;

    utterance.onstart = () => {
      onStartPlaying();
    };

    utterance.onend = () => {
      this.clearSafetyTimer();
      this.cleanup();
      onCompleted({ completed: true });
    };

    utterance.onerror = (e) => {
      if (this.state === 'STOPPING') return; // expected when canceled
      console.warn('[TtsLifecycle] SpeechSynthesis failed:', e);
      this.clearSafetyTimer();
      this.cleanup();
      onCompleted({ completed: false, error: e });
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);

    // 30s hard failsafe — if onended never fires (browser bug), recover the mic loop
    this.safetyTimerId = setTimeout(() => {
      if (this.state === 'PLAYING') {
        console.warn('[TtsLifecycle] Safety timeout hit — forcing recovery.');
        this.cleanup();
        onCompleted({ completed: false });
      }
    }, 30000);

    return true;
  }

  public stop(): void {
    this.clearSafetyTimer();
    this.state = 'STOPPING';

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    this.currentUtterance = null;
    this.state = 'IDLE';
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimerId) {
      clearTimeout(this.safetyTimerId);
      this.safetyTimerId = null;
    }
  }

  private cleanup(): void {
    this.clearSafetyTimer();
    this.currentUtterance = null;
    this.state = 'IDLE';
  }
}
