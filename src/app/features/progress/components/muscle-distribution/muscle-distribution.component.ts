import { Component, inject, signal, OnInit } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import type { MuscleDistribution } from '../../models/progress.models';
import { ProgressService } from '../../services/progress.service';

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
export class MuscleDistributionComponent implements OnInit {
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
