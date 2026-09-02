import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextLimitDirective } from './text-limit.directive';

@Component({
  selector: 'app-test-host',
  template: '<input [appTextLimit]="limit" />',
  imports: [TextLimitDirective],
})
class TestHostComponent {
  public limit = 5;
}

describe('TextLimitDirective', () => {
  let rawEventValue: string | null = null;

  function setup() {
    const fixture = TestBed.createComponent(TestHostComponent);
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;
    fixture.detectChanges();

    const correctedValues: string[] = [];
    input.addEventListener('ionInput', (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      if (typeof detail?.value !== 'string') {
        return;
      }
      if (detail.value === rawEventValue) {
        return;
      }
      correctedValues.push(detail.value);
    });

    return { fixture, input, correctedValues };
  }

  function emitInput(target: HTMLElement, value: string): void {
    rawEventValue = value;
    target.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
    rawEventValue = null;
  }

  function emitNativeInput(native: HTMLInputElement): void {
    native.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true }),
    );
  }

  it('truncates input past the limit', () => {
    const { input, correctedValues } = setup();

    emitInput(input, 'abcdefgh');

    expect(input.value).toBe('abcde');
    expect(correctedValues).toEqual(['abcde']);
  });

  it('does not touch input within the limit', () => {
    const { input, correctedValues } = setup();
    input.value = 'abc';

    emitInput(input, 'abc');

    expect(input.value).toBe('abc');
    expect(correctedValues).toEqual([]);
  });

  it('truncates to exactly the limit boundary', () => {
    const { input, correctedValues } = setup();
    input.value = 'abcde';

    emitInput(input, 'abcde');

    expect(input.value).toBe('abcde');
    expect(correctedValues).toEqual([]);
  });

  it('handles empty values without correction', () => {
    const { input, correctedValues } = setup();

    emitInput(input, '');

    expect(input.value).toBe('');
    expect(correctedValues).toEqual([]);
  });

  it('truncates via the native input event', () => {
    const { input, correctedValues } = setup();
    input.value = 'abcdefgh';

    emitNativeInput(input);

    expect(input.value).toBe('abcde');
    expect(correctedValues).toEqual(['abcde']);
  });
});
