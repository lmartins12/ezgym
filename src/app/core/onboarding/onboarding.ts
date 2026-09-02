import { Injectable, computed, signal } from '@angular/core';

/**
 * Uses the `app_` prefix so the data wipe (task 03) clears it.
 * After a wipe, the onboarding may show again — acceptable "initial state".
 */
const ONBOARDING_SEEN_KEY = 'app_onboarding_seen';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly seen = signal<boolean>(this.readSeen());

  public readonly shouldShow = computed(() => !this.seen());

  /**
   * Marks the onboarding as seen. Never shown again as modal/blocking.
   */
  public dismiss(): void {
    this.seen.set(true);

    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {
      // Storage unavailable: onboarding may reappear on next launch.
    }
  }

  private readSeen(): boolean {
    try {
      return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
