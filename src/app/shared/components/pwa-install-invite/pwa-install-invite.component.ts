import { Component, computed, inject } from '@angular/core';
import { OnboardingService } from '@core/onboarding/onboarding';
import { PwaInstallService } from '@core/pwa/pwa-install';
import { IonButton, IonIcon } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { downloadOutline, shareOutline } from 'ionicons/icons';

@Component({
  selector: 'app-pwa-install-invite',
  imports: [TranslatePipe, IonButton, IonIcon],
  templateUrl: './pwa-install-invite.component.html',
  styleUrl: './pwa-install-invite.component.scss',
})
export class PwaInstallInviteComponent {
  protected readonly pwaInstall = inject(PwaInstallService);
  private readonly onboarding = inject(OnboardingService);

  /**
   * The onboarding backdrop takes precedence on first visits, so the
   * invite waits until it is gone instead of stacking on top of it.
   */
  protected readonly visible = computed(
    () => this.pwaInstall.canInvite() && !this.onboarding.shouldShow(),
  );

  constructor() {
    addIcons({
      downloadOutline,
      shareOutline,
    });
  }

  public install(): void {
    void this.pwaInstall.promptInstall();
  }

  public dismiss(): void {
    this.pwaInstall.dismiss();
  }

  public snooze(): void {
    this.pwaInstall.snooze();
  }
}
