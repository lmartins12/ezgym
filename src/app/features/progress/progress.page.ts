import { Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '@core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import {
  ExercisePRsComponent,
  FrequentWorkoutsComponent,
  MuscleDistributionComponent,
  StatsCardsComponent,
} from './components';
import type { WorkoutStats } from './models';
import { ProgressService } from './services';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonIcon,
    TranslateModule,
    StatsCardsComponent,
    FrequentWorkoutsComponent,
    ExercisePRsComponent,
    MuscleDistributionComponent,
  ],
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
})
export class ProgressPage {
  private readonly progressService = inject(ProgressService);
  private readonly languageService = inject(LanguageService);

  public readonly loading = signal(false);
  public readonly stats = signal<WorkoutStats | null>(null);

  public readonly currentLocale = computed(() =>
    this.languageService.isPortuguese() ? 'pt-BR' : 'en-US',
  );

  public async ionViewWillEnter(): Promise<void> {
    await this.loadStats();
  }

  private async loadStats(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.progressService.getWorkoutStats();
      this.stats.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
