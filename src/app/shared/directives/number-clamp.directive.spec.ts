import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { NumericRange } from '@domain/shared/limits';
import { NumberClampDirective } from './number-clamp.directive';

@Component({
  selector: 'app-test-host',
  template: '<div [appNumberClamp]="range"></div>',
  imports: [NumberClampDirective],
})
class TestHostComponent {
  public range: NumericRange = { min: 0, max: 1000 };
}

type InputHost = HTMLElement & { value?: unknown };
type NativeInput = HTMLInputElement;

describe('NumberClampDirective', () => {
  let rawEventValue: string | null = null;

  function setup() {
    const fixture = TestBed.createComponent(TestHostComponent);
    const host = fixture.nativeElement.querySelector('div') as InputHost;
    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<input inputmode="decimal" />';
    const native = shadowRoot.querySelector('input') as HTMLInputElement;
    fixture.detectChanges();

    const correctedValues: string[] = [];
    host.addEventListener('ionInput', (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      if (typeof detail?.value !== 'string') {
        return;
      }
      if (detail.value === rawEventValue) {
        return;
      }
      correctedValues.push(detail.value);
    });

    return { fixture, host, native, correctedValues };
  }

  function pressKey(native: HTMLInputElement, key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    native.dispatchEvent(event);
    return event;
  }

  function emitInput(host: HTMLElement, value: string): void {
    rawEventValue = value;
    host.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
    rawEventValue = null;
  }

  function emitNativeInput(native: NativeInput): void {
    native.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true }),
    );
  }

  function setCaret(native: HTMLInputElement, position: number): void {
    native.setSelectionRange(position, position);
  }

  it('blocks a digit that would exceed the max', () => {
    const { native } = setup();
    native.value = '999';
    setCaret(native, 3);

    expect(pressKey(native, '9').defaultPrevented).toBe(true);
    expect(native.value).toBe('999');
  });

  it('allows a digit that keeps the value within the max', () => {
    const { native } = setup();
    native.value = '99';
    setCaret(native, 2);

    expect(pressKey(native, '9').defaultPrevented).toBe(false);
  });

  it('allows reaching the max exactly', () => {
    const { native } = setup();
    native.value = '100';
    setCaret(native, 3);

    expect(pressKey(native, '0').defaultPrevented).toBe(false);
  });

  it('takes the caret position into account', () => {
    const { native } = setup();
    native.value = '999';
    setCaret(native, 0);

    expect(pressKey(native, '0').defaultPrevented).toBe(false);
    setCaret(native, 1);
    expect(pressKey(native, '9').defaultPrevented).toBe(true);
  });

  it('blocks non-numeric characters', () => {
    const { native } = setup();
    native.value = '10';
    setCaret(native, 2);

    for (const key of ['e', '-', '+', 'a', ' ']) {
      expect(pressKey(native, key).defaultPrevented).toBe(true);
    }
  });

  it('allows a single decimal point on decimal inputs', () => {
    const { native } = setup();
    native.value = '1';
    setCaret(native, 1);

    expect(pressKey(native, '.').defaultPrevented).toBe(false);
    native.value = '1.5';
    setCaret(native, 3);
    expect(pressKey(native, '.').defaultPrevented).toBe(true);
  });

  it('blocks decimal points on integer inputs', () => {
    const { native } = setup();
    native.setAttribute('inputmode', 'numeric');
    native.value = '1';
    setCaret(native, 1);

    expect(pressKey(native, '.').defaultPrevented).toBe(true);
  });

  it('corrects a pasted value above the max', () => {
    const { host, native, correctedValues } = setup();

    emitInput(host, '5000');

    expect(native.value).toBe('1000');
    expect(host.value).toBe('1000');
    expect(correctedValues).toEqual(['1000']);
  });

  it('does not touch pasted values within the max', () => {
    const { host, native, correctedValues } = setup();
    native.value = '999.5';

    emitInput(host, '999.5');

    expect(native.value).toBe('999.5');
    expect(correctedValues).toEqual([]);
  });

  it('truncates decimals pasted into integer inputs', () => {
    const { host, native, correctedValues } = setup();
    native.setAttribute('inputmode', 'numeric');

    emitInput(host, '3.7');

    expect(native.value).toBe('3');
    expect(correctedValues).toEqual(['3']);
  });

  it('clears values without any digits', () => {
    const { host, native, correctedValues } = setup();

    emitInput(host, 'abc');

    expect(native.value).toBe('');
    expect(correctedValues).toEqual(['']);
  });

  it('corrects overflow typed via the native input event', () => {
    const { native, correctedValues } = setup();
    native.value = '5000';

    emitNativeInput(native);

    expect(native.value).toBe('1000');
    expect(correctedValues).toEqual(['1000']);
  });

  it('keeps in-range values on the native input event', () => {
    const { native, correctedValues } = setup();
    native.value = '999.5';

    emitNativeInput(native);

    expect(native.value).toBe('999.5');
    expect(correctedValues).toEqual([]);
  });
});
