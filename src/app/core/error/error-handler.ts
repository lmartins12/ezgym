import { ErrorHandler, inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

const ERROR_TOAST_DURATION_MS = 4000;

/**
 * Global error handler: logs every unhandled error and surfaces a
 * user-facing toast so failures are never completely silent.
 */
@Injectable({ providedIn: 'root' })
export class EzGymErrorHandler implements ErrorHandler {
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private showingToast = false;

  public handleError(error: unknown): void {
    console.error('[EzGym] Unhandled error:', error);

    if (this.showingToast) return;
    this.showingToast = true;
    void this.showErrorToast().finally(() => {
      this.showingToast = false;
    });
  }

  private async showErrorToast(): Promise<void> {
    try {
      const toast = await this.toastCtrl.create({
        message: this.translate.instant('COMMON.UNEXPECTED_ERROR'),
        duration: ERROR_TOAST_DURATION_MS,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } catch {
      // Toast infrastructure unavailable — the error is already logged
    }
  }
}
