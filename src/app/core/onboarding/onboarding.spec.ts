import { TestBed } from '@angular/core/testing';
import { OnboardingService } from './onboarding';

describe('OnboardingService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows onboarding when the flag is absent', () => {
    const service = TestBed.inject(OnboardingService);

    expect(service.shouldShow()).toBe(true);
  });

  it('hides onboarding when the flag was already persisted', () => {
    localStorage.setItem('app_onboarding_seen', 'true');
    const service = TestBed.inject(OnboardingService);

    expect(service.shouldShow()).toBe(false);
  });

  it('persists the flag on dismiss and never shows again', () => {
    const service = TestBed.inject(OnboardingService);

    service.dismiss();

    expect(localStorage.getItem('app_onboarding_seen')).toBe('true');
    expect(service.shouldShow()).toBe(false);
  });
});
