import { Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '@core/services/language.service';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { ExercisePRsComponent } from './components/exercise-prs/exercise-prs.component';
import { FrequentWorkoutsComponent } from './components/frequent-workouts/frequent-workouts.component';
import { MuscleDistributionComponent } from './components/muscle-distribution/muscle-distribution.component';
import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import type { ProgressSnapshot } from './models/progress.models';
import { ProgressService } from './services/progress.service';

@Component({
  selector: 'app-progress',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonIcon,
    TranslatePipe,
    StatsCardsComponent,
    FrequentWorkoutsComponent,
    ExercisePRsComponent,
    MuscleDistributionComponent,
  ],
  templateUrl: './progress.page.html',
  styleUrl: './progress.page.scss',
})
export class ProgressPage {
  private readonly progressService = inject(ProgressService);
  private readonly languageService = inject(LanguageService);

  public readonly loading = signal(false);
  public readonly snapshot = signal<ProgressSnapshot | null>(null);

  public readonly currentLocale = computed(() =>
    this.languageService.isPortuguese() ? 'pt-BR' : 'en-US',
  );

  public async ionViewWillEnter(): Promise<void> {
    await this.loadSnapshot();
  }

  private async loadSnapshot(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.progressService.getProgressSnapshot();
      this.snapshot.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
