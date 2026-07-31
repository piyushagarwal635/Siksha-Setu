import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { environment } from '../../environments/environment';
import { BehaviorSubject, firstValueFrom, filter } from 'rxjs';
import { UserService } from './user.service';
import { AccessibilityService, ContrastMode } from './accessibility.service';
import { ConversationState } from './conversation-state.enum';
import { MicLifecycleManager, MicSessionResult } from './mic-lifecycle-manager';
import { TtsLifecycleManager } from './tts-lifecycle-manager';
import { ReactiveContextService } from './ai-semantic-engine/reactive-context.service';
import { SemanticContextSerializer } from './ai-semantic-engine/semantic-context-serializer.service';
import { IntentClassifier } from './ai-planner/intent-classifier.service';
import { LlmTaskPlanner } from './ai-planner/llm-task-planner.service';
import { StepExecutor } from './ai-planner/step-executor.service';
import { ExperienceEngine } from './ai-experience/experience-engine.service';
import { AdaptiveGuidanceService } from './ai-experience/adaptive-guidance.service';
import { TaskMemoryService } from './ai-memory/task-memory.service';
import { ToastService } from './toast.service';
import { ActionValidator } from './ai-planner/action-validator.service';

declare var window: any;

@Injectable({
  providedIn: 'root'
})
export class AiVoiceAssistantService {
  // --- Phase 1: Conversation State Machine ---
  private conversationStateSubject = new BehaviorSubject<ConversationState>(ConversationState.INACTIVE);
  public conversationState$ = this.conversationStateSubject.asObservable();

  public get currentState(): ConversationState {
    return this.conversationStateSubject.value;
  }

  /**
   * State Transition Guard
   * Validates and executes state transitions for the Voice Session Controller.
   * Returns true if transition was successful, false if rejected.
   */
  public transitionState(newState: ConversationState): boolean {
    const currentState = this.currentState;

    // Self-transitions are idempotent and succeed
    if (currentState === newState) {
      console.log(`[Voice Session] Idempotent self-transition to ${newState}`);
      return true;
    }

    // Deactivation is universally allowed
    if (newState === ConversationState.INACTIVE) {
      this.conversationStateSubject.next(newState);
      return true;
    }

    let isValid = false;

    switch (currentState) {
      case ConversationState.INACTIVE:
        if (newState === ConversationState.CONSENT || newState === ConversationState.LISTENING) isValid = true;
        break;

      case ConversationState.CONSENT:
        if (newState === ConversationState.SPEAKING) isValid = true; // User said Yes
        break;

      case ConversationState.IDLE:
        if (newState === ConversationState.LISTENING || newState === ConversationState.SPEAKING) isValid = true;
        break;

      case ConversationState.LISTENING:
        if (newState === ConversationState.PROCESSING || newState === ConversationState.IDLE || newState === ConversationState.SPEAKING) isValid = true;
        break;

      case ConversationState.PROCESSING:
        if (newState === ConversationState.SPEAKING || newState === ConversationState.IDLE || newState === ConversationState.ERROR) isValid = true;
        break;

      case ConversationState.SPEAKING:
        if (newState === ConversationState.LISTENING || newState === ConversationState.PROCESSING) isValid = true;
        break;

      case ConversationState.ERROR:
        if (newState === ConversationState.IDLE) isValid = true;
        break;
    }

    if (isValid) {
      console.log(`[Voice Session] Transition: ${currentState} -> ${newState}`);
      this.conversationStateSubject.next(newState);
      return true;
    } else {
      console.error(`[Voice Session] ILLEGAL TRANSITION REJECTED: ${currentState} -> ${newState}`);
      return false;
    }
  }

  // --- Phase 1: Timer Registry ---
  private activeTimers = new Map<string, any>();

  /**
   * Registers a timer with the given name. If a timer with the same name
   * already exists, it is cleared before the new one is registered.
   */
  public registerTimer(name: string, timerId: any): void {
    if (this.activeTimers.has(name)) {
      clearTimeout(this.activeTimers.get(name));
    }
    this.activeTimers.set(name, timerId);
  }

  /**
   * Clears a specific timer by name.
   */
  public clearTimer(name: string): void {
    if (this.activeTimers.has(name)) {
      clearTimeout(this.activeTimers.get(name));
      this.activeTimers.delete(name);
    }
  }

  /**
   * Clears all registered timers. Used during session cancellation or deactivation.
   */
  public clearAllTimers(): void {
    this.activeTimers.forEach((timerId) => clearTimeout(timerId));
    this.activeTimers.clear();
  }

  // --- Phase 1: Session Token Infrastructure ---
  private currentSessionToken: number = 0;

  /**
   * Starts a new session by incrementing the session token.
   * Any pending async operations holding older tokens will be invalidated.
   */
  public startNewSession(): number {
    this.currentSessionToken++;
    return this.currentSessionToken;
  }

  /**
   * Returns the current session token.
   */
  public getCurrentSessionToken(): number {
    return this.currentSessionToken;
  }

  /**
   * Checks if the provided token matches the active session.
   * Used in async callbacks to prevent orphaned responses from executing.
   */
  public isValidSession(token: number): boolean {
    return this.currentSessionToken === token;
  }

  // --- Phase 1: Mic Lifecycle Manager ---
  private micManager = new MicLifecycleManager();

  // --- Phase 1: Tts Lifecycle Manager ---
  private ttsManager!: TtsLifecycleManager;

  // --- Legacy Flags (To be phased out by Step 14) ---
  private isListeningSubject = new BehaviorSubject<boolean>(false);
  public isListening$ = this.isListeningSubject.asObservable();

  private isEnabledSubject = new BehaviorSubject<boolean>(false);
  public isEnabled$ = this.isEnabledSubject.asObservable();

  // Generated on page load. Resets on refresh so AI doesn't remember cleared form data.
  private guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 12);

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private silenceTimer: any;
  private isProcessing: boolean = false;
  private stream: MediaStream | null = null;

  private currentAudioElement: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private isMutedForSecurity = false;
  private ttsEndedAt: number = 0; // timestamp when last TTS finished (for echo guard)

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private accessibilityService: AccessibilityService,
    private reactiveContextService: ReactiveContextService,
    private semanticContextSerializer: SemanticContextSerializer,
    private intentClassifier: IntentClassifier,
    private llmTaskPlanner: LlmTaskPlanner,
    private stepExecutor: StepExecutor,
    private experienceEngine: ExperienceEngine,
    private adaptiveGuidanceService: AdaptiveGuidanceService,
    private taskMemory: TaskMemoryService,
    private toastService: ToastService,
    private actionValidator: ActionValidator
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.ttsManager = new TtsLifecycleManager(this.http, environment.apiUrl);

      this.toastService.toastEvents$.subscribe(event => {
        if (this.isEnabledSubject.value) {
          this.requestSpeak(event.message);
        }
      });

      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        // Page narration disabled: navigation reply is already spoken by the action handler.
        // Triggering a second Gemini call here caused double-turn loops.
        // The mic opens automatically after TTS ends via requestListen().
      });
    }
  }

  private triggerPageNarration() {
    const sessionToken = this.startNewSession();
    const currentUser = this.userService.getCurrentUser();
    const payloadUserId = currentUser?.disabilityId || currentUser?.adminId || this.guestSessionId;
    const diagnosticId = `nav_${Date.now()}`;

    const payload = {
      audioBase64: "", // Empty triggers text fallback
      pageContext: this.buildDynamicContext(),
      userId: payloadUserId,
      isTestMode: this.router.url.includes('secure-test'),
      diagnosticId: diagnosticId
    };

    this.isProcessing = true;
    this.transitionState(ConversationState.PROCESSING);

    this.http.post<any>(`${environment.apiUrl}/api/voice/ask`, payload).subscribe({
      next: (response) => {
        if (!this.isValidSession(sessionToken)) return;
        this.isProcessing = false;
        if (response.reply) {
          this.requestSpeak(response.reply, () => {
            if (!this.isValidSession(sessionToken)) return;
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
          }, response.language || 'hi');
        } else {
          this.transitionState(ConversationState.IDLE);
          if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
        }
      },
      error: () => {
        if (!this.isValidSession(sessionToken)) return;
        this.isProcessing = false;
        this.transitionState(ConversationState.IDLE);
        if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
      }
    });
  }

  public initAssistant() {
    if (!isPlatformBrowser(this.platformId)) return;

    const activePlan = this.taskMemory.getActivePlan();
    if (activePlan) {
      this.enableAssistant(false);
      this.resumeActivePlan(activePlan);
      return;
    }

    const guestPref = localStorage.getItem('aiVoiceGuestPref');
    if (guestPref === 'true') {
      this.enableAssistant(false);
    } else if (guestPref === 'false' || guestPref === 'sleeping') {
      this.disableAssistant(true);
    } else {
      // First time guest - ask for activation consent
      this.triggerMitrapOnInteraction();
    }
  }

  public executeCommand(command: 'CMD_ACTIVATE' | 'CMD_DEACTIVATE', payload?: any) {
    if (command === 'CMD_ACTIVATE') {
      if (this.isEnabledSubject.value && !this.isSleeping) return; // Prevent double activation interrupting loops
      this.isSleeping = false;
      if (payload?.isFirstInteraction) {
        this.triggerMitrapOnInteraction();
      } else {
        this.enableAssistant(payload?.speakWelcome !== false);
      }
    } else if (command === 'CMD_DEACTIVATE') {
      this.disableAssistant(payload?.silent === true);
    }
  }

  private triggerMitrapOnInteraction() {
    const guestPref = localStorage.getItem('aiVoiceGuestPref');
    if (guestPref === 'true') {
      this.enableAssistant(false);
    } else if (guestPref === null || guestPref === 'pending') {
      localStorage.setItem('aiVoiceGuestPref', 'pending');
      this.playTTS("Welcome to Divya Mitra. Would you like to activate the AI Voice Assistant? Say Yes to activate or No to disable.", () => {
        this.startListening(true);
      });
    }
  }

  private resumeActivePlan(plan: any) {
    this.playTTS("It looks like you were in the middle of a task. Continuing where we left off.", () => {
      this.isProcessing = true;
      this.stepExecutor.executePlan(plan, async (action) => {
        try {
          return this.executeAction(action);
        } catch (e) {
          return false;
        }
      }).then(() => {
        if (plan.status === 'COMPLETED') {
          this.experienceEngine.recordTaskSuccess();
          this.requestSpeak("Task completed.", () => {
            this.isProcessing = false;
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
          });
        } else {
          this.requestSpeak("Task failed to resume. Please try again.", () => {
            this.isProcessing = false;
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
          });
        }
      });
    });
  }

  private hasSpokenSessionWelcome = false;
  private isSleepingSubject = new BehaviorSubject<boolean>(false);
  public isSleeping$ = this.isSleepingSubject.asObservable();

  public get isSleeping(): boolean {
    return this.isSleepingSubject.value;
  }
  public set isSleeping(value: boolean) {
    this.isSleepingSubject.next(value);
  }

  private enableAssistant(speakWelcome: boolean = true) {
    this.isEnabledSubject.next(true);
    localStorage.setItem('aiVoiceGuestPref', 'true');

    // Sync with database if logged in
    const user = this.userService.getCurrentUser();
    if (user) {
      user.aiVoiceEnabled = true;
      const userId = user.disabilityId || user.adminId;
      if (userId) {
        this.http.post(`${environment.apiUrl}/api/voice/preferences`, { userId, enabled: true }).subscribe();
      }
    }

    if (speakWelcome && !this.hasSpokenSessionWelcome) {
      this.hasSpokenSessionWelcome = true;
      const welcomeMsg = "Voice Assistant is now active. I am your Divya Mitra Accessibility Companion. How can I help you today?";
      this.transitionState(ConversationState.CONSENT);
      this.requestSpeak(welcomeMsg, () => {
        this.requestListen(true);
      });
    } else {
      this.requestListen(); // Migrated Step 7 call site
    }
  }

  private disableAssistant(silent: boolean = false) {
    this.isSleeping = true;
    this.isEnabledSubject.next(true); // Keep hardware looping for wake words
    localStorage.setItem('aiVoiceGuestPref', 'sleeping');

    this.ttsManager.stop(); // Stop any playing TTS immediately
    this.stopAnyRecording();

    // Sync with database if logged in
    const user = this.userService.getCurrentUser();
    if (user) {
      user.aiVoiceEnabled = false;
      const userId = user.disabilityId || user.adminId;
      if (userId) {
        this.http.post(`${environment.apiUrl}/api/voice/preferences`, { userId, enabled: false }).subscribe();
      }
    }

    const afterSleep = () => {
      // Force clean state and restart listening for wake word
      this.conversationStateSubject.next(ConversationState.IDLE);
      if (!this.isMutedForSecurity) {
        setTimeout(() => this.requestListen(), 300);
      }
    };

    if (!silent) {
      // Use requestSpeak (state-machine-aware) so recovery always works
      this.conversationStateSubject.next(ConversationState.IDLE); // force IDLE before speak
      this.requestSpeak(
        "Sleep mode mein aa gaya hun. Wake up karne ke liye 'Divya Mitra wake up' bolein.",
        afterSleep,
        'hi'
      );
    } else {
      afterSleep();
    }
  }

  public sleepAssistant() {
    this.stopAnyRecording();
    setTimeout(() => {
      if (this.isEnabledSubject.value) this.startListening();
    }, 1000);
  }

  public setSecurityMute(mute: boolean) {
    this.isMutedForSecurity = mute;
    if (mute) {
      this.stopAnyRecording();
    } else {
      if (this.isEnabledSubject.value) {
        this.startListening();
      }
    }
  }

  private stopAnyRecording() {
    // Route hardware stop through MicLifecycleManager
    this.micManager.stop();
    this.isListeningSubject.next(false);
  }

  /**
   * Phase 1: Controller API for opening the mic.
   * This is the strictly guarded entry point for the new state machine.
   */
  public requestListen(isMitrap: boolean = false): void {
    if (this.transitionState(ConversationState.LISTENING)) {
      this.startListening(isMitrap);
    }
  }

  /**
   * Phase 1: Controller API for speech synthesis.
   * This is the strictly guarded entry point for the new state machine.
   */
  public requestSpeak(text: string, onEnd?: () => void, language?: string): void {
    if (this.isMutedForSecurity || !this.isEnabledSubject.value) return;

    // If stuck in ERROR, reset to IDLE first so transition can proceed
    if (this.currentState === ConversationState.ERROR) {
      this.conversationStateSubject.next(ConversationState.IDLE);
    }

    if (!this.transitionState(ConversationState.SPEAKING)) {
      // State guard rejected — force IDLE and recover mic so assistant never silently dies
      console.warn(`[Voice Session] requestSpeak blocked from state: ${this.currentState}. Forcing recovery.`);
      this.conversationStateSubject.next(ConversationState.IDLE);
      setTimeout(() => { if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen(); }, 300);
      return;
    }

    this.isSpeaking = true; // Block mic interruptions while fetching TTS audio

    // Auto-pause playing media so TTS audio doesn't overlap
    const mediaElements = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
    const pausedMedia = mediaElements.filter(m => !m.paused);
    pausedMedia.forEach(m => m.pause());

    const profile = this.experienceEngine.getProfile();
    const speed = profile.speechSpeed || 1.0;

    this.ttsManager.speak(
      text,
      language || 'hi',
      () => {
        this.isSpeaking = true;
        // Open mic for barge-in (user can interrupt AI while it speaks)
        if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
          this.startListening();
        }
      },
      (result) => {
        this.isSpeaking = false;
        this.ttsEndedAt = Date.now(); // mark when AI stopped speaking

        // Auto-resume media that was playing before TTS
        pausedMedia.forEach(m => {
          m.play().catch(e => console.log('Media autoplay prevented', e));
        });

        // Force state out of SPEAKING using direct next() so guard doesn't block
        this.conversationStateSubject.next(ConversationState.IDLE);

        if (onEnd) {
          onEnd();
        } else if (this.isEnabledSubject.value && !this.isListeningSubject.value && !this.isMutedForSecurity) {
          this.requestListen();
        }
      },
      speed
    );
  }

  private startListening(isMitrap: boolean = false) {
    if (this.isMutedForSecurity || this.isListeningSubject.value) return;

    this.isProcessing = false;
    this.browserTranscript = ''; // Reset transcript for new session

    // Start browser STT in parallel with mic recording (fast transcript path)
    this.initSpeechRecognition();
    if (this.speechRecognition) {
      try {
        this.speechRecognition.lang = 'hi-IN';
        this.speechRecognition.start();
        console.log('[BrowserSTT] Started recognition');
      } catch (e) {
        console.warn('[BrowserSTT] Could not start:', e);
      }
    }
    const started = this.micManager.open(
      (result: MicSessionResult) => {
        if (!this.isMutedForSecurity) {
          this.isListeningSubject.next(false);
          if (result.userSpoke) {
            this.audioChunks = result.blob ? [result.blob] : [];
            this.processAudio(isMitrap);
          } else {
            if (this.isEnabledSubject.value) {
              setTimeout(() => this.startListening(isMitrap), 200);
            }
          }
        }
      },
      () => {
        // onSpoke interruption logic
        if (this.isSpeaking) {
          this.ttsManager.stop();
          this.isSpeaking = false;
        }
      },
      () => this.isSpeaking,
      () => this.isListeningSubject.value
    );

    if (started) {
      this.isListeningSubject.next(true);
    }
  }



  private detectSilenceAndInterruption(stream: MediaStream, onUserSpoke: () => void) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      setTimeout(() => { if (this.mediaRecorder && this.mediaRecorder.state === 'recording') this.mediaRecorder.stop(); }, 5000);
      return;
    }

    this.audioContext = new AudioContextClass();
    this.analyser = this.audioContext!.createAnalyser();
    this.microphone = this.audioContext!.createMediaStreamSource(stream);
    this.microphone.connect(this.analyser);
    this.analyser.fftSize = 512;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      if (!this.isListeningSubject.value || !this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      let average = sum / bufferLength;

      const mediaElements = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      const isMediaPlaying = mediaElements.some(m => !m.paused && !m.muted);

      if (this.isSpeaking) {
        // While AI is speaking, ignore speaker playback so AI never transcribes its own neural voice.
        // Barge-in is temporarily disabled to prevent echo feedback loops where the AI interrupts itself.
      } else {
        const threshold = isMediaPlaying ? 85 : 25; // If video is playing, require a loud shout to trigger mic
        if (average > threshold) {
          onUserSpoke();

          clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.mediaRecorder.stop();
            }
          }, 2500); // Wait 2.5 seconds instead of 900ms for natural pauses
        }
      }

      if (this.isListeningSubject.value) {
        requestAnimationFrame(checkAudio);
      }
    };

    checkAudio();

    // Max record limit 60s failsafe to keep mic open "always"
    setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') this.mediaRecorder.stop();
    }, 60000);
  }

  // Browser Speech Recognition instance (reused across sessions)
  private speechRecognition: any = null;
  private browserTranscript: string = '';

  private initSpeechRecognition(): void {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass || this.speechRecognition) return;
    this.speechRecognition = new SpeechRecognitionClass();
    this.speechRecognition.continuous = false;
    this.speechRecognition.interimResults = false;
    this.speechRecognition.lang = 'hi-IN'; // Hindi + English
    this.speechRecognition.maxAlternatives = 1;
    this.speechRecognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      this.browserTranscript = result;
      console.log(`[BrowserSTT] Transcript captured: "${result}"`);
    };
    this.speechRecognition.onerror = (e: any) => {
      console.warn('[BrowserSTT] Error:', e.error);
      this.browserTranscript = '';
    };
    this.speechRecognition.onend = () => {
      console.log('[BrowserSTT] Recognition ended');
    };
  }

  private processAudio(isMitrap: boolean) {
    const sessionToken = this.getCurrentSessionToken();

    if (this.audioChunks.length === 0) {
      if (this.isEnabledSubject.value) {
        this.transitionState(ConversationState.IDLE);
        setTimeout(() => this.requestListen(), 500);
      }
      return;
    }

    // ── Simple Echo Guard ─────────────────────────────────────────────────────
    // If AI just stopped speaking < 1.5s ago AND audio chunk is tiny → echo, discard.
    const timeSinceTts = Date.now() - this.ttsEndedAt;
    const audioSize = this.audioChunks.reduce((s, b) => s + b.size, 0);
    if (timeSinceTts < 1500 && audioSize < 5000 && this.ttsEndedAt > 0) {
      console.warn('[EchoGuard] Discarding tiny audio captured right after TTS ended.');
      this.conversationStateSubject.next(ConversationState.IDLE);
      setTimeout(() => this.requestListen(), 300);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Fast client-side sleep/wake detection ────────────────────────────────
    // Check BEFORE backend call for instant response.
    const rawTranscript = (this.browserTranscript || '').toLowerCase().trim();

    const WAKE_WORDS = ['wake up', 'activate', 'chalu karo', 'jago', 'shuru karo', 'divya mitra on', 'start'];
    const SLEEP_WORDS = ['so jao', 'sleep mode', 'band karo', 'so ja', 'mute kar'];

    if (rawTranscript && this.isSleeping && WAKE_WORDS.some(w => rawTranscript.includes(w))) {
      this.isSleeping = false;
      localStorage.setItem('aiVoiceGuestPref', 'true');
      this.conversationStateSubject.next(ConversationState.IDLE);
      this.requestSpeak(
        'Divya Mitra active ho gaya. Boliye, main sun raha hun.',
        () => { if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen(); },
        'hi'
      );
      return;
    }

    if (rawTranscript && !this.isSleeping && !isMitrap && !this.isSpeaking && SLEEP_WORDS.some(w => rawTranscript.includes(w))) {
      this.disableAssistant(false);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);

    reader.onloadend = () => {
      if (!this.isValidSession(sessionToken)) return;
      let base64Audio = (reader.result as string).split(',')[1];

      const currentUser = this.userService.getCurrentUser();
      const payloadUserId = currentUser?.disabilityId || currentUser?.adminId || this.guestSessionId;
      const diagnosticId = `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      console.group(`[Diagnostic] Voice Request Started (${diagnosticId})`);
      console.log(`[Diagnostic] Route: ${this.router.url}`);

      const dynamicContextPayload = this.buildDynamicContext();
      if ((environment as any).useSemanticEngine) {
        const latestContext = this.reactiveContextService.getLatestContext();
        console.log(`[Diagnostic] SemanticContext Version: ${latestContext?.version}`);
        console.log(`[Diagnostic] reactiveContextService.getCurrentContext() JSON:`, JSON.stringify(latestContext, null, 2));
      }
      console.groupEnd();

      const payload = {
        audioBase64: this.browserTranscript ? '' : base64Audio, // Skip audio blob when browser STT has transcript
        transcript: this.browserTranscript || '',               // Fast path: text directly to Gemini
        pageContext: dynamicContextPayload,
        userId: payloadUserId,
        isTestMode: this.router.url.includes('secure-test'),
        diagnosticId: diagnosticId
      };

      console.log(`[Diagnostic] Mode: ${this.browserTranscript ? 'FAST (Browser STT)' : 'SLOW (Audio Blob)'}`);
      console.log(`[Diagnostic] Transcript: ${this.browserTranscript || '(none)'}`);

      // Violation #1 fix: transition state machine to PROCESSING before firing HTTP request
      if (!isMitrap) {
        this.isProcessing = true;
        this.transitionState(ConversationState.PROCESSING);
      }

      this.http.post<any>(`${environment.apiUrl}/api/voice/ask`, payload).subscribe({
        next: (response) => {
          if (!this.isValidSession(sessionToken)) return;
          this.isProcessing = false;
          let replyText = response.reply || '';
          let transcript = (response.transcript || '').toLowerCase();
          let language = response.language || 'hi';
          let intent = response.intent || 'SIMPLE';

          if (!isMitrap && (transcript === '[silence/noise]' || transcript.trim() === '')) {
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
              setTimeout(() => {
                if (!this.isValidSession(sessionToken)) return;
                this.requestListen();
              }, 400);
            }
            return;
          }

          if (isMitrap) {
            if (transcript.includes('no') || transcript.includes('nahi') || transcript.includes('nhi') || transcript.includes('disable') || transcript.includes('stop')) {
              this.disableAssistant(false);
              return;
            } else {
              this.enableAssistant(true);
              return;
            }
          }

          if (this.isSleeping) {
            if (transcript.includes('activate') || transcript.includes('chalu') || transcript.includes('on') || transcript.includes('wake') || transcript.includes('jago')) {
              this.isSleeping = false;

              // Persist activation so it doesn't revert to sleep mode on refresh
              localStorage.setItem('aiVoiceGuestPref', 'true');
              const user = this.userService.getCurrentUser();
              if (user) {
                user.aiVoiceEnabled = true;
                const userId = user.disabilityId || user.adminId;
                if (userId) {
                  this.http.post(`${environment.apiUrl}/api/voice/preferences`, { userId, enabled: true }).subscribe();
                }
              }

              replyText = language === 'hi' ? "Divya Mitra voice assistant activate ho gaya hai. Boliye." : "Divya Mitra voice assistant is now active.";
              this.requestSpeak(replyText, () => {
                if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
              }, language);
            } else {
              // Ignore everything else, stay asleep
              if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
                this.transitionState(ConversationState.IDLE);
                setTimeout(() => this.requestListen(), 500);
              }
            }
            return;
          }

          const sleepPhrases = ['go to sleep', 'sleep mode', 'so jao', 'band ho jao', 'disable assistant', 'stop listening'];
          const isSleepCommand = transcript === 'sleep' || sleepPhrases.some(p => transcript.includes(p));
          if (!this.isSleeping && isSleepCommand) {
            this.disableAssistant(false);
            return;
          }

          // NONE intent — silence detected, re-listen silently without speaking
          if (intent === 'NONE' || replyText.trim() === '') {
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
              setTimeout(() => { if (this.isValidSession(sessionToken)) this.requestListen(); }, 300);
            }
            return;
          }

          // Enrollment check: enrolled = "Continue Learning" button present OR no "Enroll" button visible
          const isCourseDashboard = this.router.url.includes('course-dashboard') || this.router.url.includes('/course/');
          const enrollButton = document.querySelector('button[data-ai-id*="enroll"], button[aria-label*="Enroll" i]');
          const continueBtn = document.querySelector('button[aria-label*="Continue" i], a[aria-label*="Continue" i]');
          const isActuallyEnrolled = !enrollButton && !!continueBtn;

          if (isCourseDashboard && transcript.includes('enroll')) {
            if (isActuallyEnrolled) {
              const isStudyIntent = transcript.includes('padh') || transcript.includes('read') || transcript.includes('study');
              if (isStudyIntent) {
                this.startReadingMode();
                return;
              } else {
                replyText = language === 'hi' ? "Aap pehle se enrolled hain. Resources list mein se chunein." : "You are already enrolled. Select a resource to study.";
              }
              this.requestSpeak(replyText, () => {
                if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
              }, language);
              return;
            }
          }

          if (intent === 'COMPLEX' && (environment as any).useSemanticEngine) {
            replyText = language === 'hi' ? "Main aapki request samajh gaya, steps plan kar raha hu..." : "I understood, planning the steps...";
            this.requestSpeak(replyText, () => { }, language);
            this.handleComplexIntent(transcript, language, diagnosticId);
            return;
          }



          const isNavAction = response.action && response.action.type === 'NAVIGATE';

          if (response.action && response.action.type === 'INPUT_TEXT') {
            console.log(`[Diagnostic] Planner Output for INPUT_TEXT:`, JSON.stringify({
              selector: response.action.target,
              value: response.action.value
            }, null, 2));
          }

          if (response.action && response.action.type.startsWith('READ_')) {
            try {
              this.executeAction(response.action);
            } catch (e) {
              console.error("Error executing READ action", e);
            }
            return;
          }

          let actionSuccess = true;
          if (response.action && !isNavAction && response.action.type !== 'SLEEP') {
            try {
              actionSuccess = this.executeAction(response.action);
            } catch (e) {
              console.error("Error executing action", e);
              actionSuccess = false;
            }
          }

          if (response.action && !isNavAction && response.action.type !== 'SLEEP' && !actionSuccess) {
            replyText = this.getActionFailureMessage(language);
          }

          if (response.action && response.action.type === 'SLEEP') {
            this.isSleeping = true;
            replyText = language === 'hi' ? "Main sleep mode me jaa raha hu. Wake up karne ke liye 'Divya Mitra activate' bolein." : "Going to sleep mode. Say 'Divya Mitra activate' to wake me up.";
            this.requestSpeak(replyText, () => {
              if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
                this.transitionState(ConversationState.IDLE);
                this.requestListen();
              }
            }, language);
            return;
          }

          if (isNavAction) {
            // Step 10: NAVIGATE Command Protocol
            const performNavigation = () => {
              if (response.action.target) {
                // Establish clean cancellation boundary for async ops
                const newSessionToken = this.startNewSession();

                this.router.navigateByUrl(response.action.target).then(success => {
                  if (!this.isValidSession(newSessionToken)) return;
                  // Violation #2 fix: success branch was missing — loop terminated here permanently
                  this.transitionState(ConversationState.IDLE);
                  if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
                  if (!success) {
                    console.warn("[Voice Session] Navigation rejected by router.");
                  }
                }).catch(err => {
                  if (!this.isValidSession(newSessionToken)) return;
                  console.error("[Voice Session] Navigation failed:", err);
                  this.transitionState(ConversationState.ERROR);
                  setTimeout(() => {
                    if (!this.isValidSession(newSessionToken)) return;
                    this.transitionState(ConversationState.IDLE);
                    if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
                  }, 3000);
                });
              } else {
                if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
              }
            };

            if (replyText) {
              this.requestSpeak(replyText, () => {
                performNavigation();
              }, language);
            } else {
              performNavigation();
            }
          } else {
            // Violation #3 fix: replace playTTS+startListening with guarded requestSpeak+requestListen
            if (replyText) {
              this.requestSpeak(replyText, () => {
                if (!this.isValidSession(sessionToken)) return;
                if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
                  this.requestListen();
                }
              }, language);
            } else if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
              this.transitionState(ConversationState.IDLE);
              setTimeout(() => {
                if (!this.isValidSession(sessionToken)) return;
                this.requestListen();
              }, 400);
            }
          }
        },
        error: (err) => {
          if (!this.isValidSession(sessionToken)) return;
          this.isProcessing = false;
          console.error("Voice AI Error", err);
          // Violation #4 fix: error path also used raw playTTS+startListening
          this.transitionState(ConversationState.ERROR);
          this.requestSpeak("Sorry, I encountered a network error.", () => {
            if (!this.isValidSession(sessionToken)) return;
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
              setTimeout(() => {
                if (!this.isValidSession(sessionToken)) return;
                this.requestListen();
              }, 400);
            }
          });
        }
      });
    };
  }

  // Phase 4: Dynamic Structured Context Tracking State
  private activeCourseState: { id?: string; title?: string } | null = null;
  private activeLessonState: { index?: number; title?: string } | null = null;
  private activeResourceState: { id?: string; title?: string; format?: string } | null = null;
  private activeReadingState: { isReading: boolean; currentChunk: number; totalChunks: number } = { isReading: false, currentChunk: 0, totalChunks: 0 };
  private activePlaybackState: { isPlaying: boolean; mediaType?: string; currentTime?: number; duration?: number } = { isPlaying: false };

  public updateActiveContext(contextUpdate: {
    course?: { id?: string; title?: string } | null;
    lesson?: { index?: number; title?: string } | null;
    resource?: { id?: string; title?: string; format?: string } | null;
    reading?: { isReading: boolean; currentChunk: number; totalChunks: number };
    playback?: { isPlaying: boolean; mediaType?: string; currentTime?: number; duration?: number };
  }) {
    if (contextUpdate.course !== undefined) this.activeCourseState = contextUpdate.course;
    if (contextUpdate.lesson !== undefined) this.activeLessonState = contextUpdate.lesson;
    if (contextUpdate.resource !== undefined) this.activeResourceState = contextUpdate.resource;
    if (contextUpdate.reading !== undefined) this.activeReadingState = contextUpdate.reading;
    if (contextUpdate.playback !== undefined) this.activePlaybackState = contextUpdate.playback;
  }

  private async handleComplexIntent(transcript: string, language: string, diagnosticId: string) {
    this.isProcessing = true;
    this.transitionState(ConversationState.PROCESSING);
    try {
      const context = this.reactiveContextService.getLatestContext();
      const plan = await this.llmTaskPlanner.generatePlan(transcript, context, diagnosticId);

      if (plan && plan.steps && plan.steps.length > 0) {
        // DIAGNOSTIC FIX 1: Ensure action validator checks plan against current context
        this.actionValidator.validatePlan(plan, context!);

        await this.stepExecutor.executePlan(plan, async (action) => {
          try {
            return this.executeAction(action);
          } catch (e) {
            return false;
          }
        });

        if (plan.status === 'COMPLETED') {
          this.experienceEngine.recordTaskSuccess();
          this.requestSpeak(language === 'hi' ? "Task complete ho gaya hai." : "Task completed.", () => {
            this.isProcessing = false;
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
          }, language);
        } else {
          this.requestSpeak(language === 'hi' ? "Task poora nahi ho paya." : "Task failed.", () => {
            this.isProcessing = false;
            this.transitionState(ConversationState.IDLE);
            if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
          }, language);
        }
      }
    } catch (err) {
      console.error("Plan execution failed", err);
      this.requestSpeak(language === 'hi' ? "Plan generate karne mein error aaya." : "Error generating plan.", () => {
        this.isProcessing = false;
        this.transitionState(ConversationState.IDLE);
        if (this.isEnabledSubject.value && !this.isMutedForSecurity) this.requestListen();
      }, language);
    }
  }

  private buildDynamicContext(): string {
    if ((environment as any).useSemanticEngine) {
      const adaptiveContext = this.adaptiveGuidanceService.buildAdaptiveContextPayload();
      return this.semanticContextSerializer.serialize(adaptiveContext);
    }

    const currentUser = this.userService.getCurrentUser();

    // Temporarily hide unwanted elements on the live DOM to get accurate visible innerText
    const hiddenElements: { el: HTMLElement, origDisplay: string }[] = [];
    const unwantedSelectors = [
      'header', 'nav', 'footer', 'script', 'style', '.visually-hidden', '.sr-only', '.skip-link',
      '.accessibility-toolbar', '.theme-controls', '.cursor-controls', '.dev-controls', '.accessibility-widget', '.dev-tools', '.floating-actions',
      '.accessibility-panel', '#accessibility-panel', '.voice-controls', '#voice-controls', '.font-controls', '#font-controls',
      '[aria-label*="accessibility" i]', '[aria-label*="theme" i]'
    ];

    unwantedSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const htmlEl = el as HTMLElement;
        hiddenElements.push({ el: htmlEl, origDisplay: htmlEl.style.display });
        htmlEl.style.display = 'none';
      });
    });

    const pageText = document.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 50000);

    // Restore original display
    hiddenElements.forEach(item => {
      item.el.style.display = item.origDisplay;
    });

    let aiIdCounter = 0;
    const extractElements = (selector: string, type: string) => {
      return Array.from(document.querySelectorAll(selector)).map((el: any) => {
        if (el.type === 'color' || el.type === 'hidden' || el.type === 'file') return null;
        // Semantic Context Noise Reduction
        if (el.closest('.accessibility-toolbar, .theme-controls, .cursor-controls, .dev-controls, .accessibility-widget, .dev-tools, .accessibility-panel, #accessibility-panel, .voice-controls, #voice-controls, .font-controls, #font-controls')) {
          return null;
        }

        if (!el.hasAttribute('data-ai-id')) {
          el.setAttribute('data-ai-id', `ai-${type}-${aiIdCounter++}`);
        }
        let name = el.getAttribute('aria-label') || el.title || (el.innerText ? el.innerText.trim().replace(/\s+/g, ' ').substring(0, 80) : '') || el.placeholder || el.name;
        if (!name && type === 'link') name = el.getAttribute('href');
        const targetSelector = el.id ? `#${el.id}` : `[data-ai-id="${el.getAttribute('data-ai-id')}"]`;
        let valStr = '';
        if (type === 'input') {
          const currentVal = el.value || '';
          valStr = currentVal ? ` [FILLED: "${currentVal}"]` : ` [EMPTY]`;
          if (el.tagName.toLowerCase() === 'select') {
            const options = Array.from((el as HTMLSelectElement).options)
              .filter(o => o.value !== '')
              .map(o => o.text).join(', ');
            if (options) valStr += ` [OPTIONS: ${options}]`;
          }
        }
        return name ? `${type}: ${name}${valStr} (Target: ${targetSelector})` : null;
      }).filter(item => item !== null) as string[];
    };

    const links = extractElements('a', 'link');
    const buttons = extractElements('button, [role="button"]', 'button');
    const inputs = extractElements('input, select, textarea', 'input');

    const structuredContext = {
      currentPage: this.router.url,
      currentScreen: this.getScreenNameFromUrl(this.router.url),
      currentCourse: this.activeCourseState,
      currentLesson: this.activeLessonState,
      currentResource: this.activeResourceState,
      currentUserState: {
        isAuthenticated: !!currentUser,
        userId: currentUser?.disabilityId || currentUser?.adminId || null,
        role: currentUser?.role || (currentUser?.adminId ? 'ADMIN' : 'STUDENT'),
        aiVoiceEnabled: this.isEnabledSubject.value
      },
      readingState: this.activeReadingState,
      playbackState: this.activePlaybackState,
      interactiveElements: {
        links: links,
        buttons: buttons,
        inputs: inputs
      },
      visiblePageTextContent: pageText
    };

    return JSON.stringify(structuredContext, null, 2);
  }

  private getScreenNameFromUrl(url: string): string {
    if (url.includes('secure-test')) return 'SECURE_TEST_SCREEN';
    if (url.includes('course-dashboard') || url.includes('/courses/')) return 'COURSE_DASHBOARD_SCREEN';
    if (url.includes('admin-dashboard')) return 'ADMIN_DASHBOARD_SCREEN';
    if (url.includes('student-dashboard')) return 'STUDENT_DASHBOARD_SCREEN';
    if (url.includes('braille')) return 'BRAILLE_SCREEN';
    if (url.includes('login')) return 'LOGIN_SCREEN';
    return 'MAIN_PLATFORM_SCREEN';
  }

  // Phase 5: Decoupled Action Execution Registry
  private actionHandlersMap = new Map<string, (action: any) => void | boolean>();

  public registerActionHandler(actionType: string, handler: (action: any) => void | boolean): void {
    this.actionHandlersMap.set(actionType, handler);
  }

  public unregisterActionHandler(actionType: string): void {
    this.actionHandlersMap.delete(actionType);
  }

  private getActionFailureMessage(language: string): string {
    if (language === 'hi' || language === 'hi-IN') {
      return "Maaf kijiye, main us action ko screen par nahi kar payi.";
    }
    return "I'm sorry, I couldn't perform that action on the screen.";
  }

  private executeAction(action: any): boolean {
    if (!action || !action.type) return false;

    // Check if custom handler registered for this action type
    if (this.actionHandlersMap.has(action.type)) {
      const customHandler = this.actionHandlersMap.get(action.type);
      try {
        const handled = customHandler!(action);
        if (handled !== false) return true; // If custom handler handled it, stop
      } catch (e) {
        console.error(`Error executing custom action handler for ${action.type}:`, e);
      }
    }

    // Default decoupled platform action execution engine
    switch (action.type) {
      case 'RELOAD':
        window.location.reload();
        return true;

      case 'SLEEP':
        this.sleepAssistant();
        return true;

      case 'MEDIA_PLAY':
      case 'MEDIA_PAUSE':
      case 'MEDIA_SEEK':
      case 'MEDIA_SPEED': {
        // First check if it's a PDF (text) or Braille resource being "played" (read aloud)
        if (this.activeResourceState && (this.activeResourceState.format === 'text' || this.activeResourceState.format === 'braille')) {
          if (action.type === 'MEDIA_PLAY') {
            if (this.activeResourceState.format === 'braille') {
              // Open the full-screen Braille Console instead of just reading it
              const brailleBtn = document.querySelector('[data-ai-id="launch-braille-console"]') as HTMLElement;
              if (brailleBtn) {
                brailleBtn.click();
              }
            } else if (!this.isReadingModeActive) {
               // Extract text from the modal body directly if possible
               const modalBody = document.querySelector('.modal-body-custom');
               const textToRead = modalBody ? (modalBody as HTMLElement).innerText : undefined;
               this.startReadingMode(textToRead);
            }
          } else if (action.type === 'MEDIA_PAUSE') {
            this.stopReadingMode();
          }
          return true;
        }

        const media = document.querySelector('video, audio') as HTMLMediaElement;
        if (media) {
          if (action.type === 'MEDIA_PLAY') media.play();
          if (action.type === 'MEDIA_PAUSE') media.pause();
          if (action.type === 'MEDIA_SEEK' && action.value) {
            const diff = parseFloat(action.value);
            if (!isNaN(diff)) media.currentTime += diff;
          }
          if (action.type === 'MEDIA_SPEED' && action.value) {
            const val = action.value.toLowerCase();
            if (val.includes('slow')) media.playbackRate = Math.max(0.25, media.playbackRate - 0.25);
            else if (val.includes('fast') || val.includes('tez')) media.playbackRate = Math.min(2.0, media.playbackRate + 0.25);
            else if (val.includes('normal')) media.playbackRate = 1.0;
            else {
              const rate = parseFloat(val);
              if (!isNaN(rate)) media.playbackRate = rate;
            }
          }
          return true;
        }
        return false;
      }

      case 'NAVIGATE':
        if (action.target) {
          this.router.navigateByUrl(action.target);
          return true;
        }
        return false;

      case 'GO_BACK':
        window.history.back();
        return true;

      case 'SCROLL':
        const amount = action.target === 'up' ? -window.innerHeight + 100 : window.innerHeight - 100;
        window.scrollBy({ top: amount, behavior: 'smooth' });
        return true;

      case 'FOCUS':
      case 'CLICK':
      case 'INPUT_TEXT':
        let el: HTMLElement | null = null;
        const targetStr = (action.target || '').trim().replace(/'/g, '"');
        const cleanId = targetStr.replace(/^#/, '');

        // Auto-Slide Sign Up Panel if targeting Sign Up field or intent
        const lowerTarget = targetStr.toLowerCase();
        if (lowerTarget.includes('signup') || lowerTarget.includes('register') || lowerTarget.includes('user') || cleanId.startsWith('signup')) {
          const container = document.querySelector('.container.shadow-3d');
          if (container && !container.classList.contains('right-panel-active')) {
            const toggleBtn = document.querySelector('.overlay-right button.ghost-btn') as HTMLButtonElement
              || document.querySelector('.mobile-toggle-footer button.btn-toggle-link') as HTMLButtonElement;
            if (toggleBtn) {
              toggleBtn.click();
              toggleBtn.dispatchEvent(new Event('click', { bubbles: true }));
            }
          }
        }

        try {
          el = document.getElementById(cleanId)
            || document.querySelector(targetStr)
            || document.querySelector(`[name="${cleanId}"]`)
            || document.querySelector(`[formcontrolname="${cleanId}"]`);
        } catch (e) {
          el = document.getElementById(cleanId);
        }

        // Smart Fallback Matcher for Sign In, Sign Up, Forgot Password & Active Elements
        if (!el) {
          if (lowerTarget.includes('signup') || lowerTarget.includes('register') || lowerTarget.includes('create account') || lowerTarget.includes('toggle') || lowerTarget.includes('ghost')) {
            el = document.querySelector('.overlay-right button.ghost-btn')
              || document.querySelector('.mobile-toggle-footer button.btn-toggle-link')
              || document.querySelector('.sign-up-container button[type="submit"]');
          } else if (lowerTarget.includes('signin') || lowerTarget.includes('login') || lowerTarget.includes('switch to login')) {
            el = document.querySelector('.overlay-left button.ghost-btn')
              || document.querySelector('.form-container.sign-in-container button[type="submit"]');
          } else if (lowerTarget.includes('full name') || lowerTarget.includes('name') || lowerTarget.includes('signup-user')) {
            el = document.getElementById('signup-user') || document.querySelector('[formControlName="user"]');
          } else if (lowerTarget.includes('signup-pass') || lowerTarget.includes('create password')) {
            el = document.getElementById('signup-pass');
          } else if (lowerTarget.includes('signup-disability') || lowerTarget.includes('disability card')) {
            el = document.getElementById('signup-disability');
          } else if (lowerTarget.includes('question') || lowerTarget.includes('signup-question')) {
            el = document.getElementById('signup-question');
          } else if (lowerTarget.includes('answer') || lowerTarget.includes('signup-answer')) {
            el = document.getElementById('signup-answer');
          } else if (lowerTarget.includes('recovery') || lowerTarget.includes('forgot')) {
            el = document.querySelector('a.forgot-password') || document.getElementById('recovery-id');
          } else if (lowerTarget.includes('id') || lowerTarget.includes('username') || lowerTarget.includes('disability')) {
            el = document.getElementById('signin-id') || document.querySelector('[formControlName="disabilityId"]');
          } else if (lowerTarget.includes('pass') || lowerTarget.includes('password')) {
            el = document.getElementById('signin-pass') || document.querySelector('[formControlName="pass"]');
          } else if (lowerTarget.includes('submit')) {
            el = document.querySelector('button[type="submit"]') || document.querySelector('.btn-submit-3d');
          } else if (document.activeElement && (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLSelectElement)) {
            el = document.activeElement as HTMLElement;
          }
        }

        if (el) {
          if (action.type === 'FOCUS') {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ai-focus-highlight');
          }
          if (action.type === 'CLICK') el.click();
          if (action.type === 'INPUT_TEXT') {
            console.group(`[Diagnostic] Field Filling Action`);
            console.log(`- Selector (Target): ${targetStr}`);
            console.log(`- Element Found: ${!!el} (ID: ${el?.id})`);

            if (!el) {
              console.log(`- Focus Success: false`);
              console.log(`- Verification Success: false`);
              console.groupEnd();
              return false;
            }

            const inputEl = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const val = this.cleanSpokenFormatting(action.value || '');

            inputEl.focus();
            console.log(`- Focus Success: true`);

            if (!val) {
              console.warn(`[Diagnostic] Action value is empty. Stopping execution here to request user input.`);
              inputEl.classList.add('ai-focus-highlight');
              console.log(`- Verification Success: false`);
              console.groupEnd();
              return false;
            }

            console.log(`- Value Assigned: ${val}`);

            if (inputEl.tagName.toLowerCase() === 'select') {
              const selectEl = inputEl as HTMLSelectElement;
              let matchedIndex = -1;

              // Exact match first
              for (let i = 0; i < selectEl.options.length; i++) {
                if (selectEl.options[i].value === val || selectEl.options[i].text.trim() === val.trim()) {
                  matchedIndex = i;
                  break;
                }
              }
              // Fuzzy match if no exact match
              if (matchedIndex === -1) {
                for (let i = 0; i < selectEl.options.length; i++) {
                  const optText = selectEl.options[i].text.toLowerCase();
                  const inputVal = val.toLowerCase();
                  if (optText.includes(inputVal) || inputVal.includes(optText)) {
                    matchedIndex = i;
                    break;
                  }
                }
              }

              if (matchedIndex !== -1) {
                // Directly set the value property (not just selectedIndex) so Angular picks it up
                selectEl.value = selectEl.options[matchedIndex].value;
                selectEl.selectedIndex = matchedIndex;
                // Dispatch input + change events for Angular reactive forms
                selectEl.dispatchEvent(new Event('input', { bubbles: true }));
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
              }

              // Blur and return immediately — skip the generic event dispatch below
              selectEl.blur();
              this.setSecurityMute(false);
              selectEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

              console.log(`- FormControl Updated: true`);
              console.log(`- Input Event Dispatched: true`);
              console.log(`- Change Event Dispatched: true`);

              const finalValue = selectEl.value;
              console.log(`- Final DOM Value: ${finalValue}`);

              const expectedValue = matchedIndex !== -1 ? selectEl.options[matchedIndex].value : '';
              const verificationSuccess = matchedIndex !== -1 && finalValue === expectedValue;
              console.log(`- Verification Success: ${verificationSuccess}`);
              console.groupEnd();

              if (!verificationSuccess) {
                selectEl.focus();
                selectEl.classList.add('ai-focus-highlight');
              }
              return verificationSuccess;

            } else if (inputEl.type === 'checkbox') {
              const lowerVal = val.toLowerCase();
              (inputEl as HTMLInputElement).checked = (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === 'haan' || lowerVal === 'y' || lowerVal === '1');
            } else {
              inputEl.value = val;
            }

            if ((inputEl as any)._valueTracker) {
              (inputEl as any)._valueTracker.setValue('');
            }
            inputEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            console.log(`- Input Event Dispatched: true`);

            inputEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            console.log(`- Change Event Dispatched: true`);

            // Natively blur the element so focus is removed and security mute is properly lifted
            inputEl.blur();

            // GUARANTEE: Forcefully lift security mute in case the blur event was swallowed by the browser
            this.setSecurityMute(false);

            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const finalDOMValue = inputEl.type === 'checkbox' ? (inputEl as HTMLInputElement).checked : inputEl.value;
            console.log(`- FormControl Updated: true`);
            console.log(`- Final DOM Value: ${finalDOMValue}`);

            // VERIFICATION: Check if value was actually updated
            const verificationSuccess = inputEl.type === 'checkbox' ? true : (finalDOMValue === val || String(finalDOMValue).toLowerCase() === String(val).toLowerCase());
            console.log(`- Verification Success: ${verificationSuccess}`);
            console.groupEnd();

            if (!verificationSuccess) {
              inputEl.focus();
              inputEl.classList.add('ai-focus-highlight');
            }

            return verificationSuccess;
          }
          return true;
        }
        return false;

      case 'ACCESSIBILITY_FONT_INCREASE':
        this.accessibilityService.fontSize = Math.min((this.accessibilityService.fontSize || 16) + 2, 28);
        this.accessibilityService.saveSettings();
        this.accessibilityService.applyAllStyles();
        return true;

      case 'ACCESSIBILITY_FONT_DECREASE':
        this.accessibilityService.fontSize = Math.max((this.accessibilityService.fontSize || 16) - 2, 12);
        this.accessibilityService.saveSettings();
        this.accessibilityService.applyAllStyles();
        return true;

      case 'ACCESSIBILITY_RESET':
        this.accessibilityService.contrastMode = 'normal';
        this.accessibilityService.fontSize = 16;
        this.accessibilityService.letterSpacing = 'normal';
        this.accessibilityService.lineHeight = 'normal';
        this.accessibilityService.dyslexiaFont = false;
        this.accessibilityService.cursorType = 'system';
        this.accessibilityService.saveSettings();
        return true;

      case 'ACCESSIBILITY_THEME':
        if (action.target === 'high-contrast' || action.target === 'yellow-black') {
          this.accessibilityService.contrastMode = 'yellow-black';
        } else if (action.target === 'white-black') {
          this.accessibilityService.contrastMode = 'white-black';
        } else if (action.target === 'grayscale') {
          this.accessibilityService.contrastMode = 'grayscale';
        } else {
          this.accessibilityService.contrastMode = 'normal';
        }
        this.accessibilityService.saveSettings();
        return true;
      case 'ACCESSIBILITY_FONT_FAMILY':
        this.accessibilityService.dyslexiaFont = action.target === 'dyslexic';
        this.accessibilityService.saveSettings();
        return true;

      case 'FORM_START':
        this.startFormWizard();
        return true;

      case 'FORM_NEXT':
        this.nextFormField();
        return true;

      case 'FORM_PREV':
        this.previousFormField();
        return true;

      case 'READ_START':
        this.startReadingMode(action.value);
        return true;

      case 'READ_NEXT':
        this.nextReadingChunk();
        return true;

      case 'READ_PREV':
        this.previousReadingChunk();
        return true;

      case 'READ_REPEAT':
        this.repeatReadingChunk();
        return true;

      case 'READ_STOP':
        this.stopReadingMode();
        return true;

      default:
        console.log(`Action type ${action.type} received and evaluated by application dispatcher.`);
        return false;
    }
    return false;
  }

  private cleanSpokenFormatting(text: string): string {
    if (!text) return text;
    // Converts "capital D capital I capital S 1 2 3 4" -> "DIS1234"
    let cleaned = text.replace(/capital\s+([a-zA-Z])/gi, (_, letter) => letter.toUpperCase());
    cleaned = cleaned.replace(/([A-Z])\s+(?=[A-Z0-9])/g, '$1');
    return cleaned.trim();
  }

  // Phase 7: Dynamic Form Assistance Wizard Implementation
  private isFormWizardActive = false;
  private formFields: { id: string; label: string; element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement }[] = [];
  private currentFormFieldIndex = 0;

  public startFormWizard() {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea')) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
    if (inputs.length === 0) {
      this.playTTS("Main is page par koi fill karne wala form field nahi dekh raha hu.");
      return;
    }

    this.isFormWizardActive = true;
    this.formFields = inputs.map((el, idx) => {
      const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
      const label = labelEl?.textContent?.trim()
        || el.getAttribute('aria-label')
        || (el as HTMLInputElement).placeholder
        || el.name
        || `Field ${idx + 1}`;
      return { id: el.id || `field-${idx}`, label, element: el };
    });

    this.currentFormFieldIndex = 0;
    this.focusAndPromptCurrentFormField();
  }

  private focusAndPromptCurrentFormField() {
    if (this.currentFormFieldIndex >= this.formFields.length) {
      this.playTTS("Sabhi form fields complete ho chuke hain. Kya main form submit kar du?", () => {
        if (this.isEnabledSubject.value && !this.isListeningSubject.value) this.startListening();
      });
      return;
    }

    const field = this.formFields[this.currentFormFieldIndex];
    field.element.focus();
    const promptMsg = `Kripya ${field.label} ki value batayein.`;
    this.playTTS(promptMsg, () => {
      if (this.isEnabledSubject.value && !this.isListeningSubject.value) this.startListening();
    });
  }

  public nextFormField() {
    if (this.currentFormFieldIndex < this.formFields.length - 1) {
      this.currentFormFieldIndex++;
      this.focusAndPromptCurrentFormField();
    } else {
      this.playTTS("Aap aakhri field par hain. Kya main form submit kar du?");
    }
  }

  public previousFormField() {
    if (this.currentFormFieldIndex > 0) {
      this.currentFormFieldIndex--;
      this.focusAndPromptCurrentFormField();
    }
  }

  // Phase 8: Educational Chunked Reading Mode Engine Implementation
  private isReadingModeActive = false;
  private readingChunks: string[] = [];
  private currentReadingChunkIndex = 0;
  private lastSourceText: string = '';

  public startReadingMode(textPayload?: string) {
    let sourceText = textPayload || '';
    if (!sourceText) {
      const pdfTextEl = document.getElementById('pdf-accessible-text');
      if (pdfTextEl) {
        sourceText = pdfTextEl.textContent ? pdfTextEl.textContent.trim() : '';
        if (!sourceText) {
          this.playTTS("PDF abhi load ho raha hai ya isme koi padhne layak text nahi hai.");
          return;
        }
      } else {
        const contentEl = document.getElementById('resource-content-area')
          || document.querySelector('.article-content')
          || document.body;
        const clone = contentEl.cloneNode(true) as HTMLElement;
        ['header', 'nav', 'footer', 'script', 'style', '.visually-hidden', '.sr-only', 'app-accessibility-widget', 'app-navbar', 'app-sidebar', 'app-footer', '.sidebar', '.accessibility-widget', '.navbar', '[role="navigation"]', 'aside'].forEach(s => {
          clone.querySelectorAll(s).forEach(e => e.remove());
        });
        sourceText = clone.innerText.replace(/\s+/g, ' ').trim();
      }
    }

    if (!sourceText) {
      this.playTTS("Padhne ke liye koi text content nahi mila.");
      return;
    }

    // If we are already reading the exact same text and haven't finished, just resume
    if (this.readingChunks.length > 0 && this.currentReadingChunkIndex < this.readingChunks.length) {
      const isSameContent = this.lastSourceText === sourceText ||
        (this.lastSourceText && sourceText && this.lastSourceText.substring(0, 100) === sourceText.substring(0, 100));

      if (isSameContent) {
        this.isReadingModeActive = true;
        this.readCurrentChunk();
        return;
      }
    }

    this.lastSourceText = sourceText;

    // Intelligent chunking based on newlines, bullet points, and sentences
    const lines = sourceText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    this.readingChunks = [];
    let currentChunk = '';

    for (const line of lines) {
      // If line is a bullet point, short heading, or short definition
      const isListOrHeading = /^[•\-*]/.test(line) || /^\d+[\.\)]/.test(line) || line.length < 80;

      if (isListOrHeading) {
        // Group short lines together with newlines so TTS pauses naturally, but doesn't stop completely
        if ((currentChunk + '\n' + line).length > 250) {
          if (currentChunk.trim()) this.readingChunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      } else {
        // Long paragraph. Flush current grouped items first.
        if (currentChunk.trim()) {
          this.readingChunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Split by sentences
        const sentences = line.match(/[^.!?]+[.!?]+/g) || [line];
        for (const s of sentences) {
          if ((currentChunk + ' ' + s).length > 250) {
            if (currentChunk.trim()) this.readingChunks.push(currentChunk.trim());
            currentChunk = s.trim();
          } else {
            currentChunk += (currentChunk ? ' ' : '') + s.trim();
          }
        }
        if (currentChunk.trim()) {
          this.readingChunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
    }
    if (currentChunk.trim()) {
      this.readingChunks.push(currentChunk.trim());
    }

    this.isReadingModeActive = true;
    this.currentReadingChunkIndex = 0;
    this.readCurrentChunk();
  }

  private readCurrentChunk() {
    if (this.currentReadingChunkIndex >= this.readingChunks.length) {
      this.playTTS("Yeh part poora ho gaya hai. Kya aap agle page par jana chahte hain?", () => {
        this.stopReadingMode();
        if (this.isEnabledSubject.value && !this.isMutedForSecurity) {
          this.requestListen();
        }
      });
      return;
    }

    const chunkText = this.readingChunks[this.currentReadingChunkIndex];
    this.updateActiveContext({
      reading: { isReading: true, currentChunk: this.currentReadingChunkIndex + 1, totalChunks: this.readingChunks.length }
    });

    this.playTTS(chunkText, () => {
      // Read continuously without pausing for mic input after every paragraph
      if (this.isReadingModeActive && this.isEnabledSubject.value) {
        this.currentReadingChunkIndex++;
        setTimeout(() => {
          if (this.isReadingModeActive) {
            this.readCurrentChunk();
          }
        }, 600); // Small natural pause between chunks
      }
    });
  }

  public nextReadingChunk() {
    if (this.currentReadingChunkIndex < this.readingChunks.length - 1) {
      this.currentReadingChunkIndex++;
      this.readCurrentChunk();
    } else {
      this.playTTS("Aap aakhri paragraph par hain.");
    }
  }

  public previousReadingChunk() {
    if (this.currentReadingChunkIndex > 0) {
      this.currentReadingChunkIndex--;
      this.readCurrentChunk();
    }
  }

  public repeatReadingChunk() {
    this.readCurrentChunk();
  }

  public stopReadingMode() {
    this.isReadingModeActive = false;
    // Do not reset chunks or index so we can resume later if needed
    this.updateActiveContext({
      reading: { isReading: false, currentChunk: this.currentReadingChunkIndex, totalChunks: this.readingChunks.length }
    });
  }

  // Dedicated provider-independent TTS service call via backend proxy
  private playTTS(text: string, onEnd?: () => void, language?: string) {
    // Keep API unchanged, route to TtsLifecycleManager
    this.ttsManager.speak(
      text,
      language || 'hi', // Legacy calls are hardcoded to Hindi/English hybrid
      () => {
        // onStartPlaying
        this.isSpeaking = true;
        // Do NOT turn on the mic while speaking to avoid echo loop
      },
      (result) => {
        // onCompleted
        this.isSpeaking = false;
        if (onEnd) {
          onEnd();
        } else if (this.isEnabledSubject.value && !this.isListeningSubject.value && !this.isMutedForSecurity) {
          this.startListening();
        }
      }
    );
  }

  // Provider-independent listener activation
  private startWakeWordListener() {
    // Rely strictly on HTML5 audio activity & backend voice processing without browser-dependent webkitSpeechRecognition
    if (this.isEnabledSubject.value && !this.isListeningSubject.value && !this.isMutedForSecurity) {
      this.startListening();
    }
  }

  // Phase 10: Automatic Session Resume Engine Implementation
  public checkAndPromptSessionResume(userId: string) {
    if (!userId) return;
    this.http.get<any>(`${environment.apiUrl}/api/voice/resume/${userId}`).subscribe({
      next: (resumeData) => {
        if (resumeData && resumeData.hasPreviousSession && resumeData.targetUrl) {
          const courseTitle = resumeData.lastCourseTitle || 'apne pichle course';
          const resumeMsg = `Aapka swagat hai! Kya aap ${courseTitle} ko wahi se continue karna chahte hain?`;
          this.playTTS(resumeMsg, () => {
            this.registerActionHandler('RESUME_ACCEPT', () => {
              this.router.navigateByUrl(resumeData.targetUrl);
            });
            if (this.isEnabledSubject.value && !this.isListeningSubject.value) {
              this.startListening();
            }
          });
        }
      },
      error: (err) => {
        console.warn("Session resume check error:", err);
      }
    });
  }
}
