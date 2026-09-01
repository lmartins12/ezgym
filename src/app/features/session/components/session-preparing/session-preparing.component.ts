import { Component, input, output } from '@angular/core';
import type { Workout } from '@domain/workouts/workout';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-session-preparing',
  imports: [
    TranslatePipe,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonNote,
    MuscleIconComponent,
  ],
  templateUrl: './session-preparing.component.html',
  styleUrl: './session-preparing.component.scss',
})
export class SessionPreparingComponent {
  public readonly workout = input.required<Workout>();
  public readonly exercises = input.required<WorkoutExercise[]>();
  startSession = output<void>();
  cancelSession = output<void>();

  constructor() {
    addIcons({ timeOutline });
  }
}
