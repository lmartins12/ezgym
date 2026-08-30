import { Component, input } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import type { MuscleDistribution } from '../../models/progress.models';

@Component({
  selector: 'app-muscle-distribution',
  imports: [
    IonCard,
    IonCardContent,
    IonLabel,
    IonList,
    IonListHeader,
    TranslatePipe,
  ],
  templateUrl: './muscle-distribution.component.html',
  styleUrl: './muscle-distribution.component.scss',
})
export class MuscleDistributionComponent {
  public readonly distribution = input.required<MuscleDistribution[]>();

  protected getMuscleGroupKey(muscleGroup: string): string {
    return 'EXERCISE.MUSCLE_' + muscleGroup.toUpperCase();
  }
}
