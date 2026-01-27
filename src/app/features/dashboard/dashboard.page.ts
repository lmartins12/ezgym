import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '@core';
import {
  DashboardBackToTopComponent,
  DashboardCalendarComponent,
  DashboardDateFilterComponent,
  DashboardHistoryListComponent,
} from './components';
import { DashboardService } from './services';
import {
  dateToUnixEndOfDay,
  dateToUnixStartOfDay,
  getMonthEnd,
  getMonthStart,
} from './utils';
import type { DashboardEvent, PaginationState } from './models';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardBackToTopComponent,
    DashboardCalendarComponent,
    DashboardDateFilterComponent,
    DashboardHistoryListComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    TranslateModule,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);
  private readonly languageService = inject(LanguageService);

  @ViewChild('content', { read: IonContent })
  private readonly content?: IonContent;

  // Filter state
  public readonly filterStartDate = signal<Date | null>(null);
  public readonly filterEndDate = signal<Date | null>(null);
  public readonly selectedDate = signal<Date | null>(null);
  public readonly isFilterActive = computed(
    () =>
      this.filterStartDate() !== null ||
      this.filterEndDate() !== null ||
      this.selectedDate() !== null,
  );

  // Data state
  public readonly events = signal<DashboardEvent[]>([]);
  public readonly loading = signal(false);
  public readonly loadingMore = signal(false);

  // Pagination state
  public readonly pagination = signal<PaginationState>({
    currentPage: 0,
    pageSize: PAGE_SIZE,
    hasMore: true,
    totalLoaded: 0,
  });

  // Calendar state
  public readonly currentMonth = signal(new Date());
  public readonly datesWithEvents = signal<number[]>([]);

  // UI state
  public readonly showBackToTop = signal(false);

  // Locale for date formatting
  public readonly currentLocale = computed(() =>
    this.languageService.isPortuguese() ? 'pt-BR' : 'en-US',
  );

  public async ionViewWillEnter(): Promise<void> {
    await this.loadInitialData();
  }

  public async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.resetPagination();

    try {
      // Load dates with events for current month
      await this.loadDatesWithEvents();

      // Load first page of events
      await this.loadEventsPage();
    } finally {
      this.loading.set(false);
    }
  }

  public async loadMoreEvents(): Promise<void> {
    // Prevent duplicate loads
    if (this.loadingMore() || !this.pagination().hasMore) {
      return;
    }

    this.loadingMore.set(true);

    try {
      await this.loadEventsPage(this.pagination().currentPage + 1);
    } finally {
      this.loadingMore.set(false);
    }
  }

  public onDateSelected(date: Date): void {
    // Toggle selection: if clicking same date, clear selection
    if (this.selectedDate() && isSameDay(this.selectedDate()!, date)) {
      this.selectedDate.set(null);
      this.filterStartDate.set(null);
      this.filterEndDate.set(null);
    } else {
      this.selectedDate.set(date);
      this.filterStartDate.set(date);
      this.filterEndDate.set(date);
    }

    this.resetPagination();
    this.loadEventsPage();
  }

  public onMonthChanged(month: Date): void {
    this.currentMonth.set(month);
    this.loadDatesWithEvents();
  }

  public onDateRangeChanged(filter: {
    start: Date | null;
    end: Date | null;
  }): void {
    this.filterStartDate.set(filter.start);
    this.filterEndDate.set(filter.end);
    this.selectedDate.set(null); // Clear single date selection
    this.resetPagination();
    this.loadEventsPage();
  }

  public clearFilters(): void {
    this.selectedDate.set(null);
    this.filterStartDate.set(null);
    this.filterEndDate.set(null);
    this.resetPagination();
    this.loadEventsPage();
  }

  public onScroll(event: CustomEvent): void {
    const detail = event.detail as { scrollTop?: number };
    const scrollTop = detail.scrollTop ?? 0;
    this.showBackToTop.set(scrollTop > 300);
  }

  public scrollToTop(): void {
    this.content?.scrollToTop(300);
  }

  private async loadDatesWithEvents(): Promise<void> {
    const monthStart = getMonthStart(this.currentMonth());
    const monthEnd = getMonthEnd(this.currentMonth());

    const dates = await this.dashboardService.getDatesWithEvents(
      monthStart,
      monthEnd,
    );
    this.datesWithEvents.set(dates);
  }

  private async loadEventsPage(page: number = 0): Promise<void> {
    const startDate = this.filterStartDate()
      ? dateToUnixStartOfDay(this.filterStartDate()!)
      : null;
    const endDate = this.filterEndDate()
      ? dateToUnixEndOfDay(this.filterEndDate()!)
      : null;

    const offset = page * this.pagination().pageSize;

    const sessions = await this.dashboardService.getWorkoutSessions(
      startDate,
      endDate,
      offset,
      this.pagination().pageSize,
    );

    const newEvents = sessions.map((s) =>
      this.dashboardService.workoutSessionToEvent(s),
    );

    if (page === 0) {
      this.events.set(newEvents);
    } else {
      this.events.update((current) => [...current, ...newEvents]);
    }

    // Update pagination state
    const totalCount = await this.dashboardService.getWorkoutSessionsCount(
      startDate,
      endDate,
    );

    const totalLoaded = page === 0 ? newEvents.length : this.pagination().totalLoaded + newEvents.length;

    this.pagination.update((p) => ({
      ...p,
      currentPage: page,
      totalLoaded,
      hasMore: totalLoaded < totalCount,
    }));
  }

  private resetPagination(): void {
    this.events.set([]);
    this.pagination.set({
      currentPage: 0,
      pageSize: PAGE_SIZE,
      hasMore: true,
      totalLoaded: 0,
    });
  }
}

/**
 * Check if two dates are the same day.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
