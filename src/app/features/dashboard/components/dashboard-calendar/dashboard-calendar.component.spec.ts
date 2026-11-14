import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { DashboardCalendarComponent } from './dashboard-calendar.component';

describe('DashboardCalendarComponent', () => {
  it('emits the local day selected in the calendar', () => {
    TestBed.configureTestingModule({ providers: [provideIonicAngular()] });
    const fixture = TestBed.createComponent(DashboardCalendarComponent);
    fixture.componentRef.setInput('currentMonth', new Date(2026, 10, 1));
    fixture.componentRef.setInput('datesWithEvents', []);
    const dates: Date[] = [];
    fixture.componentInstance.dateSelected.subscribe((value) =>
      dates.push(value),
    );

    fixture.componentInstance['onDateChange']({
      detail: { value: '2026-11-13' },
    } as CustomEvent);

    expect(dates).toHaveLength(1);
    expect([
      dates[0].getFullYear(),
      dates[0].getMonth(),
      dates[0].getDate(),
    ]).toEqual([2026, 10, 13]);
  });
});
