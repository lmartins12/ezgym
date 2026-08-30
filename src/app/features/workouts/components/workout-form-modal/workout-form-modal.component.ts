import {
  Component,
  computed,
  inject,
  Input,
  model,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MuscleGroup, Workout } from '@core/models/app-models';
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
import { TranslateModule } from '@ngx-translate/core';
import { MuscleGroupSelectorComponent } from '@shared/components/muscle-group-selector/muscle-group-selector.component';

export interface WorkoutFormResult {
  name: string;
  description?: string;
  muscle_group?: MuscleGroup;
}

@Component({
  selector: 'app-workout-form-modal',
  standalone: true,
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
    TranslateModule,
    MuscleGroupSelectorComponent,
  ],
  templateUrl: './workout-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./workout-form-modal.component.scss'],
})
export class WorkoutFormModalComponent {
  @Input() public workout?: Workout;

  public readonly name = model('');
  public readonly description = model('');
  public readonly muscleGroup = model<MuscleGroup | undefined>(undefined);
  protected readonly isEditMode = computed(() => !!this.workout);

  private readonly modalCtrl = inject(ModalController);

  public ionViewDidEnter(): void {
    if (this.workout) {
      this.name.set(this.workout.name);
      this.description.set(this.workout.description ?? '');
      this.muscleGroup.set(this.workout.muscle_group);
    }
  }

  public close(): void {
    this.modalCtrl.dismiss();
  }

  public submit(): void {
    if (!this.name()) {
      return;
    }

    const result: WorkoutFormResult = {
      name: this.name(),
    };

    if (this.description()) {
      result.description = this.description();
    }

    if (this.muscleGroup()) {
      result.muscle_group = this.muscleGroup();
    }

    this.modalCtrl.dismiss(result);
  }
}
