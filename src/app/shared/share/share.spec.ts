import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareService } from './share';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareService);
  });

  it('uses the Web Share API when the content is shareable', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...window.navigator,
      share,
      canShare: () => true,
    });
    const createObjectURL = vi.fn();

    await service.share('{"a":1}');

    expect(share).toHaveBeenCalledWith({
      title: 'EzGym Workouts Export',
      text: '{"a":1}',
    });
    expect(createObjectURL).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('stays silent when the user dismisses the share sheet', async () => {
    const abort = new DOMException('dismissed', 'AbortError');
    vi.stubGlobal('navigator', {
      ...window.navigator,
      share: vi.fn().mockRejectedValue(abort),
      canShare: () => true,
    });
    const createElement = vi.spyOn(document, 'createElement');

    await service.share('{"a":1}');

    expect(createElement).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('downloads a file when Web Share is unavailable', async () => {
    vi.stubGlobal('navigator', { ...window.navigator, share: undefined });
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor);
    const hadCreateObjectURL = 'createObjectURL' in URL;
    const hadRevokeObjectURL = 'revokeObjectURL' in URL;
    const createObjectURL = vi.fn(() => 'blob:url');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });

    await service.share('{"a":1}', 'custom.json');

    expect(click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('custom.json');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');

    if (!hadCreateObjectURL) delete (URL as any).createObjectURL;
    if (!hadRevokeObjectURL) delete (URL as any).revokeObjectURL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
