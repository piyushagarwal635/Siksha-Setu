import { Injectable, Inject, PLATFORM_ID, EventEmitter } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserService } from './user.service';
import { SearchTelemetryService } from './search-telemetry.service';

export type ContrastMode = 'normal' | 'yellow-black' | 'white-black' | 'grayscale';
export type LetterSpacingMode = 'normal' | 'loose' | 'extra';
export type LineHeightMode = 'normal' | 'double';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private isBrowser: boolean;

  // Settings State
  public contrastMode: ContrastMode = 'normal';
  public fontSize: number = 16;
  public letterSpacing: LetterSpacingMode = 'normal';
  public lineHeight: LineHeightMode = 'normal';
  public dyslexiaFont: boolean = false;
  public largeCursor: boolean = false;
  public focusRuler: boolean = false;
  public soundsEnabled: boolean = true;
  public ttsEnabled: boolean = false;
  public voiceCommandsEnabled: boolean = false;
  public isSpeaking: boolean = false;

  // Speech recognition events
  public voiceCommandDetected = new EventEmitter<string>();

  // Web Speech references
  private recognition: any = null;
  private audioContext: AudioContext | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private userService: UserService,
    private telemetryService: SearchTelemetryService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    if (this.isBrowser) {
      // Whenever current user changes, reload settings
      this.userService.currentUser$.subscribe(() => {
        this.loadSettings();
      });
    } else {
      this.loadSettings();
    }
  }

  // Determine storage key dynamically based on current user
  private getSettingsKey(): string {
    if (!this.isBrowser) return 'acc_settings_anonymous';
    try {
      const currentUser = this.userService.getCurrentUser();
      const id = currentUser ? (currentUser.disabilityId || currentUser.adminId) : null;
      return id 
        ? `acc_settings_${id}` 
        : 'acc_settings_anonymous';
    } catch (e) {
      return 'acc_settings_anonymous';
    }
  }

  // Persistent Settings management
  public loadSettings() {
    if (!this.isBrowser) return;

    try {
      const key = this.getSettingsKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const settings = JSON.parse(stored);
        this.contrastMode = settings.contrastMode || 'normal';
        this.fontSize = settings.fontSize || 16;
        this.letterSpacing = settings.letterSpacing || 'normal';
        this.lineHeight = settings.lineHeight || 'normal';
        this.dyslexiaFont = !!settings.dyslexiaFont;
        this.largeCursor = !!settings.largeCursor;
        this.focusRuler = !!settings.focusRuler;
        this.soundsEnabled = settings.soundsEnabled !== false;
        this.ttsEnabled = !!settings.ttsEnabled;
      } else {
        // Fallback default setup when no settings exist
        this.contrastMode = 'normal';
        this.fontSize = 16;
        this.letterSpacing = 'normal';
        this.lineHeight = 'normal';
        this.dyslexiaFont = false;
        this.largeCursor = false;
        this.focusRuler = false;
        this.soundsEnabled = true;
        this.ttsEnabled = false;
      }

      this.applyAllStyles();
    } catch (e) {
      console.error('Failed to load accessibility settings', e);
    }
  }

  public saveSettings() {
    if (!this.isBrowser) return;

    try {
      const key = this.getSettingsKey();
      const settings = {
        contrastMode: this.contrastMode,
        fontSize: this.fontSize,
        letterSpacing: this.letterSpacing,
        lineHeight: this.lineHeight,
        dyslexiaFont: this.dyslexiaFont,
        largeCursor: this.largeCursor,
        focusRuler: this.focusRuler,
        soundsEnabled: this.soundsEnabled,
        ttsEnabled: this.ttsEnabled
      };
      localStorage.setItem(key, JSON.stringify(settings));

      this.applyAllStyles();

      // Log active accessibility features in Telemetry
      try {
        const currentUser = this.userService.getCurrentUser();
        const userId = currentUser ? (currentUser.disabilityId || currentUser.adminId) : undefined;
        
        if (this.contrastMode !== 'normal') {
          this.telemetryService.logTelemetry('ACCESSIBILITY_USE', 'Contrast Mode: ' + this.contrastMode, 'User saved high contrast settings', userId).subscribe();
        }
        if (this.fontSize !== 16) {
          this.telemetryService.logTelemetry('ACCESSIBILITY_USE', 'Font Size: ' + this.fontSize + 'px', 'User adjusted text zoom', userId).subscribe();
        }
        if (this.dyslexiaFont) {
          this.telemetryService.logTelemetry('ACCESSIBILITY_USE', 'Dyslexia Friendly Font', 'User enabled dyslexia font', userId).subscribe();
        }
        if (this.largeCursor) {
          this.telemetryService.logTelemetry('ACCESSIBILITY_USE', 'Large Cursor', 'User enabled large helper mouse cursor', userId).subscribe();
        }
        if (this.focusRuler) {
          this.telemetryService.logTelemetry('ACCESSIBILITY_USE', 'Focus Ruler Reading Bar', 'User enabled focus ruler bar', userId).subscribe();
        }
        if (this.ttsEnabled) {
          this.telemetryService.logTelemetry('ACCESSIBILITY_USE', 'Text To Speech Reader', 'User enabled text-to-speech assistant', userId).subscribe();
        }
      } catch (telErr) {
        console.error('Failed to log accessibility telemetry', telErr);
      }
    } catch (e) {
      console.error('Failed to save accessibility settings', e);
    }
  }

  // Apply Styles directly to DOM
  public applyAllStyles() {
    if (!this.isBrowser) return;

    const body = document.body;
    const html = document.documentElement;

    // Reset contrast classes
    body.classList.remove('contrast-yellow-black', 'contrast-white-black', 'contrast-grayscale');
    if (this.contrastMode === 'yellow-black') {
      body.classList.add('contrast-yellow-black');
    } else if (this.contrastMode === 'white-black') {
      body.classList.add('contrast-white-black');
    } else if (this.contrastMode === 'grayscale') {
      body.classList.add('contrast-grayscale');
    }

    // Font Size
    html.style.fontSize = `${this.fontSize}px`;

    // Letter Spacing
    body.classList.remove('spacing-loose', 'spacing-extra');
    if (this.letterSpacing === 'loose') {
      body.classList.add('spacing-loose');
    } else if (this.letterSpacing === 'extra') {
      body.classList.add('spacing-extra');
    }

    // Line Height
    body.classList.remove('line-double');
    if (this.lineHeight === 'double') {
      body.classList.add('line-double');
    }

    // Dyslexia Font
    body.classList.remove('font-dyslexia');
    if (this.dyslexiaFont) {
      body.classList.add('font-dyslexia');
    }

    // Large Cursor
    body.classList.remove('cursor-large');
    if (this.largeCursor) {
      body.classList.add('cursor-large');
    }
  }

  // TTS Reader
  public speakText(text: string, force: boolean = false) {
    if (!this.isBrowser) return;
    if (!this.ttsEnabled && !force) return;

    try {
      window.speechSynthesis.cancel();
      const cleanText = text.trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Friendly higher pitch
      
      utterance.onstart = () => {
        this.isSpeaking = true;
      };
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error', e);
      this.isSpeaking = false;
    }
  }

  public stopSpeaking() {
    if (!this.isBrowser) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  // Synthesizer Audio Tones via Web Audio API
  private initAudio() {
    if (this.audioContext) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext not supported', e);
    }
  }

  public playHoverSound() {
    if (!this.isBrowser || !this.soundsEnabled) return;
    this.initAudio();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime); // Quick pop pitch
      osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  public playClickSound() {
    if (!this.isBrowser || !this.soundsEnabled) return;
    this.initAudio();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, ctx.currentTime); // Warm confirmation ping
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  public playSuccessSound() {
    if (!this.isBrowser || !this.soundsEnabled) return;
    this.initAudio();
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const t = ctx.currentTime;

      // Note chord
      const playTone = (freq: number, startDelay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + startDelay);
        gain.gain.setValueAtTime(0.06, t + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + startDelay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + startDelay);
        osc.stop(t + startDelay + duration);
      };

      playTone(523.25, 0, 0.25);     // C5
      playTone(659.25, 0.08, 0.25);  // E5
      playTone(783.99, 0.16, 0.35);  // G5
    } catch (e) {}
  }

  // Voice Command Listener
  public startSpeechRecognition() {
    if (!this.isBrowser) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not supported in this browser.');
      return;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        if (this.isSpeaking) {
          console.log('Speech recognition ignored: TTS is speaking.');
          return;
        }
        const command = event.results[0][0].transcript.toLowerCase().trim();
        console.log('Voice Command Recognized:', command);
        this.voiceCommandDetected.emit(command);
      };

      this.recognition.onerror = (err: any) => {
        console.error('Speech recognition error event', err);
      };

      this.recognition.onend = () => {
        if (this.voiceCommandsEnabled) {
          // Restart recognition if still enabled, with a 1 second safety delay
          setTimeout(() => {
            if (this.voiceCommandsEnabled && this.recognition) {
              try {
                this.recognition.start();
              } catch (e) {
                console.error('Failed to restart speech recognition', e);
              }
            }
          }, 1000);
        }
      };

      this.voiceCommandsEnabled = true;
      this.recognition.start();
      this.playSuccessSound();
    } catch (e) {
      console.error('Error starting speech recognition', e);
    }
  }

  public stopSpeechRecognition() {
    this.voiceCommandsEnabled = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition = null;
      } catch (e) {}
    }
  }
}
