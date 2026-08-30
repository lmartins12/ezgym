import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
    TestBed.configureTestingModule({});
  });

  it('defaults to dark theme', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(service.isDarkMode()).toBe(true);
  });

  it('applies the ion-palette-dark class on dark theme', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');

    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(
      true,
    );
  });

  it('removes the ion-palette-dark class on light theme', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('light');

    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(
      false,
    );
  });

  it('persists the chosen theme in localStorage', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('light');

    expect(localStorage.getItem('app_theme')).toBe('light');
  });

  it('restores the saved theme on init', () => {
    localStorage.setItem('app_theme', 'light');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
  });

  it('toggles between dark and light', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');

    service.toggleTheme();
    expect(service.theme()).toBe('light');

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
  });

  it('updates the theme-color meta tag', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');
    let meta = document.querySelector('meta[name="theme-color"]');
    expect(meta?.getAttribute('content')).toBe('#000000');

    service.setTheme('light');
    meta = document.querySelector('meta[name="theme-color"]');
    expect(meta?.getAttribute('content')).toBe('#ffffff');
  });
});
