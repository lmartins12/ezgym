import { Injectable, computed, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_DISMISS_KEY = 'app_pwa_install_dismissed';
const INSTALL_SNOOZE_KEY = 'app_pwa_install_snoozed_until';
const VISITS_KEY = 'app_pwa_visits';

/**
 * The invite only appears from the second visit on, so the app never
 * asks for installation on the very first paint.
 */
const MIN_VISITS_BEFORE_INVITE = 2;

/**
 * "Later" hides the invite for a week instead of forever, so a
 * hesitant user gets asked again without being nagged every launch.
 */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  private readonly _canInstall = signal<boolean>(false);
  private readonly _isInstalled = signal<boolean>(false);
  private readonly _isIos = signal<boolean>(false);
  private readonly _isDismissed = signal<boolean>(false);
  private readonly _visitCount = signal<number>(0);
  private readonly _snoozedUntil = signal<number>(0);

  public readonly canInstall = this._canInstall.asReadonly();
  public readonly isInstalled = this._isInstalled.asReadonly();
  public readonly isIos = this._isIos.asReadonly();
  public readonly isDismissed = this._isDismissed.asReadonly();
  public readonly visitCount = this._visitCount.asReadonly();

  public readonly canInvite = computed(
    () =>
      !this.isInstalled() &&
      !this.isDismissed() &&
      Date.now() >= this._snoozedUntil() &&
      this.visitCount() >= MIN_VISITS_BEFORE_INVITE &&
      (this.canInstall() || this.isIos()),
  );

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    this._isInstalled.set(isStandalone);
    this._isIos.set(this.detectIos());
    this._isDismissed.set(this.readStorage(INSTALL_DISMISS_KEY) === 'true');
    this._snoozedUntil.set(Number(this.readStorage(INSTALL_SNOOZE_KEY)) || 0);
    this.registerVisit();

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this._canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this._canInstall.set(false);
      this._isInstalled.set(true);
      this.persistDismissal();
    });
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this._canInstall.set(false);
        this.deferredPrompt = null;
        this.persistDismissal();
        return true;
      }
    } catch {
      // Ignored
    }

    return false;
  }

  /**
   * Hides the invite permanently on this device (persisted).
   */
  public dismiss(): void {
    this.persistDismissal();
  }

  /**
   * Hides the invite for a week ("Later"). The invite returns on a
   * later visit once the snooze expires.
   */
  public snooze(): void {
    const until = Date.now() + SNOOZE_MS;
    this._snoozedUntil.set(until);
    this.writeStorage(INSTALL_SNOOZE_KEY, String(until));
  }

  private persistDismissal(): void {
    this._isDismissed.set(true);
    this.writeStorage(INSTALL_DISMISS_KEY, 'true');
  }

  private detectIos(): boolean {
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+ reports itself as a desktop Mac
    const isIpadOs =
      window.navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1;

    return isIosDevice || isIpadOs;
  }

  private registerVisit(): void {
    const stored = Number(this.readStorage(VISITS_KEY));
    const visits = Number.isFinite(stored) ? stored + 1 : 1;

    this.writeStorage(VISITS_KEY, String(visits));
    this._visitCount.set(visits);
  }

  private readStorage(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      // Storage unavailable (e.g. private mode): fall back to defaults.
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage unavailable: the preference only lives for this session.
    }
  }
}
