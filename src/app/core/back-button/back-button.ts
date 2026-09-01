import { Injectable } from '@angular/core';

interface TrackedOverlay {
  dismiss: () => Promise<unknown>;
}

interface OverlaySource {
  dismiss: (data?: unknown, role?: string) => Promise<boolean>;
  onDidDismiss: () => Promise<unknown>;
}

const OVERLAY_HISTORY_FLAG = 'ezgymOverlay';

/**
 * Makes the browser/Android back button close Ionic overlays (modals, alerts).
 * Pushes one history entry while at least one overlay is open; on popstate,
 * dismisses the top overlay. Dismissing via UI consumes the entry back.
 */
@Injectable({ providedIn: 'root' })
export class BackButtonService {
  private readonly stack = new Set<TrackedOverlay>();
  private hasPushedState = false;
  private ignoreNextPop = false;
  private dismissDueToBack = false;

  constructor() {
    const state = history.state as Record<string, unknown> | null;
    if (state && OVERLAY_HISTORY_FLAG in state) {
      history.replaceState({}, '');
    }
    window.addEventListener('popstate', () => this.handlePopState());
  }

  public async track(overlay: OverlaySource): Promise<void> {
    const entry: TrackedOverlay = { dismiss: () => overlay.dismiss() };

    this.push(entry);
    await overlay.onDidDismiss();
    this.release(entry);
  }

  private push(entry: TrackedOverlay): void {
    this.stack.add(entry);
    if (this.stack.size === 1) {
      history.pushState({ [OVERLAY_HISTORY_FLAG]: true }, '');
      this.hasPushedState = true;
    }
  }

  private release(entry: TrackedOverlay): void {
    if (!this.stack.delete(entry)) {
      return;
    }
    if (
      this.stack.size === 0 &&
      this.hasPushedState &&
      !this.dismissDueToBack
    ) {
      this.ignoreNextPop = true;
      void history.back();
    }
    this.dismissDueToBack = false;
  }

  private handlePopState(): void {
    if (this.ignoreNextPop) {
      this.ignoreNextPop = false;
      return;
    }
    this.hasPushedState = false;
    const entries = Array.from(this.stack);
    const top = entries[entries.length - 1];
    if (top) {
      this.dismissDueToBack = true;
      void top.dismiss();
    }
  }
}
