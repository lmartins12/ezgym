import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { LanguageService } from '@core/services/language.service';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ExercisePRsComponent } from './components/exercise-prs/exercise-prs.component';
import { FrequentWorkoutsComponent } from './components/frequent-workouts/frequent-workouts.component';
import { MuscleDistributionComponent } from './components/muscle-distribution/muscle-distribution.component';
import { StatsCardsComponent } from './components/stats-cards/stats-cards.component';
import type { WorkoutStats } from './models/progress.models';
import { ProgressService } from './services/progress.service';

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
  changeDetection: ChangeDetectionStrategy.Eager,
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
