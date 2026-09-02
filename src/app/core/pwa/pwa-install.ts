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
const VISITS_KEY = 'app_pwa_visits';

/**
 * The invite only appears from the second visit on, so the app never
 * asks for installation on the very first paint.
 */
const MIN_VISITS_BEFORE_INVITE = 2;

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  public readonly canInstall = signal<boolean>(false);
  public readonly isInstalled = signal<boolean>(false);
  public readonly isIos = signal<boolean>(false);
  public readonly isDismissed = signal<boolean>(false);
  public readonly visitCount = signal<number>(0);

  public readonly canInvite = computed(
    () =>
      !this.isInstalled() &&
      !this.isDismissed() &&
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

    this.isInstalled.set(isStandalone);
    this.isIos.set(this.detectIos());
    this.isDismissed.set(localStorage.getItem(INSTALL_DISMISS_KEY) === 'true');
    this.registerVisit();

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.persistDismissal();
    });
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        this.canInstall.set(false);
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

  private persistDismissal(): void {
    this.isDismissed.set(true);
    localStorage.setItem(INSTALL_DISMISS_KEY, 'true');
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
    const stored = Number(localStorage.getItem(VISITS_KEY));
    const visits = Number.isFinite(stored) ? stored + 1 : 1;

    localStorage.setItem(VISITS_KEY, String(visits));
    this.visitCount.set(visits);
  }
}
