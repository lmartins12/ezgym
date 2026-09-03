import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import {
  IonButton,
  IonDatetime,
  IonDatetimeButton,
  IonIcon,
  IonLabel,
  IonModal,
} from '@ionic/angular';
import { BackButtonService } from '@core/back-button/back-button';
import { addIcons } from 'ionicons';
import { calendarOutline, closeCircle } from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard-date-filter',
  imports: [
    DatePipe,
    IonButton,
    IonDatetime,
    IonDatetimeButton,
    IonIcon,
    IonLabel,
    IonModal,
    TranslatePipe,
  ],
  templateUrl: './dashboard-date-filter.component.html',
  styleUrl: './dashboard-date-filter.component.scss',
})
export class DashboardDateFilterComponent {
  private readonly backButton = inject(BackButtonService);

  constructor() {
    addIcons({
      calendarOutline,
      closeCircle,
    });
  }

  public readonly startDate = input<Date | null>(null);
  public readonly endDate = input<Date | null>(null);
  public readonly isActive = input(false);
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');
  public readonly filterChanged = output<{
    start: Date | null;
    end: Date | null;
  }>();
  public readonly clearFilter = output<void>();

  protected readonly localeValue = computed(() => this.locale());
  protected readonly startDateISO = computed(
    () => this.startDate()?.toISOString() ?? null,
  );
  protected readonly endDateISO = computed(
    () => this.endDate()?.toISOString() ?? null,
  );

  protected onStartDateChange(event: CustomEvent): void {
    const value = event.detail.value;
    const startDate = value ? new Date(value) : null;
    this.emitFilterChange(startDate, this.endDate());
  }

  protected onDatetimeModalPresent(modal: IonModal): void {
    void this.backButton.track(modal);
  }

  protected onEndDateChange(event: CustomEvent): void {
    const value = event.detail.value;
    const endDate = value ? new Date(value) : null;
    this.emitFilterChange(this.startDate(), endDate);
  }

  protected onClear(): void {
    this.clearFilter.emit();
  }

  private emitFilterChange(start: Date | null, end: Date | null): void {
    this.filterChanged.emit({ start, end });
  }
}
