import { vi } from 'vitest';
import { KeyboardService } from './keyboard';

describe('KeyboardService', () => {
  let service: KeyboardService;

  const focusNativeInputInside = (hostTag: string): HTMLInputElement => {
    const host = document.createElement(hostTag);
    const nativeInput = document.createElement('input');
    host.attachShadow({ mode: 'open' });
    host.shadowRoot?.appendChild(nativeInput);
    document.body.appendChild(host);
    nativeInput.focus();
    return nativeInput;
  };

  const dispatchKeyboardHide = (): void => {
    window.dispatchEvent(new Event('ionKeyboardDidHide'));
  };

  beforeEach(() => {
    service = new KeyboardService();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('blurs the native input inside a shadow host on keyboard hide', () => {
      service.init();
      const nativeInput = focusNativeInputInside('ion-input');
      const blurSpy = vi.spyOn(nativeInput, 'blur');

      dispatchKeyboardHide();

      expect(blurSpy).toHaveBeenCalledTimes(1);
    });

    it('blurs the native input inside ion-textarea on keyboard hide', () => {
      service.init();
      const nativeInput = focusNativeInputInside('ion-textarea');
      const blurSpy = vi.spyOn(nativeInput, 'blur');

      dispatchKeyboardHide();

      expect(blurSpy).toHaveBeenCalledTimes(1);
    });

    it('blurs a focused native input on keyboard hide', () => {
      service.init();
      const nativeInput = document.createElement('input');
      document.body.appendChild(nativeInput);
      nativeInput.focus();
      const blurSpy = vi.spyOn(nativeInput, 'blur');

      dispatchKeyboardHide();

      expect(blurSpy).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no element is focused', () => {
      service.init();

      expect(() => dispatchKeyboardHide()).not.toThrow();
    });

    it('does not blur non-input elements on keyboard hide', () => {
      service.init();
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();
      const blurSpy = vi.spyOn(button, 'blur');

      dispatchKeyboardHide();

      expect(blurSpy).not.toHaveBeenCalled();
    });

    it('does not register duplicate listeners on repeated init', () => {
      service.init();
      service.init();
      const nativeInput = focusNativeInputInside('ion-input');
      const blurSpy = vi.spyOn(nativeInput, 'blur');

      dispatchKeyboardHide();

      expect(blurSpy).toHaveBeenCalledTimes(1);
    });
  });
});
