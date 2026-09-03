import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { filter, interval } from 'rxjs';
import type { VersionReadyEvent } from '@angular/service-worker';

/**
 * How often the app looks for a new deploy while it stays open. The
 * service worker itself only re-checks `ngsw.json` on real navigations,
 * which installed PWAs almost never do (they resume from memory).
 */
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** A new version was downloaded and awaits activation via reload. */
  private readonly _hasPendingUpdate = signal(false);
  public readonly hasPendingUpdate = this._hasPendingUpdate.asReadonly();

  /** Guards against stacking one toast per update source. */
  private updatePrompted = false;

  constructor() {
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this._hasPendingUpdate.set(true);
        void this.promptUpdate();
      });

    // Broken cache state (e.g. a missing hashed file): a reload is the
    // only way out, so apply it instead of leaving the app unusable.
    this.swUpdate.unrecoverable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());

    // Reopening an installed PWA resumes the page from memory — no
    // navigation happens, so the SW never re-checks the manifest on its
    // own. Check on every resume and periodically while the app is open
    // so a new deploy shows up on the next app open.
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('visibilitychange', onVisible),
    );

    interval(UPDATE_CHECK_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.checkForUpdate());
  }

  private async promptUpdate(): Promise<void> {
    // Both VERSION_READY and a manual check resolve to "update found";
    // prompt once so the two sources never stack two toasts.
    if (this.updatePrompted) return;
    this.updatePrompted = true;

    const toast = await this.toastCtrl.create({
      message: this.translate.instant('PWA.UPDATE_AVAILABLE'),
      duration: 0,
      position: 'bottom',
      buttons: [
        {
          text: this.translate.instant('PWA.UPDATE_ACTION'),
          role: 'action',
          handler: () => this.applyUpdate(),
        },
      ],
    });

    await toast.present();
  }

  /** Activates the pending version and reloads so the new code takes over. */
  public applyUpdate(): void {
    this.swUpdate.activateUpdate().then(() => this.reload());
  }

  private reload(): void {
    document.location.reload();
  }

  /**
   * Asks the service worker to check the server for a new deploy.
   * Resolves `true` when a new version was found and is ready to use.
   * A found version prompts immediately (no reliance on the SW
   * re-broadcasting VERSION_READY for this check).
   */
  public async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) return false;

    const found = await this.swUpdate.checkForUpdate();
    if (found) {
      this._hasPendingUpdate.set(true);
      void this.promptUpdate();
    }
    return found;
  }
}
