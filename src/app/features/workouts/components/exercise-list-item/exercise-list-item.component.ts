import {
  Component,
  EventEmitter,
  input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  standalone: true,
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
  changeDetection: ChangeDetectionStrategy.Eager,
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
