import { Component, inject } from '@angular/core';
import { OnboardingService } from '@core/onboarding/onboarding';
import { IonButton, IonIcon } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline } from 'ionicons/icons';

@Component({
  selector: 'app-onboarding-welcome',
  imports: [TranslatePipe, IonButton, IonIcon],
  templateUrl: './onboarding-welcome.component.html',
  styleUrl: './onboarding-welcome.component.scss',
})
export class OnboardingWelcomeComponent {
  protected readonly onboarding = inject(OnboardingService);

  constructor() {
    addIcons({
      cloudOfflineOutline,
    });
  }

  public dismiss(): void {
    this.onboarding.dismiss();
  }
}
