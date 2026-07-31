import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

export type TtsSessionResult = { completed: boolean; error?: any };

/**
 * TtsLifecycleManager
 *
 * Step 8 of Stabilization Blueprint.
 * Owns the HTTP TTS request, the Audio element, and cancellation.
 * Resolves RC-3 by decoupling request start from actual audio playback start.
 */
export class TtsLifecycleManager {
  private state: 'IDLE' | 'FETCHING' | 'PLAYING' | 'STOPPING' = 'IDLE';
  private currentAudioElement: HTMLAudioElement | null = null;
  private httpSubscription: Subscription | null = null;

  // Safety net: if onended never fires, recover after 30s
  private safetyTimerId: any = null;

  constructor(private http: HttpClient, private apiUrl: string) {}

  public speak(
    text: string,
    language: string | undefined,
    onStartPlaying: () => void,
    onCompleted: (result: TtsSessionResult) => void,
    speed: number = 1.0
  ): boolean {
    if (this.state === 'FETCHING' || this.state === 'PLAYING') {
      this.stop();
    }

    this.state = 'FETCHING';

    let voiceId = 'en-IN-NeerjaNeural';
    if (language === 'hi') {
      voiceId = 'hi-IN-SwaraNeural';
    } else if (language === 'en') {
      voiceId = 'en-IN-NeerjaNeural';
    }

    this.httpSubscription = this.http.post(
      `${this.apiUrl}/api/voice/tts`,
      { text, voice: voiceId },
      { responseType: 'blob' }
    ).subscribe({
      next: (audioBlob) => {
        if (this.state === 'STOPPING' || this.state === 'IDLE') {
          // stop() was called while fetching — do not play
          return;
        }
        this.state = 'PLAYING';
        onStartPlaying();

        const audioUrl = URL.createObjectURL(audioBlob as Blob);
        this.currentAudioElement = new Audio(audioUrl);
        this.currentAudioElement.crossOrigin = 'anonymous';
        this.currentAudioElement.playbackRate = speed;
        this.currentAudioElement.volume = 1.0;

        this.currentAudioElement.onended = () => {
          this.clearSafetyTimer();
          this.cleanup();
          onCompleted({ completed: true });
        };

        const playPromise = this.currentAudioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (e.name === 'AbortError') return; // Expected when stop() cancels mid-play
            console.warn('[TtsLifecycle] Audio playback failed:', e);
            this.clearSafetyTimer();
            this.cleanup();
            onCompleted({ completed: false, error: e }); // CRITICAL: unblock state machine
          });
        }

        // 30s hard failsafe — if onended never fires (browser bug), recover the mic loop
        this.safetyTimerId = setTimeout(() => {
          if (this.state === 'PLAYING') {
            console.warn('[TtsLifecycle] Safety timeout hit — forcing recovery.');
            this.cleanup();
            onCompleted({ completed: false });
          }
        }, 30000);
      },
      error: (err) => {
        console.error('[TtsLifecycle] Error fetching TTS', err);
        this.cleanup();
        onCompleted({ completed: false, error: err });
      }
    });

    return true;
  }

  public stop(): void {
    this.clearSafetyTimer();
    this.state = 'STOPPING';

    if (this.httpSubscription) {
      this.httpSubscription.unsubscribe();
      this.httpSubscription = null;
    }

    if (this.currentAudioElement) {
      this.currentAudioElement.onended = null;
      this.currentAudioElement.pause();
      this.currentAudioElement.src = '';
      this.currentAudioElement = null;
    }

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
    if (this.currentAudioElement) {
      this.currentAudioElement.onended = null;
      this.currentAudioElement.src = '';
      this.currentAudioElement = null;
    }
    this.httpSubscription = null;
    this.state = 'IDLE';
  }
}
