import { Injectable } from '@angular/core';

const KEYBOARD_DID_HIDE = 'ionKeyboardDidHide';

/**
 * In web/PWA the webview does not resize with the keyboard, so Ionic's
 * scroll assist adds keyboard padding (`--keyboard-offset`) to the closest
 * ion-content while an input is focused. That padding is only cleared when
 * the focused input fires `focusout`, so hiding the keyboard without
 * blurring (Android back button/gesture) leaves a phantom gap until the
 * next tap outside. Blur the active input when Ionic reports the keyboard
 * hidden to clear the padding right away.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardService {
  private initialized = false;

  public init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    window.addEventListener(KEYBOARD_DID_HIDE, () => this.blurFocusedInput());
  }

  private blurFocusedInput(): void {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
      return;
    }

    // Focus inside ion-input/ion-textarea is retargeted to the shadow host,
    // while Ionic listens for `focusout` on the native input.
    const nativeInput =
      active.shadowRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        'input, textarea',
      ) ?? active;

    if (
      nativeInput instanceof HTMLInputElement ||
      nativeInput instanceof HTMLTextAreaElement
    ) {
      nativeInput.blur();
    }
  }
}
