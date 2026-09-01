import { Component, inject } from '@angular/core';
import { BackButtonService } from '@core/services/back-button.service';
import { LanguageService } from '@core/services/language.service';
import { PwaInstallService } from '@core/services/pwa-install.service';
import { ThemeService } from '@core/services/theme.service';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  caretDownSharp,
  downloadOutline,
  moonOutline,
  settingsOutline,
} from 'ionicons/icons';
import { ImportExportModalComponent } from './components/import-export-modal/import-export-modal.component';

@Component({
  selector: 'app-settings',
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonIcon,
  ],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  private readonly languageService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);
  private readonly pwaInstallService = inject(PwaInstallService);
  private readonly modalCtrl = inject(ModalController);
  private readonly backButton = inject(BackButtonService);

  public readonly currentLang = this.languageService.language;
  public readonly isPortuguese = this.languageService.isPortuguese;
  public readonly isEnglish = this.languageService.isEnglish;
  public readonly isDarkMode = this.themeService.isDarkMode;
  public readonly canInstall = this.pwaInstallService.canInstall;

  constructor() {
    addIcons({
      caretDownSharp,
      moonOutline,
      settingsOutline,
      downloadOutline,
    });
  }

  public async onLanguageChange(event: CustomEvent): Promise<void> {
    const lang = event.detail.value as 'pt' | 'en';
    this.languageService.setLanguage(lang);
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  public async installApp(): Promise<void> {
    await this.pwaInstallService.promptInstall();
  }

  public async openImportExport(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ImportExportModalComponent,
    });

    await modal.present();
    void this.backButton.track(modal);
  }
}
