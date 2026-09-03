import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { PwaInstallService } from '@core/pwa/pwa-install';
import { PwaInstallInviteComponent } from './pwa-install-invite.component';

const originalMatchMedia = window.matchMedia;

describe('PwaInstallInviteComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches: false }) as MediaQueryList,
      configurable: true,
      writable: true,
    });
    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      configurable: true,
      writable: true,
    });
  });

  it('triggers the native install prompt', () => {
    const service = TestBed.inject(PwaInstallService);
    const promptInstall = vi
      .spyOn(service, 'promptInstall')
      .mockResolvedValue(true);
    const component = TestBed.createComponent(
      PwaInstallInviteComponent,
    ).componentInstance;

    component.install();

    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it('dismisses the invite persistently', () => {
    TestBed.inject(PwaInstallService);
    const component = TestBed.createComponent(
      PwaInstallInviteComponent,
    ).componentInstance;

    component.dismiss();

    expect(localStorage.getItem('app_pwa_install_dismissed')).toBe('true');
  });

  it('snoozes the invite without dismissing it forever', () => {
    TestBed.inject(PwaInstallService);
    const component = TestBed.createComponent(
      PwaInstallInviteComponent,
    ).componentInstance;

    component.snooze();

    expect(localStorage.getItem('app_pwa_install_dismissed')).toBeNull();
    expect(
      localStorage.getItem('app_pwa_install_snoozed_until'),
    ).not.toBeNull();
  });
});
