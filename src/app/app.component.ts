import { Component, ErrorHandler, inject } from '@angular/core';
import { DatabaseService } from '@core/services/database.service';
import { LanguageService } from '@core/services/language.service';
import { ThemeService } from '@core/services/theme.service';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly databaseService = inject(DatabaseService);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
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
    } catch (error) {
      this.errorHandler.handleError(error);
    }
  }
}
