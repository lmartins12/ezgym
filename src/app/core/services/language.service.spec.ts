import { TestBed } from '@angular/core/testing';
import {
  provideTranslateService,
  TranslateLoader,
  TranslateService,
} from '@ngx-translate/core';
import { of } from 'rxjs';
import { LanguageService } from './language.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string) {
    return of({ GREETING: `hello-${lang}` });
  }
}

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideTranslateService({
          fallbackLang: 'pt',
          loader: {
            provide: TranslateLoader,
            useClass: FakeTranslateLoader,
          },
        }),
      ],
    });
  });

  it('defaults to portuguese', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.language()).toBe('pt');
    expect(service.isPortuguese()).toBe(true);
    expect(service.isEnglish()).toBe(false);
  });

  it('persists the chosen language in localStorage', () => {
    const service = TestBed.inject(LanguageService);
    service.setLanguage('en');

    expect(localStorage.getItem('app_language')).toBe('en');
  });

  it('restores the saved language on init', () => {
    localStorage.setItem('app_language', 'en');

    const service = TestBed.inject(LanguageService);

    expect(service.language()).toBe('en');
  });

  it('applies the language to the TranslateService', () => {
    const service = TestBed.inject(LanguageService);
    const translate = TestBed.inject(TranslateService);

    service.setLanguage('en');

    expect(translate.currentLang).toBe('en');
  });

  it('toggles between pt and en', () => {
    const service = TestBed.inject(LanguageService);
    expect(service.language()).toBe('pt');

    service.toggleLanguage();
    expect(service.language()).toBe('en');

    service.toggleLanguage();
    expect(service.language()).toBe('pt');
  });

  it('exposes available languages', () => {
    const service = TestBed.inject(LanguageService);

    expect(service.availableLanguages).toEqual(['pt', 'en']);
  });
});
