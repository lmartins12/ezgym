import { ElementRef, inject } from '@angular/core';

export type NativeInput = HTMLInputElement | HTMLTextAreaElement;

type IonInputHost = HTMLElement & {
  value?: unknown;
  getInputElement?: () => Promise<NativeInput>;
};

export abstract class BoundedInputBase {
  protected readonly host = inject(ElementRef).nativeElement as IonInputHost;

  private nativeInput: NativeInput | null = null;
  private correcting = false;

  protected onNativeInput(): void {
    if (this.correcting) {
      return;
    }

    const native = this.resolveNativeInput();
    if (!native) {
      return;
    }

    const raw = typeof native.value === 'string' ? native.value : '';
    if (!raw) {
      return;
    }

    const corrected = this.computeCorrection(raw);
    if (corrected === null) {
      return;
    }

    this.applyCorrection(corrected);
  }

  protected onIonInput(event: Event): void {
    if (this.correcting) {
      return;
    }

    const raw = this.readRawValue(event as CustomEvent<{ value?: unknown }>);
    if (!raw) {
      return;
    }

    const corrected = this.computeCorrection(raw);
    if (corrected === null) {
      return;
    }

    event.stopImmediatePropagation();
    this.applyCorrection(corrected);
  }

  protected resolveNativeInput(): NativeInput | null {
    if (this.nativeInput?.isConnected) {
      return this.nativeInput;
    }

    const host = this.host as HTMLElement;
    const shadowInput =
      host.shadowRoot?.querySelector<NativeInput>('input, textarea');
    if (shadowInput) {
      this.nativeInput = shadowInput;
      return shadowInput;
    }

    if (
      host instanceof HTMLInputElement ||
      host instanceof HTMLTextAreaElement
    ) {
      this.nativeInput = host;
      return host;
    }

    const getter = this.host.getInputElement;
    if (typeof getter === 'function') {
      void getter
        .call(this.host)
        .then((el) => (this.nativeInput = el))
        .catch(() => undefined);
    }
    return null;
  }

  protected readCaret(
    native: NativeInput,
  ): { start: number; end: number } | null {
    try {
      const start = native.selectionStart;
      const end = native.selectionEnd;
      return start === null || end === null ? null : { start, end };
    } catch {
      return null;
    }
  }

  protected abstract computeCorrection(raw: string): string | null;

  private readRawValue(event: CustomEvent<{ value?: unknown }>): string | null {
    const detailValue = event.detail?.value;
    if (typeof detailValue === 'string') {
      return detailValue;
    }
    const hostValue = this.host.value;
    return typeof hostValue === 'string' ? hostValue : null;
  }

  private applyCorrection(corrected: string): void {
    this.correcting = true;
    try {
      const native = this.resolveNativeInput();
      if (native) {
        native.value = corrected;
      }
      this.host.value = corrected;
      this.host.dispatchEvent(
        new CustomEvent('ionInput', { detail: { value: corrected } }),
      );
    } finally {
      this.correcting = false;
    }
  }
}
