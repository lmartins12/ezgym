import {
  Component,
  computed,
  EventEmitter,
  input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IonDatetime } from '@ionic/angular';
import { toIsoDateString } from '@shared/utils/date.utils';

interface HighlightedDate {
  date: string;
  textColor: string;
  backgroundColor: string;
  border: string;
}

@Component({
  selector: 'app-dashboard-calendar',
  standalone: true,
  imports: [IonDatetime],
  templateUrl: './dashboard-calendar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-calendar.component.scss'],
})
export class DashboardCalendarComponent {
  public readonly currentMonth = input.required<Date>();
  public readonly datesWithEvents = input.required<number[]>();
  public readonly selectedDate = input<Date | null>(null);
  public readonly today = input<Date>(new Date());
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');

  @Output()
  public readonly dateSelected = new EventEmitter<Date>();

  @Output()
  public readonly monthChanged = new EventEmitter<Date>();

  protected readonly localeValue = computed(() => this.locale());
  protected readonly currentMonthISO = computed(() =>
    this.currentMonth().toISOString(),
  );
  protected readonly selectedDateISO = computed(
    () => this.selectedDate()?.toISOString() ?? null,
  );

  /**
   * Today's date as ISO string (YYYY-MM-DD) for comparison.
   */
  protected readonly todayISO = computed(() => toIsoDateString(this.today()));

  /**
   * Set of date strings (YYYY-MM-DD) that have events for O(1) lookup.
   */
  protected readonly eventDatesSet = computed(() => {
    const dateStrings = this.datesWithEvents().map((timestamp) =>
      toIsoDateString(new Date(timestamp)),
    );
    return new Set(dateStrings);
  });

  /**
   * Formatted highlighted dates for ion-datetime.
   */
  protected readonly highlightedDates = computed(() => {
    return this.datesWithEvents().map((timestamp) =>
      this.formatHighlightedDate(new Date(timestamp)),
    );
  });

  /**
   * Check if a date is enabled. Returns true if the date has events OR if it's today.
   */
  protected isDateEnabled = (dateString: string): boolean => {
    return (
      this.eventDatesSet().has(dateString) || dateString === this.todayISO()
    );
  };

  protected onDateChange(event: CustomEvent): void {
    const value = event.detail.value;
    if (value) {
      const date = new Date(value);

      // Check if month changed
      const currentMonth = this.currentMonth();
      if (
        date.getMonth() !== currentMonth.getMonth() ||
        date.getFullYear() !== currentMonth.getFullYear()
      ) {
        this.monthChanged.emit(date);
      }

      this.dateSelected.emit(date);
    }
  }

  /**
   * Format a date as a highlighted date object for ion-datetime.
   */
  private formatHighlightedDate(date: Date): HighlightedDate {
    return {
      date: toIsoDateString(date),
      textColor: 'var(--ion-text-color)',
      backgroundColor: 'var(--glass-bg-solid)',
      border: '1px solid var(--ion-border-color)',
    };
  }
}
