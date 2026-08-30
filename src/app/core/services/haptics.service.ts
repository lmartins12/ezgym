import { Injectable } from '@angular/core';

/**
 * Haptic feedback via the Web Vibration API.
 * No-ops on platforms without support.
 */
@Injectable({ providedIn: 'root' })
export class HapticsService {
  public light(): void {
    this.vibrate(35);
  }

  public medium(): void {
    this.vibrate(60);
  }

  public doubleTap(): void {
    this.vibrate([100, 50, 100]);
  }

  private vibrate(pattern: number | number[]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if blocked by browser policy
      }
    }
  }
}
