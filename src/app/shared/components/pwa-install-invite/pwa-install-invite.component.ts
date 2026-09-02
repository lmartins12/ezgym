import { Component, inject } from '@angular/core';
import { PwaInstallService } from '@core/pwa/pwa-install';
import { IonButton, IonIcon } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { downloadOutline, shareOutline } from 'ionicons/icons';

addIcons({
  downloadOutline,
  shareOutline,
});

@Component({
  selector: 'app-pwa-install-invite',
  imports: [TranslatePipe, IonButton, IonIcon],
  templateUrl: './pwa-install-invite.component.html',
  styleUrl: './pwa-install-invite.component.scss',
})
export class PwaInstallInviteComponent {
  protected readonly pwaInstall = inject(PwaInstallService);

  public install(): void {
    void this.pwaInstall.promptInstall();
  }

  public dismiss(): void {
    this.pwaInstall.dismiss();
  }}
