import { computed, Injectable, signal } from '@angular/core';

const THEME_KEY = 'app_theme';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly currentTheme = signal<Theme>('dark');

  public readonly theme = this.currentTheme.asReadonly();
  public readonly isDarkMode = computed(() => this.currentTheme() === 'dark');

  public readonly availableThemes: readonly Theme[] = [
    'dark',
    'light',
  ] as const;

  constructor() {
    this.initTheme();
  }

  public initTheme(): void {
    const savedTheme = (this.readTheme() as Theme) || 'dark';
    this.setTheme(savedTheme);
  }

  public setTheme(theme: Theme): void {
    this.currentTheme.set(theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('ion-palette-dark');
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
    }

    this.updateThemeColorMeta(theme);
    this.writeTheme(theme);
  }

  private updateThemeColorMeta(theme: Theme): void {
    const isDark = theme === 'dark';
    const color = isDark ? '#000000' : '#fafafa';

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
  }

  public toggleTheme(): void {
    const newTheme: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  private readTheme(): string | null {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      // Storage unavailable (e.g. private mode): fall back to dark.
      return null;
    }
  }

  private writeTheme(theme: Theme): void {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage unavailable: the theme only lives for this session.
    }
  }
}
