import { Component, inject } from '@angular/core';
import { BackButtonService } from '@core/back-button/back-button';
import { LanguageService } from '@core/i18n/language';
import { PwaInstallService } from '@core/pwa/pwa-install';
import { PwaUpdateService } from '@core/pwa/pwa-update';
import { ThemeService } from '@core/theme/theme';
import { DataWipeService } from '@core/wipe/data-wipe';
import { APP_VERSION } from '@domain/import-export/export-data';
import {
  AlertController,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  caretDownSharp,
  downloadOutline,
  languageOutline,
  logoGithub,
  moonOutline,
  openOutline,
  refreshOutline,
  swapHorizontalOutline,
  trashOutline,
} from 'ionicons/icons';
import { ImportExportModalComponent } from '../components/import-export-modal/import-export-modal.component';

const WIPE_TOAST_DURATION_MS = 1500;
const TOAST_DURATION_MS = 3000;

@Component({
  selector: 'app-settings',
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonIcon,
    IonNote,
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
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly dataWipe = inject(DataWipeService);
  public readonly pwaUpdate = inject(PwaUpdateService);

  public readonly currentLang = this.languageService.language;
  public readonly isPortuguese = this.languageService.isPortuguese;
  public readonly isEnglish = this.languageService.isEnglish;
  public readonly isDarkMode = this.themeService.isDarkMode;
  public readonly canInstall = this.pwaInstallService.canInstall;
  public readonly appVersion = APP_VERSION;

  constructor() {
    addIcons({
      caretDownSharp,
      moonOutline,
      languageOutline,
      downloadOutline,
      swapHorizontalOutline,
      refreshOutline,
      trashOutline,
      logoGithub,
      openOutline,
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

  /**
   * Manual update check (Settings). A found version prompts via
   * PwaUpdateService itself, so this only gives feedback for the
   * "nothing to update" and failure cases.
   */
  public async checkForUpdates(): Promise<void> {
    try {
      const available = await this.pwaUpdate.checkForUpdate();
      if (!available) {
        await this.showUpToDateToast();
      }
    } catch (error) {
      console.error('Update check failed:', error);
      await this.showCheckFailedToast();
    }
  }

  public async openImportExport(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ImportExportModalComponent,
    });

    await modal.present();
    void this.backButton.track(modal);
  }

  public async confirmWipeData(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.translate.instant('SETTINGS.WIPE_CONFIRM_TITLE'),
      message: this.translate.instant('SETTINGS.WIPE_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('SETTINGS.WIPE_CONFIRM_ACTION'),
          role: 'destructive',
          handler: () => {
            void this.wipeData();
          },
        },
      ],
    });

    await alert.present();
    void this.backButton.track(alert);
  }

  private async wipeData(): Promise<void> {
    try {
      await this.dataWipe.wipeAll();
      await this.showWipeSuccessToast();
    } catch (error) {
      console.error('Data wipe failed:', error);
      await this.showWipeErrorToast();
    }
  }

  private async showUpToDateToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('SETTINGS.UP_TO_DATE'),
      duration: TOAST_DURATION_MS,
      position: 'top',
    });

    await toast.present();
  }

  private async showCheckFailedToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('COMMON.UNEXPECTED_ERROR'),
      duration: TOAST_DURATION_MS,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }

  private async showWipeSuccessToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('SETTINGS.WIPE_SUCCESS'),
      duration: WIPE_TOAST_DURATION_MS,
      position: 'top',
    });

    await toast.present();
    void toast.onDidDismiss().then(() => document.location.reload());
  }

  private async showWipeErrorToast(): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant('SETTINGS.WIPE_ERROR'),
      duration: WIPE_TOAST_DURATION_MS,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
  }
}
