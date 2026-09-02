import { Directive, input } from '@angular/core';
import { BoundedInputBase } from './bounded-input.base';

@Directive({
  selector:
    'ion-input[appTextLimit], ion-textarea[appTextLimit], input[appTextLimit], textarea[appTextLimit]',
  host: {
    '(input)': 'onNativeInput()',
    '(ionInput)': 'onIonInput($event)',
  },
})
export class TextLimitDirective extends BoundedInputBase {
  public readonly appTextLimit = input.required<number>();

  protected computeCorrection(raw: string): string | null {
    const limit = this.appTextLimit();
    if (raw.length <= limit) {
      return null;
    }
    return raw.slice(0, limit);
  }
}
