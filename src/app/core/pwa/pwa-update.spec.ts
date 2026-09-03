import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaUpdateService } from './pwa-update';

interface ToastConfig {
  buttons: { handler: () => void }[];
}

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('PwaUpdateService', () => {
  let versionUpdates: Subject<unknown>;
  let unrecoverable: Subject<unknown>;
  let checkForUpdate: ReturnType<typeof vi.fn>;
  let activateUpdate: ReturnType<typeof vi.fn>;
  let toastConfigs: ToastConfig[];
  let reload: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    versionUpdates = new Subject<unknown>();
    unrecoverable = new Subject<unknown>();
    checkForUpdate = vi.fn();
    activateUpdate = vi.fn();
    toastConfigs = [];
    // `location.reload` is unforgeable in jsdom, so the service exposes
    // the reload through a method we can stub on the prototype.
    reload = vi.fn();
    const prototype = PwaUpdateService.prototype as unknown as {
      reload: () => void;
    };
    prototype.reload = (): void => reload();

    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates,
            unrecoverable,
            checkForUpdate,
            activateUpdate,
          },
        },
        {
          provide: ToastController,
          useValue: {
            create: vi.fn(async (config: ToastConfig) => {
              toastConfigs.push(config);
              return { present: vi.fn() };
            }),
          },
        },
      ],
    });
  });

  it('prompts the user and flags the pending update when a version is ready', async () => {
    const service = TestBed.inject(PwaUpdateService);

    versionUpdates.next({ type: 'NO_NEW_VERSION_DETECTED' });
    expect(service.hasPendingUpdate()).toBe(false);

    versionUpdates.next({ type: 'VERSION_READY' });
    await flushMicrotasks();

    expect(service.hasPendingUpdate()).toBe(true);
    expect(toastConfigs).toHaveLength(1);
  });

  it('applies the pending update and reloads from the toast action', async () => {
    TestBed.inject(PwaUpdateService);
    activateUpdate.mockResolvedValue(true);

    versionUpdates.next({ type: 'VERSION_READY' });
    await flushMicrotasks();

    toastConfigs[0].buttons[0].handler();
    await flushMicrotasks();

    expect(activateUpdate).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads immediately on an unrecoverable state', async () => {
    TestBed.inject(PwaUpdateService);

    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'broken' });
    await flushMicrotasks();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reports the manual check result and flags pending versions', async () => {
    const service = TestBed.inject(PwaUpdateService);
    checkForUpdate.mockResolvedValue(true);

    await expect(service.checkForUpdate()).resolves.toBe(true);
    expect(service.hasPendingUpdate()).toBe(true);

    checkForUpdate.mockResolvedValue(false);
    await expect(service.checkForUpdate()).resolves.toBe(false);
  });

  it('prompts once when both the event and a manual check find a version', async () => {
    const service = TestBed.inject(PwaUpdateService);
    checkForUpdate.mockResolvedValue(true);

    versionUpdates.next({ type: 'VERSION_READY' });
    await expect(service.checkForUpdate()).resolves.toBe(true);
    await flushMicrotasks();

    expect(service.hasPendingUpdate()).toBe(true);
    expect(toastConfigs).toHaveLength(1);
  });

  it('propagates failures from the service worker check', async () => {
    const service = TestBed.inject(PwaUpdateService);
    checkForUpdate.mockRejectedValue(new Error('offline'));

    await expect(service.checkForUpdate()).rejects.toThrow('offline');
  });
});

describe('PwaUpdateService (service worker disabled)', () => {
  it('returns false without touching the service worker', async () => {
    const checkForUpdate = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: false,
            versionUpdates: new Subject<unknown>(),
            unrecoverable: new Subject<unknown>(),
            checkForUpdate,
            activateUpdate: vi.fn(),
          },
        },
        { provide: ToastController, useValue: { create: vi.fn() } },
      ],
    });

    const service = TestBed.inject(PwaUpdateService);

    await expect(service.checkForUpdate()).resolves.toBe(false);
    expect(checkForUpdate).not.toHaveBeenCalled();
  });
});
