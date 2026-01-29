import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import type { MuscleDistribution } from '../../models';
import { ProgressService } from '../../services';

@Component({
  selector: 'app-muscle-distribution',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonLabel,
    IonList,
    IonListHeader,
    TranslateModule,
  ],
  templateUrl: './muscle-distribution.component.html',
  styleUrls: ['./muscle-distribution.component.scss'],
})
export class MuscleDistributionComponent {
  private readonly progressService = inject(ProgressService);

  protected readonly loading = signal(false);
  protected readonly distribution = signal<MuscleDistribution[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadDistribution();
  }

  private async loadDistribution(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.progressService.getMuscleDistribution();
      this.distribution.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  protected getMuscleGroupKey(muscleGroup: string): string {
    return 'EXERCISE.MUSCLE_' + muscleGroup.toUpperCase();
  }
}
