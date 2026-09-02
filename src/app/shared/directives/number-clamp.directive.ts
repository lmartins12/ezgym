import { Directive, input } from '@angular/core';
import type { NumericRange } from '@domain/shared/limits';
import { BoundedInputBase, type NativeInput } from './bounded-input.base';

@Directive({
  selector: '[appNumberClamp]',
  host: {
    '(keydown)': 'onKeydown($event)',
    '(input)': 'onNativeInput()',
    '(ionInput)': 'onIonInput($event)',
  },
})
export class NumberClampDirective extends BoundedInputBase {
  public readonly appNumberClamp = input.required<NumericRange>();

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key;
    if (key.length !== 1) {
      return;
    }

    const native = this.resolveNativeInput();
    if (!native) {
      return;
    }

    const caret = this.readCaret(native);
    const current = typeof native.value === 'string' ? native.value : '';
    const start = caret?.start ?? current.length;
    const end = caret?.end ?? start;
    const proposed = current.slice(0, start) + key + current.slice(end);

    if (!/^[0-9.]$/.test(key)) {
      event.preventDefault();
      return;
    }

    if (key === '.') {
      if (!this.allowsDecimal(native) || proposed.split('.').length > 2) {
        event.preventDefault();
      }
      return;
    }

    const proposedNumber = Number(proposed);
    if (
      Number.isFinite(proposedNumber) &&
      proposedNumber > this.appNumberClamp().max
    ) {
      event.preventDefault();
    }
  }

  protected computeCorrection(raw: string): string | null {
    const max = this.appNumberClamp().max;
    const numeric = Number(raw);

    if (Number.isFinite(numeric)) {
      if (numeric > max) {
        return String(max);
      }
      const native = this.resolveNativeInput();
      if (native && !this.allowsDecimal(native) && !Number.isInteger(numeric)) {
        return String(Math.trunc(numeric));
      }
      return null;
    }

    const digits = raw.replace(/[^0-9.]/g, '');
    if (digits === '' || digits === '.') {
      return '';
    }
    if (Number(digits) > max) {
      return String(max);
    }
    return null;
  }

  private allowsDecimal(native: NativeInput): boolean {
    const inputmode =
      native.getAttribute('inputmode') ?? this.host.getAttribute('inputmode');
    return inputmode === 'decimal';
  }
}
