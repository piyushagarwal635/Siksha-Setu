/**
 * ConversationState
 *
 * The single source of truth for what the AI voice pipeline is doing
 * at any given moment. The system is always in exactly ONE of these states.
 *
 * Defined in isolation as part of Stabilization Blueprint — Step 1.
 * No logic. No wiring. Pure type definition.
 *
 * Legal transitions are enforced by the Voice Session Controller (Step 2–3).
 *
 * INACTIVE   → CONSENT        : First-time user — consent prompt plays
 * INACTIVE   → LISTENING      : Returning user (pref = true) — mic opens directly
 * CONSENT    → INACTIVE       : User said "No"
 * CONSENT    → SPEAKING       : User said "Yes" — welcome message plays
 * IDLE       → LISTENING      : Controller decides it is safe to open mic
 * LISTENING  → PROCESSING     : VAD detected speech + silence, blob ready
 * LISTENING  → IDLE           : Only silence detected, max record time hit
 * PROCESSING → SPEAKING       : HTTP response received, reply text present
 * PROCESSING → IDLE           : HTTP response received, action-only (no reply text)
 * PROCESSING → ERROR          : HTTP failure or JSON parse failure
 * SPEAKING   → LISTENING      : TTS playback ended naturally
 * SPEAKING   → PROCESSING     : User interrupted TTS — VAD detected real speech
 * ERROR      → IDLE           : Auto-recovery after 3 s
 * ANY        → INACTIVE       : CMD_DEACTIVATE received
 *
 * Illegal transitions (permanently rejected, see Step 3):
 *   LISTENING  → LISTENING    (mic already open)
 *   SPEAKING   → SPEAKING     (TTS already playing)
 *   PROCESSING → PROCESSING   (request already in flight)
 *   PROCESSING → LISTENING    (cannot open mic mid-request)
 *   SPEAKING   → IDLE         (must pass through LISTENING)
 */
export enum ConversationState {
  /** Assistant is off. No mic, no TTS, no timers. */
  INACTIVE = 'INACTIVE',

  /** Consent prompt is playing. Waiting for user to confirm activation. */
  CONSENT = 'CONSENT',

  /** Activated. Mic is closed. Waiting for the Controller to open it. */
  IDLE = 'IDLE',

  /** Mic is open. VAD is running. Waiting for user speech. */
  LISTENING = 'LISTENING',

  /** Audio blob captured. HTTP request to /api/voice/ask is in flight. */
  PROCESSING = 'PROCESSING',

  /** TTS audio is playing to the user. */
  SPEAKING = 'SPEAKING',

  /**
   * A recoverable error occurred (HTTP failure, JSON parse error, etc.).
   * The Controller will auto-recover to IDLE after 3 seconds.
   */
  ERROR = 'ERROR',
}
