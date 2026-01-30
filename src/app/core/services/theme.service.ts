import { computed, Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar, NavigationBarColor } from '@capgo/capacitor-navigation-bar';

const THEME_KEY = 'app_theme';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly currentTheme = signal<Theme>('dark');

  public readonly theme = this.currentTheme.asReadonly();
  public readonly isDarkMode = computed(() => this.currentTheme() === 'dark');

  public readonly availableThemes: readonly Theme[] = ['dark', 'light'] as const;

  constructor() {
    this.initTheme();
  }

  public async initTheme(): Promise<void> {
    const { value } = await Preferences.get({ key: THEME_KEY });
    const theme = (value as Theme) || 'dark';
    this.setTheme(theme);
  }

  public async setTheme(theme: Theme): Promise<void> {
    this.currentTheme.set(theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('ion-palette-dark');
    } else {
      document.documentElement.classList.remove('ion-palette-dark');
    }

    await this.updateSystemBars(theme);
    Preferences.set({ key: THEME_KEY, value: theme });
  }

  private async updateSystemBars(theme: Theme): Promise<void> {
    const isDark = theme === 'dark';
    const color = isDark ? NavigationBarColor.BLACK : NavigationBarColor.WHITE;
    const style = isDark ? Style.Dark : Style.Light;

    await Promise.all([
      StatusBar.setStyle({ style }),
      StatusBar.setBackgroundColor({ color }),
      NavigationBar.setNavigationBarColor({ color, darkButtons: !isDark }),
    ]);
  }

  public async toggleTheme(): Promise<void> {
    const newTheme: Theme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    await this.setTheme(newTheme);
  }
}
