import { DatePipe } from '@angular/common';
import { Component, computed, EventEmitter, input, Output } from '@angular/core';
import {
  IonButton,
  IonDatetime,
  IonDatetimeButton,
  IonIcon,
  IonLabel,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, closeCircle } from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';

addIcons({
  calendarOutline,
  closeCircle,
});

@Component({
  selector: 'app-dashboard-date-filter',
  standalone: true,
  imports: [
    DatePipe,
    IonButton,
    IonDatetime,
    IonDatetimeButton,
    IonIcon,
    IonLabel,
    IonModal,
    TranslateModule,
  ],
  templateUrl: './dashboard-date-filter.component.html',
  styleUrls: ['./dashboard-date-filter.component.scss'],
})
export class DashboardDateFilterComponent {
  public readonly startDate = input<Date | null>(null);
  public readonly endDate = input<Date | null>(null);
  public readonly isActive = input(false);
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');

  protected readonly localeValue = computed(() => this.locale());
  protected readonly startDateISO = computed(() => this.startDate()?.toISOString() ?? null);
  protected readonly endDateISO = computed(() => this.endDate()?.toISOString() ?? null);

  @Output()
  public readonly filterChanged = new EventEmitter<{
    start: Date | null;
    end: Date | null;
  }>();

  @Output()
  public readonly clearFilter = new EventEmitter<void>();

  protected onStartDateChange(event: CustomEvent): void {
    const value = event.detail.value;
    const startDate = value ? new Date(value) : null;
    this.emitFilterChange(startDate, this.endDate());
  }

  protected onEndDateChange(event: CustomEvent): void {
    const value = event.detail.value;
    const endDate = value ? new Date(value) : null;
    this.emitFilterChange(this.startDate(), endDate);
  }

  protected onClear(): void {
    this.clearFilter.emit();
  }

  private emitFilterChange(
    start: Date | null,
    end: Date | null,
  ): void {
    this.filterChanged.emit({ start, end });
  }
}
