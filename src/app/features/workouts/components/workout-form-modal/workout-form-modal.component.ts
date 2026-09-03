import { Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MuscleGroup } from '@domain/shared/muscle-group';
import type { Workout } from '@domain/workouts/workout';
import { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } from '@domain/shared/limits';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonLabel,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleGroupSelectorComponent } from '@shared/components/muscle-group-selector/muscle-group-selector.component';
import { TextLimitDirective } from '@shared/directives/text-limit.directive';

export interface WorkoutFormResult {
  name: string;
  description?: string;
  muscle_group?: MuscleGroup;
}

@Component({
  selector: 'app-workout-form-modal',
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
    IonLabel,
    IonInput,
    IonTextarea,
    IonFooter,
    TranslatePipe,
    MuscleGroupSelectorComponent,
    TextLimitDirective,
  ],
  templateUrl: './workout-form-modal.component.html',
  styleUrl: './workout-form-modal.component.scss',
})
export class WorkoutFormModalComponent {
  public readonly workout = input<Workout | undefined>(undefined);

  public readonly name = model('');
  public readonly description = model('');
  public readonly muscleGroup = model<MuscleGroup | undefined>(undefined);
  protected readonly isEditMode = computed(() => !!this.workout());

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  private readonly modalCtrl = inject(ModalController);

  public ionViewDidEnter(): void {
    const workout = this.workout();
    if (workout) {
      this.name.set(workout.name);
      this.description.set(workout.description ?? '');
      this.muscleGroup.set(workout.muscle_group);
    }
  }

  public close(): void {
    void this.modalCtrl.dismiss();
  }

  public submit(): void {
    const name = this.name().trim();
    if (!name) {
      return;
    }

    const description = this.description().trim();
    const result: WorkoutFormResult = { name };

    if (description) {
      result.description = description;
    }

    if (this.muscleGroup()) {
      result.muscle_group = this.muscleGroup();
    }

    void this.modalCtrl.dismiss(result);
  }
}
