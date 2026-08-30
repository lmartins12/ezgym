import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.promptUpdate());
  }

  private async promptUpdate(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('PWA.UPDATE_AVAILABLE'),
      duration: 0,
      position: 'bottom',
      buttons: [
        {
          text: this.translate.instant('PWA.UPDATE_ACTION'),
          role: 'action',
          handler: () => {
            this.swUpdate.activateUpdate().then(() => {
              document.location.reload();
            });
          },
        },
      ],
    });

    await toast.present();
  }

  public async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) return false;
    return this.swUpdate.checkForUpdate();
  }
}
