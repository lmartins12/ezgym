import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RestTimerService } from './rest-timer';

@Component({
  template: '',
  providers: [RestTimerService],
})
class HostComponent {
  readonly timer = inject(RestTimerService);
}

describe('RestTimerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    return { fixture, timer: fixture.componentInstance.timer };
  }

  it('counts down and fires onComplete exactly once at zero', () => {
    const { fixture, timer } = setup();
    const completed = vi.fn();

    timer.start(3, completed);

    expect(timer.isResting()).toBe(true);
    expect(timer.restRemaining()).toBe(3);

    vi.advanceTimersByTime(2000);
    expect(timer.restRemaining()).toBe(1);
    expect(completed).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(timer.isResting()).toBe(false);
    expect(completed).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('flags justFinished and clears it after the feedback window', () => {
    const { fixture, timer } = setup();

    timer.start(1);
    vi.advanceTimersByTime(1000);

    expect(timer.justFinished()).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(timer.justFinished()).toBe(false);
    fixture.destroy();
  });

  it('does not fire onComplete when skipped', () => {
    const { fixture, timer } = setup();
    const completed = vi.fn();

    timer.start(60, completed);
    timer.skip();

    expect(timer.isResting()).toBe(false);
    vi.advanceTimersByTime(120_000);
    expect(completed).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('extends the remaining time with addSeconds, keeping the ring within bounds', () => {
    const { fixture, timer } = setup();

    timer.start(60);
    vi.advanceTimersByTime(10_000);
    timer.addSeconds(30);

    expect(timer.restRemaining()).toBe(80);
    expect(timer.restDuration()).toBe(80);
    fixture.destroy();
  });

  it('ignores addSeconds and skip when there is no active rest', () => {
    const { fixture, timer } = setup();

    expect(() => {
      timer.addSeconds(30);
      timer.skip();
    }).not.toThrow();
    expect(timer.isResting()).toBe(false);
    fixture.destroy();
  });

  it('ignores non-positive durations', () => {
    const { fixture, timer } = setup();

    timer.start(0);

    expect(timer.isResting()).toBe(false);
    expect(timer.restRemaining()).toBe(0);
    fixture.destroy();
  });

  it('restarts the countdown when started while already resting', () => {
    const { fixture, timer } = setup();
    const first = vi.fn();

    timer.start(60, first);
    vi.advanceTimersByTime(5_000);
    timer.start(10);

    vi.advanceTimersByTime(60_000);
    expect(timer.restRemaining()).toBe(0);
    expect(first).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('stops the countdown when destroyed', () => {
    const { fixture, timer } = setup();

    timer.start(60);
    fixture.destroy();
    vi.advanceTimersByTime(120_000);

    expect(timer.restRemaining()).toBe(60);
  });

  it('recovers the remaining time from the wall clock when ticks are suspended', () => {
    const { fixture, timer } = setup();
    const completed = vi.fn();

    timer.start(60, completed);
    vi.advanceTimersByTime(10_000);

    // Background: the clock moves while interval ticks stay suspended.
    vi.setSystemTime(Date.now() + 25_000);
    expect(timer.restRemaining()).toBe(50);

    document.dispatchEvent(new Event('visibilitychange'));

    expect(timer.restRemaining()).toBe(25);
    expect(completed).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('completes on visibility sync when the deadline passed while hidden', () => {
    const { fixture, timer } = setup();
    const completed = vi.fn();

    timer.start(60, completed);
    vi.advanceTimersByTime(10_000);

    vi.setSystemTime(Date.now() + 50_000);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(timer.isResting()).toBe(false);
    expect(timer.restRemaining()).toBe(0);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(timer.justFinished()).toBe(true);
    fixture.destroy();
  });

  it('stops the visibility sync when destroyed', () => {
    const { fixture, timer } = setup();

    timer.start(60);
    fixture.destroy();

    expect(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    ).not.toThrow();
    expect(timer.restRemaining()).toBe(60);
  });
});
