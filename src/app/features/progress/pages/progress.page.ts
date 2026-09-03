import { Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '@core/i18n/language';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { trendingUp } from 'ionicons/icons';
import { ExercisePRsComponent } from '../components/exercise-prs/exercise-prs.component';
import { FrequentWorkoutsComponent } from '../components/frequent-workouts/frequent-workouts.component';
import { MuscleDistributionComponent } from '../components/muscle-distribution/muscle-distribution.component';
import { StatsCardsComponent } from '../components/stats-cards/stats-cards.component';
import type { ProgressSnapshot } from '../models/progress.models';
import { ProgressQuery } from '../queries/progress.query';

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
  private readonly progressQuery = inject(ProgressQuery);
  private readonly languageService = inject(LanguageService);

  public readonly loading = signal(false);
  public readonly snapshot = signal<ProgressSnapshot | null>(null);

  public readonly currentLocale = computed(() =>
    this.languageService.isPortuguese() ? 'pt-BR' : 'en-US',
  );

  constructor() {
    addIcons({ trendingUp });
  }

  public async ionViewWillEnter(): Promise<void> {
    await this.loadSnapshot();
  }

  private async loadSnapshot(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.progressQuery.getProgressSnapshot();
      this.snapshot.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
