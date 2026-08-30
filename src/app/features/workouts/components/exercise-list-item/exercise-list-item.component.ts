import { Component, input, output } from '@angular/core';
import type { WorkoutExercise } from '@core/models/app-models';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonReorder,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-exercise-list-item',
  imports: [
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonIcon,
    IonLabel,
    IonReorder,
    MuscleIconComponent,
  ],
  templateUrl: './exercise-list-item.component.html',
  styleUrl: './exercise-list-item.component.scss',
})
export class ExerciseListItemComponent {
  public readonly exercise = input.required<WorkoutExercise>();
  public readonly editExercise = output<WorkoutExercise>();
  public readonly deleteExercise = output<string>();

  constructor() {
    addIcons({
      createOutline,
      trashOutline,
    });
  }
}
