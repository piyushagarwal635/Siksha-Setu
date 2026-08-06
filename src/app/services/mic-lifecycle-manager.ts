export type MicSessionResult = { blob?: Blob; userSpoke: boolean; error?: any };

/**
 * MicLifecycleManager
 * 
 * Step 6 of Stabilization Blueprint.
 * Owns the microphone stream, MediaRecorder, and VAD loop.
 * Guarantees atomic open (no double-streams) and prevents AudioContext leaks
 * by sharing a single AudioContext across multiple sessions.
 */
export class MicLifecycleManager {
  private state: 'CLOSED' | 'OPENING' | 'OPEN' | 'STOPPING' = 'CLOSED';
  
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  // Shared AudioContext to prevent memory leaks (RC-2)
  private sharedAudioContext: AudioContext | null = null;
  private sharedAnalyser: AnalyserNode | null = null;
  private currentSource: MediaStreamAudioSourceNode | null = null;
  
  private silenceTimerId: any;
  private failsafeTimerId: any;
  private vadFrameId: number | null = null;
  
  private onResultCallback: ((result: MicSessionResult) => void) | null = null;
  private onUserSpokeCallback: (() => void) | null = null;

  public initSharedAudioContext(): void {
    if (!this.sharedAudioContext) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.sharedAudioContext = new AudioContextClass();
        this.sharedAnalyser = this.sharedAudioContext!.createAnalyser();
        this.sharedAnalyser.fftSize = 512;
      }
    }
  }

  public closeSharedAudioContext(): void {
    if (this.sharedAudioContext) {
      this.sharedAudioContext.close();
      this.sharedAudioContext = null;
      this.sharedAnalyser = null;
    }
  }

  /**
   * Atomic open guard. Rejects requests if a session is already opening or open.
   */
  public open(
    onResult: (result: MicSessionResult) => void,
    onUserSpoke: () => void,
    isSpeakingFn: () => boolean,
    isListeningFn: () => boolean
  ): boolean {
    if (this.state !== 'CLOSED') {
      console.warn(`[MicLifecycle] Rejected open request. State is ${this.state}`);
      return false;
    }

    this.state = 'OPENING';
    this.onResultCallback = onResult;
    this.onUserSpokeCallback = onUserSpoke;
    this.audioChunks = [];
    let userSpoke = false;

    const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      // Abort if stop() was called during async gap
      if (this.state === 'STOPPING' || this.state === 'CLOSED') {
        stream.getTracks().forEach(t => t.stop());
        this.cleanupSession();
        return;
      }

      this.state = 'OPEN';
      this.stream = stream;
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = this.audioChunks.length > 0 ? new Blob(this.audioChunks, { type: 'audio/webm' }) : undefined;
        this.cleanupSession();
        if (this.onResultCallback) {
          this.onResultCallback({ blob, userSpoke });
        }
      };

      this.mediaRecorder.start();
      
      this.startVAD(stream, isSpeakingFn, isListeningFn, () => {
        userSpoke = true;
        if (this.onUserSpokeCallback) this.onUserSpokeCallback();
      });

    }).catch(err => {
      this.cleanupSession();
      if (this.onResultCallback) {
        this.onResultCallback({ error: err, userSpoke: false });
      }
    });

    return true;
  }

  public stop(): void {
    if (this.state === 'OPEN') {
      this.state = 'STOPPING';
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop(); // Triggers onstop, transitioning to CLOSED
      } else {
        this.cleanupSession();
      }
    } else if (this.state === 'OPENING') {
      this.state = 'STOPPING';
    }
  }

  public abort(): void {
    this.onResultCallback = null;
    this.stop();
    this.cleanupSession();
  }

  private cleanupSession(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.currentSource) {
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    if (this.silenceTimerId) {
      clearTimeout(this.silenceTimerId);
      this.silenceTimerId = null;
    }
    if (this.failsafeTimerId) {
      clearTimeout(this.failsafeTimerId);
      this.failsafeTimerId = null;
    }
    if (this.vadFrameId !== null) {
      cancelAnimationFrame(this.vadFrameId);
      this.vadFrameId = null;
    }
    this.state = 'CLOSED';
  }

  private startVAD(stream: MediaStream, isSpeakingFn: () => boolean, isListeningFn: () => boolean, onSpoke: () => void): void {
    this.initSharedAudioContext();
    if (!this.sharedAudioContext || !this.sharedAnalyser) {
      this.failsafeTimerId = setTimeout(() => this.stop(), 5000);
      return;
    }

    this.currentSource = this.sharedAudioContext.createMediaStreamSource(stream);
    this.currentSource.connect(this.sharedAnalyser);
    
    const bufferLength = this.sharedAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      if (this.state !== 'OPEN') return;
      
      this.sharedAnalyser!.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      let average = sum / bufferLength;

      let threshold = 25;
      const mediaElementsForTimer = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
      const isMediaPlayingForTimer = mediaElementsForTimer.some(m => !m.paused && !m.muted);
      
      if (isSpeakingFn()) {
         threshold = 85;
      } else if (isMediaPlayingForTimer) {
         threshold = 85;
      }

      if (average > threshold) {
         onSpoke();
         if (this.silenceTimerId) clearTimeout(this.silenceTimerId);
         this.silenceTimerId = setTimeout(() => this.stop(), 2500); // 2.5s for natural pause
      }

      if (isListeningFn()) {
         this.vadFrameId = requestAnimationFrame(checkAudio);
      }
    };

    checkAudio();
    const mediaElementsForTimer = Array.from(document.querySelectorAll('video, audio')) as HTMLMediaElement[];
    const isMediaPlayingForTimer = mediaElementsForTimer.some(m => !m.paused && !m.muted);
    const failsafeDuration = isSpeakingFn() || isMediaPlayingForTimer ? 5000 : 15000;
    this.failsafeTimerId = setTimeout(() => this.stop(), failsafeDuration);
  }
}
