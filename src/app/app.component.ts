import { Component, ErrorHandler, inject } from '@angular/core';
import { DatabaseService } from '@core/db/database';
import { LanguageService } from '@core/i18n/language';
import { PwaUpdateService } from '@core/pwa/pwa-update';
import { ThemeService } from '@core/theme/theme';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { OnboardingWelcomeComponent } from '@shared/components/onboarding-welcome/onboarding-welcome.component';
import { PwaInstallInviteComponent } from '@shared/components/pwa-install-invite/pwa-install-invite.component';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
      <app-pwa-install-invite></app-pwa-install-invite>
      <app-onboarding-welcome></app-onboarding-welcome>
    </ion-app>
  `,
  imports: [
    IonApp,
    IonRouterOutlet,
    PwaInstallInviteComponent,
    OnboardingWelcomeComponent,
  ],
})
export class AppComponent {
  private readonly databaseService = inject(DatabaseService);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly pwaUpdateService = inject(PwaUpdateService);
  private readonly errorHandler = inject(ErrorHandler);

  constructor() {
    this.registerUnhandledRejectionHandler();
    this.initApp();
  }

  private registerUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.errorHandler.handleError(event.reason);
    });
  }

  private async initApp(): Promise<void> {
    try {
      await this.databaseService.initialize();
      this.themeService.initTheme();
      void this.pwaUpdateService.checkForUpdate();
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }
}
