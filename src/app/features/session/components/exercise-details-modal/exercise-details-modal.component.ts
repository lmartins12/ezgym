import { Component, inject, Input } from '@angular/core';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { barbell, closeOutline, fitness, time } from 'ionicons/icons';

@Component({
  selector: 'app-exercise-details-modal',
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonIcon,
    MuscleIconComponent,
  ],
  templateUrl: './exercise-details-modal.component.html',
  styleUrl: './exercise-details-modal.component.scss',
})
export class ExerciseDetailsModalComponent {
  @Input({ required: true }) exercise!: WorkoutExercise;

  private readonly modalCtrl = inject(ModalController);

  constructor() {
    addIcons({ closeOutline, fitness, time, barbell });
  }

  public close(): void {
    void this.modalCtrl.dismiss();
  }

  protected get muscleGroupLabelKey(): string | null {
    const group = this.exercise.muscle_group;
    return group ? `EXERCISE.MUSCLE_${group.toUpperCase()}` : null;
  }
}
