import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { LanguageService } from '@core/services/language.service';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { barbell, time } from 'ionicons/icons';
import type { FrequentWorkout } from '../../models/progress.models';
import { ProgressService } from '../../services/progress.service';

addIcons({ barbell, time });

@Component({
  selector: 'app-frequent-workouts',
  imports: [
    IonCard,
    IonCardContent,
    IonIcon,
    IonLabel,
    IonList,
    IonListHeader,
    TranslatePipe,
    MuscleIconComponent,
  ],
  templateUrl: './frequent-workouts.component.html',
  styleUrl: './frequent-workouts.component.scss',
})
export class FrequentWorkoutsComponent implements OnInit {
  private readonly progressService = inject(ProgressService);
  private readonly languageService = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(false);
  protected readonly workouts = signal<FrequentWorkout[]>([]);

  protected readonly currentLocale = computed(() =>
    this.languageService.isPortuguese() ? 'pt-BR' : 'en-US',
  );

  async ngOnInit(): Promise<void> {
    await this.loadWorkouts();
  }

  private async loadWorkouts(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.progressService.getFrequentWorkouts(5);
      this.workouts.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  protected getRelativeTime(timestamp: number): string {
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));

    if (days === 0) return this.translate.instant('PROGRESS.TIME_TODAY');
    if (days === 1) return this.translate.instant('PROGRESS.TIME_YESTERDAY');
    if (days < 7)
      return this.translate.instant('PROGRESS.TIME_DAYS_AGO', { count: days });
    if (days < 30)
      return this.translate.instant('PROGRESS.TIME_WEEKS_AGO', {
        count: Math.floor(days / 7),
      });
    return this.translate.instant('PROGRESS.TIME_MONTHS_AGO', {
      count: Math.floor(days / 30),
    });
  }
}
