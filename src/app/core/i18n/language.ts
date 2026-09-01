import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

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

  private initLanguage(): void {
    const savedLang = (localStorage.getItem(LANGUAGE_KEY) as Language) || 'pt';
    this.setLanguage(savedLang);
  }

  public setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    this.translate.use(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  }

  public toggleLanguage(): void {
    const newLang: Language = this.currentLang() === 'pt' ? 'en' : 'pt';
    this.setLanguage(newLang);
  }
}
