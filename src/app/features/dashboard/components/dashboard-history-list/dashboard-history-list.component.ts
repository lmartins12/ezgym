import { Component, input, output } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonSpinner,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import type { DashboardEvent } from '../../models/dashboard.models';
import { DashboardEventCardComponent } from '../dashboard-event-card/dashboard-event-card.component';

addIcons({
  calendarOutline,
});

@Component({
  selector: 'app-dashboard-history-list',
  imports: [
    DashboardEventCardComponent,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonSpinner,
    TranslatePipe,
  ],
  templateUrl: './dashboard-history-list.component.html',
  styleUrl: './dashboard-history-list.component.scss',
})
export class DashboardHistoryListComponent {
  public readonly events = input.required<DashboardEvent[]>();
  public readonly loading = input(false);
  public readonly loadingMore = input(false);
  public readonly hasMore = input(true);
  public readonly loadMore = output<void>();
  public readonly eventClick = output<DashboardEvent>();

  protected onLoadMore(event: InfiniteScrollCustomEvent): void {
    this.loadMore.emit();
    event.target.complete();
  }

  protected onEventClick(event: DashboardEvent): void {
    this.eventClick.emit(event);
  }
}
