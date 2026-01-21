import { Injectable, inject, signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Preferences } from '@capacitor/preferences';

export type Language = 'pt' | 'en';

const LANGUAGE_KEY = 'app_language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly currentLang = signal<Language>('pt');

  public readonly language = this.currentLang.asReadonly();
  public readonly isPortuguese = computed(() => this.currentLang() === 'pt');
  public readonly isEnglish = computed(() => this.currentLang() === 'en');

  public readonly availableLanguages: readonly Language[] = [
    'pt',
    'en',
  ] as const;

  constructor() {
    this.initLanguage();
  }

  private async initLanguage(): Promise<void> {
    const { value } = await Preferences.get({ key: LANGUAGE_KEY });
    const lang = (value as Language) || 'pt';
    this.setLanguage(lang);
  }

  public async setLanguage(lang: Language): Promise<void> {
    this.currentLang.set(lang);
    this.translate.use(lang);
    await Preferences.set({ key: LANGUAGE_KEY, value: lang });
  }

  public async toggleLanguage(): Promise<void> {
    const newLang: Language = this.currentLang() === 'pt' ? 'en' : 'pt';
    await this.setLanguage(newLang);
  }
}
