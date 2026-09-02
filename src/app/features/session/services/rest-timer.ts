import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';

/** Ephemeral rest countdown for the in-progress session.
 * Lives in the session feature and is provided by the session component:
 * it is never persisted, so leaving the view drops the countdown.
 *
 * The countdown is anchored to a wall-clock deadline instead of counting
 * ticks: browsers throttle or suspend intervals in background tabs, so
 * the remaining time is always derived from `endsAt - Date.now()` and
 * re-synced when the app becomes visible again. */
@Injectable()
export class RestTimerService {
  private static readonly TICK_MS = 1000;
  private static readonly FINISHED_FEEDBACK_MS = 1500;

  private readonly destroyRef = inject(DestroyRef);

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private onComplete: (() => void) | null = null;
  private endsAt = 0;

  private readonly _restRemaining = signal(0);
  private readonly _restDuration = signal(0);
  private readonly _justFinished = signal(false);

  readonly restRemaining = this._restRemaining.asReadonly();
  readonly restDuration = this._restDuration.asReadonly();
  readonly isResting = computed(() => this._restRemaining() > 0);
  readonly justFinished = this._justFinished.asReadonly();

  constructor() {
    document.addEventListener('visibilitychange', this.sync);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.sync);
      this.clearTimers();
    });
  }

  /** Starts a countdown; `onComplete` fires once when it reaches zero. */
  start(seconds: number, onComplete?: () => void): void {
    if (seconds <= 0) return;

    this.clearTimers();
    this.onComplete = onComplete ?? null;
    this.endsAt = Date.now() + seconds * 1000;
    this._restRemaining.set(seconds);
    this._restDuration.set(seconds);
    this._justFinished.set(false);
    this.intervalId = setInterval(this.sync, RestTimerService.TICK_MS);
  }

  addSeconds(seconds: number): void {
    if (!this.isResting() || seconds <= 0) return;

    this.endsAt += seconds * 1000;
    const remaining = this.secondsLeft();
    this._restRemaining.set(remaining);
    if (remaining > this._restDuration()) {
      this._restDuration.set(remaining);
    }
  }

  /** Cancels the countdown without firing `onComplete`. */
  skip(): void {
    if (!this.isResting()) return;

    this.clearTimers();
    this.onComplete = null;
    this.endsAt = 0;
    this._restRemaining.set(0);
  }

  /** Interval tick and visibility sync: recompute from the wall clock. */
  private readonly sync = (): void => {
    if (!this.isResting()) return;

    const remaining = this.secondsLeft();
    if (remaining <= 0) {
      this.complete();
      return;
    }
    this._restRemaining.set(remaining);
  };

  private secondsLeft(): number {
    return Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
  }

  private complete(): void {
    this.clearTimers();
    this.endsAt = 0;
    this._restRemaining.set(0);
    this._justFinished.set(true);
    this.feedbackTimeoutId = setTimeout(
      () => this._justFinished.set(false),
      RestTimerService.FINISHED_FEEDBACK_MS,
    );

    const callback = this.onComplete;
    this.onComplete = null;
    callback?.();
  }

  private clearTimers(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.feedbackTimeoutId !== null) {
      clearTimeout(this.feedbackTimeoutId);
      this.feedbackTimeoutId = null;
    }
  }
}
