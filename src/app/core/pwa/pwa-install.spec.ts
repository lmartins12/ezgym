import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install';

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const originalUserAgent = window.navigator.userAgent;
const originalPlatform = window.navigator.platform;
const originalMaxTouchPoints = window.navigator.maxTouchPoints;
const originalMatchMedia = window.matchMedia;

describe('PwaInstallService', () => {
  beforeEach(() => {
    localStorage.clear();
    stubStandalone(false);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      configurable: true,
      writable: true,
    });
  });

  function setUserAgent(ua: string): void {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  }

  function stubStandalone(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({ matches }) as MediaQueryList,
      configurable: true,
      writable: true,
    });
  }

  function simulateSecondVisit(): void {
    localStorage.setItem('app_pwa_visits', '1');
  }

  function dispatchNativeInstallPrompt(): void {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      platforms: ['web'],
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    });
    window.dispatchEvent(event);
  }

  it('detects standalone mode as installed', () => {
    setUserAgent(IOS_UA);
    stubStandalone(true);

    const service = TestBed.inject(PwaInstallService);

    expect(service.isInstalled()).toBe(true);
    expect(service.canInvite()).toBe(false);
  });

  it('detects iOS Safari', () => {
    setUserAgent(IOS_UA);

    const service = TestBed.inject(PwaInstallService);

    expect(service.isIos()).toBe(true);
  });

  it('detects iPadOS reporting itself as Mac', () => {
    setUserAgent(MAC_UA);
    Object.defineProperty(window.navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      value: 2,
      configurable: true,
    });

    const service = TestBed.inject(PwaInstallService);

    expect(service.isIos()).toBe(true);
  });

  it('does not invite on the first visit', () => {
    setUserAgent(IOS_UA);

    const service = TestBed.inject(PwaInstallService);

    expect(service.visitCount()).toBe(1);
    expect(service.canInvite()).toBe(false);
  });

  it('invites from the second visit on iOS', () => {
    setUserAgent(IOS_UA);
    simulateSecondVisit();

    const service = TestBed.inject(PwaInstallService);

    expect(service.visitCount()).toBe(2);
    expect(service.canInvite()).toBe(true);
  });

  it('does not invite a desktop browser without the native prompt', () => {
    simulateSecondVisit();

    const service = TestBed.inject(PwaInstallService);

    expect(service.canInstall()).toBe(false);
    expect(service.isIos()).toBe(false);
    expect(service.canInvite()).toBe(false);
  });

  it('does not invite on Android before the native prompt fires', () => {
    setUserAgent(ANDROID_UA);
    simulateSecondVisit();

    const service = TestBed.inject(PwaInstallService);

    expect(service.canInvite()).toBe(false);
  });

  it('invites on Android once the native prompt is available', () => {
    setUserAgent(ANDROID_UA);
    simulateSecondVisit();
    const service = TestBed.inject(PwaInstallService);

    dispatchNativeInstallPrompt();

    expect(service.canInstall()).toBe(true);
    expect(service.canInvite()).toBe(true);
  });

  it('persists the dismissal and stops inviting', () => {
    setUserAgent(IOS_UA);
    simulateSecondVisit();
    const service = TestBed.inject(PwaInstallService);

    service.dismiss();

    expect(service.isDismissed()).toBe(true);
    expect(localStorage.getItem('app_pwa_install_dismissed')).toBe('true');
    expect(service.canInvite()).toBe(false);
  });

  it('respects a persisted dismissal on the next visit', () => {
    setUserAgent(IOS_UA);
    localStorage.setItem('app_pwa_install_dismissed', 'true');
    simulateSecondVisit();

    const service = TestBed.inject(PwaInstallService);

    expect(service.isDismissed()).toBe(true);
    expect(service.canInvite()).toBe(false);
  });

  it('resolves promptInstall as accepted and hides the invite', async () => {
    setUserAgent(ANDROID_UA);
    simulateSecondVisit();
    const service = TestBed.inject(PwaInstallService);
    dispatchNativeInstallPrompt();

    const result = await service.promptInstall();

    expect(result).toBe(true);
    expect(service.canInstall()).toBe(false);
    expect(service.isDismissed()).toBe(true);
    expect(localStorage.getItem('app_pwa_install_dismissed')).toBe('true');
    expect(service.canInvite()).toBe(false);
  });

  it('resolves promptInstall as false without the native prompt', async () => {
    const service = TestBed.inject(PwaInstallService);

    await expect(service.promptInstall()).resolves.toBe(false);
  });

  it('snoozes the invite for a week instead of dismissing forever', () => {
    setUserAgent(IOS_UA);
    simulateSecondVisit();
    const service = TestBed.inject(PwaInstallService);
    expect(service.canInvite()).toBe(true);

    service.snooze();

    expect(service.canInvite()).toBe(false);
    expect(service.isDismissed()).toBe(false);
    const snoozedUntil = Number(
      localStorage.getItem('app_pwa_install_snoozed_until'),
    );
    expect(snoozedUntil).toBeGreaterThan(Date.now());
  });

  it('invites again once the snooze expires', () => {
    setUserAgent(IOS_UA);
    simulateSecondVisit();
    localStorage.setItem('app_pwa_install_snoozed_until', '1');

    const service = TestBed.inject(PwaInstallService);

    expect(service.canInvite()).toBe(true);
  });

  it('keeps an active snooze across visits', () => {
    setUserAgent(IOS_UA);
    simulateSecondVisit();
    localStorage.setItem(
      'app_pwa_install_snoozed_until',
      String(Date.now() + 1000),
    );

    const service = TestBed.inject(PwaInstallService);

    expect(service.canInvite()).toBe(false);
  });
});
