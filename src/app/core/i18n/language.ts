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
    const savedLang = (this.readLanguage() as Language) || 'pt';
    this.setLanguage(savedLang);
  }

  public setLanguage(lang: Language): void {
    this.currentLang.set(lang);
    this.translate.use(lang);
    this.writeLanguage(lang);
  }

  public toggleLanguage(): void {
    const newLang: Language = this.currentLang() === 'pt' ? 'en' : 'pt';
    this.setLanguage(newLang);
  }

  private readLanguage(): string | null {
    try {
      return localStorage.getItem(LANGUAGE_KEY);
    } catch {
      // Storage unavailable (e.g. private mode): fall back to pt.
      return null;
    }
  }

  private writeLanguage(lang: Language): void {
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // Storage unavailable: the language only lives for this session.
    }
  }
}
