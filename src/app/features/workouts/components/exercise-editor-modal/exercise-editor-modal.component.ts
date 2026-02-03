import { Component, inject, Input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { MuscleGroup, WorkoutExercise } from '@core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItemDivider,
  IonLabel,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MuscleGroupSelectorComponent } from '@shared';

export interface ExerciseData {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  notes?: string;
  sets: number;
  reps: string;
  targetWeight?: number;
  restSeconds: number;
}

@Component({
  selector: 'app-exercise-editor-modal',
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
    IonItemDivider,
    IonFooter,
    TranslateModule,
    MuscleGroupSelectorComponent,
  ],
  templateUrl: './exercise-editor-modal.component.html',
  styleUrls: ['./exercise-editor-modal.component.scss'],
})
export class ExerciseEditorModalComponent {
  @Input() public exercise?: WorkoutExercise;

  public readonly name = model('');
  public readonly muscleGroup = model<MuscleGroup>('upper');
  public readonly equipment = model('');
  public readonly notes = model('');
  public readonly sets = model(3);
  public readonly reps = model('12');
  public readonly targetWeight = model<number | undefined>(undefined);
  public readonly restSeconds = model(60);

  private readonly modalCtrl = inject(ModalController);

  public ionViewDidEnter(): void {
    if (this.exercise) {
      // Edit mode - populate with existing data
      const ex = this.exercise;
      this.name.set(ex.exercise_name ?? '');
      this.sets.set(ex.sets);
      this.reps.set(ex.reps);
      this.targetWeight.set(ex.target_weight);
      this.restSeconds.set(ex.rest_seconds);
    }
  }

  public close(): void {
    this.modalCtrl.dismiss();
  }

  public submit(): void {
    if (!this.name()) {
      return;
    }

    const data: ExerciseData = {
      name: this.name(),
      muscleGroup: this.muscleGroup(),
      equipment: this.equipment() || undefined,
      notes: this.notes() || undefined,
      sets: this.sets(),
      reps: this.reps(),
      targetWeight: this.targetWeight(),
      restSeconds: this.restSeconds(),
    };

    this.modalCtrl.dismiss(data);
  }
}
