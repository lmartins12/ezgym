import { Component, EventEmitter, input, Output } from '@angular/core';
import type { WorkoutExercise } from '@core';
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonReorder,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-exercise-list-item',
  standalone: true,
  imports: [
    IonItem,
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonIcon,
    IonLabel,
    IonReorder,
  ],
  templateUrl: './exercise-list-item.component.html',
  styleUrls: ['./exercise-list-item.component.scss'],
})
export class ExerciseListItemComponent {
  public readonly exercise = input.required<WorkoutExercise>();

  @Output()
  public readonly editExercise = new EventEmitter<WorkoutExercise>();

  @Output()
  public readonly deleteExercise = new EventEmitter<string>();

  constructor() {
    addIcons({
      createOutline,
      trashOutline,
    });
  }
}
