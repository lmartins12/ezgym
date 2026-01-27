import { Component, EventEmitter, input, Output } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import type { DashboardEvent } from '../../models';
import { DashboardEventCardComponent } from '../dashboard-event-card/dashboard-event-card.component';

addIcons({
  calendarOutline,
});

@Component({
  selector: 'app-dashboard-history-list',
  standalone: true,
  imports: [
    DashboardEventCardComponent,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonSpinner,
    TranslateModule,
  ],
  templateUrl: './dashboard-history-list.component.html',
  styleUrls: ['./dashboard-history-list.component.scss'],
})
export class DashboardHistoryListComponent {
  public readonly events = input.required<DashboardEvent[]>();
  public readonly loading = input(false);
  public readonly loadingMore = input(false);
  public readonly hasMore = input(true);

  @Output()
  public readonly loadMore = new EventEmitter<void>();

  @Output()
  public readonly eventClick = new EventEmitter<DashboardEvent>();

  protected onLoadMore(event: InfiniteScrollCustomEvent): void {
    this.loadMore.emit();
    event.target.complete();
  }

  protected onEventClick(event: DashboardEvent): void {
    this.eventClick.emit(event);
  }
}
