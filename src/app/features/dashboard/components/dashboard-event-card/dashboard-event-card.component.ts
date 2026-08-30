import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  input,
  Output,
} from '@angular/core';
import type { MuscleGroup } from '@core/models/app-models';
import { IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { barbell, moon, nutritionOutline } from 'ionicons/icons';
import type {
  DashboardEvent,
  DashboardEventType,
  WorkoutEvent,
} from '../../models/dashboard.models';

addIcons({
  barbell,
  nutritionOutline,
  moon,
});

@Component({
  selector: 'app-dashboard-event-card',
  standalone: true,
  imports: [
    DatePipe,
    IonIcon,
    IonItem,
    IonLabel,
    TranslateModule,
    MuscleIconComponent,
  ],
  templateUrl: './dashboard-event-card.component.html',
  styleUrls: ['./dashboard-event-card.component.scss'],
})
export class DashboardEventCardComponent {
  public readonly event = input.required<DashboardEvent>();
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');

  @Output()
  public readonly cardClick = new EventEmitter<DashboardEvent>();

  protected readonly localeValue = computed(() => this.locale());

  protected isWorkoutEvent(event: DashboardEvent): event is WorkoutEvent {
    return event.type === 'workout';
  }

  protected getIconForType(type: DashboardEventType): string {
    const iconMap: Record<DashboardEventType, string> = {
      workout: 'barbell',
      nutrition: 'nutrition-outline',
      sleep: 'moon',
      other: 'ellipse-outline',
    };
    return iconMap[type];
  }

  protected get muscleGroup(): MuscleGroup | undefined {
    const evt = this.event();
    if (this.isWorkoutEvent(evt)) {
      return evt.muscle_group;
    }
    return undefined;
  }

  protected onClick(): void {
    this.cardClick.emit(this.event());
  }
}
