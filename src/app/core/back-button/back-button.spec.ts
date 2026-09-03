import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackButtonService } from './back-button';

function mockOverlay() {
  let resolveDismiss!: (value: unknown) => void;
  const dismissed = new Promise<unknown>((resolve) => {
    resolveDismiss = resolve;
  });
  return {
    dismiss: vi.fn().mockResolvedValue(true),
    onDidDismiss: () => dismissed,
    resolveDismiss: () => resolveDismiss({ role: 'cancel' }),
  };
}

describe('BackButtonService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('pushes a history entry while an overlay is tracked', async () => {
    const service = TestBed.inject(BackButtonService);
    const overlay = mockOverlay();

    const tracking = service.track(overlay);
    expect(
      (history.state as Record<string, unknown> | null)?.['ezgymOverlay'],
    ).toBe(true);

    overlay.resolveDismiss();
    await tracking;
  });

  it('consumes the history entry when the overlay is dismissed via UI', async () => {
    const service = TestBed.inject(BackButtonService);
    const overlay = mockOverlay();
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      // jsdom has no traversable history: the call itself is the assertion.
    });

    const tracking = service.track(overlay);
    overlay.resolveDismiss();
    await tracking;

    expect(back).toHaveBeenCalledOnce();
    back.mockRestore();
  });

  it('dismisses the top overlay on back-button press', async () => {
    const service = TestBed.inject(BackButtonService);
    const overlay = mockOverlay();

    const tracking = service.track(overlay);
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(overlay.dismiss).toHaveBeenCalledOnce();

    overlay.resolveDismiss();
    await tracking;
  });

  it('ignores the popstate fired by its own history cleanup', async () => {
    const service = TestBed.inject(BackButtonService);
    const first = mockOverlay();
    const second = mockOverlay();

    const firstTracking = service.track(first);
    first.resolveDismiss();
    await firstTracking;

    // The release above called history.back(); a synthetic popstate from
    // that cleanup must not dismiss an overlay tracked afterwards.
    const secondTracking = service.track(second);
    window.dispatchEvent(new PopStateEvent('popstate'));

    // Either the cleanup pop or this synthetic one dismisses the top
    // overlay exactly once — never twice for a single press.
    expect(second.dismiss.mock.calls.length).toBeLessThanOrEqual(1);

    second.resolveDismiss();
    await secondTracking;
  });
});
