import { Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { caretDownSharp, settingsOutline } from 'ionicons/icons';
import { LanguageService } from '../../core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonIcon,
  ],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage {
  private readonly languageService = inject(LanguageService);
  protected readonly translate = inject(TranslateService);

  public readonly currentLang = this.languageService.language;
  public readonly isPortuguese = this.languageService.isPortuguese;
  public readonly isEnglish = this.languageService.isEnglish;

  constructor() {
    addIcons({ caretDownSharp, settingsOutline });
  }

  public onLanguageChange(event: CustomEvent): void {
    const lang = event.detail.value as 'pt' | 'en';
    this.languageService.setLanguage(lang);
  }
}
