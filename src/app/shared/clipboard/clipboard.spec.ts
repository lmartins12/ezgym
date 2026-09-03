import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipboardService } from './clipboard';

describe('ClipboardService', () => {
  let service: ClipboardService;
  const originalExecCommand = document.execCommand;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClipboardService);
  });

  afterEach(() => {
    document.execCommand = originalExecCommand;
    vi.unstubAllGlobals();
  });

  it('copies via the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: { writeText },
    });

    await service.copy('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
    vi.unstubAllGlobals();
  });

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    document.execCommand = execCommand;

    await service.copy('fallback');

    expect(execCommand).toHaveBeenCalledWith('copy');
    vi.unstubAllGlobals();
  });

  it('reads clipboard text when supported', async () => {
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: { readText: vi.fn().mockResolvedValue('pasted') },
    });

    await expect(service.read()).resolves.toEqual({ value: 'pasted' });
    vi.unstubAllGlobals();
  });

  it('returns null when reading is unsupported or blocked', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, clipboard: undefined });
    await expect(service.read()).resolves.toBeNull();

    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: {
        readText: vi.fn().mockRejectedValue(new DOMException('denied')),
      },
    });
    await expect(service.read()).resolves.toBeNull();
    vi.unstubAllGlobals();
  });
});
