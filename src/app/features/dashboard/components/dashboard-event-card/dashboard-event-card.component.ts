import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { IonIcon, IonItem, IonLabel } from '@ionic/angular';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import {
  barbell,
  ellipseOutline,
  moon,
  nutritionOutline,
} from 'ionicons/icons';
import type {
  DashboardEvent,
  DashboardEventType,
  WorkoutEvent,
} from '../../models/dashboard.models';

addIcons({
  barbell,
  ellipseOutline,
  nutritionOutline,
  moon,
});

@Component({
  selector: 'app-dashboard-event-card',
  imports: [DatePipe, IonIcon, IonItem, IonLabel, MuscleIconComponent],
  templateUrl: './dashboard-event-card.component.html',
  styleUrl: './dashboard-event-card.component.scss',
})
export class DashboardEventCardComponent {
  public readonly event = input.required<DashboardEvent>();
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');
  public readonly cardClick = output<DashboardEvent>();

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

  protected readonly muscleGroup = computed(() => {
    const evt = this.event();
    return this.isWorkoutEvent(evt) ? evt.muscle_group : undefined;
  });

  protected onClick(): void {
    this.cardClick.emit(this.event());
  }
}
