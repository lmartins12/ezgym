import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { OnboardingService } from '@core/onboarding/onboarding';
import { OnboardingWelcomeComponent } from './onboarding-welcome.component';

describe('OnboardingWelcomeComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });
  });

  it('dismisses the onboarding persistently', () => {
    TestBed.inject(OnboardingService);
    const component = TestBed.createComponent(
      OnboardingWelcomeComponent,
    ).componentInstance;

    component.dismiss();

    expect(localStorage.getItem('app_onboarding_seen')).toBe('true');
  });
});
