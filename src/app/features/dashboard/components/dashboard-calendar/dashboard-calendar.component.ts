import { Component, computed, EventEmitter, input, Output } from '@angular/core';
import { IonDatetime } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dashboard-calendar',
  standalone: true,
  imports: [IonDatetime],
  templateUrl: './dashboard-calendar.component.html',
  styleUrls: ['./dashboard-calendar.component.scss'],
})
export class DashboardCalendarComponent {
  public readonly currentMonth = input.required<Date>();
  public readonly datesWithEvents = input.required<number[]>();
  public readonly selectedDate = input<Date | null>(null);
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');

  protected readonly localeValue = computed(() => this.locale());
  protected readonly currentMonthISO = computed(() => this.currentMonth().toISOString());
  protected readonly selectedDateISO = computed(() => this.selectedDate()?.toISOString() ?? null);

  @Output()
  public readonly dateSelected = new EventEmitter<Date>();

  @Output()
  public readonly monthChanged = new EventEmitter<Date>();

  protected onDateChange(event: CustomEvent): void {
    const value = event.detail.value;
    if (value) {
      const date = new Date(value);

      // Check if month changed
      const currentMonth = this.currentMonth();
      if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
        this.monthChanged.emit(date);
      }

      this.dateSelected.emit(date);
    }
  }
}
