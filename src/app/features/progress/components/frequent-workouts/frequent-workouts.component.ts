import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { LanguageService } from '@core';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared';
import { addIcons } from 'ionicons';
import { barbell, time } from 'ionicons/icons';
import type { FrequentWorkout } from '../../models';
import { ProgressService } from '../../services';

addIcons({ barbell, time });

@Component({
  selector: 'app-frequent-workouts',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonIcon,
    IonLabel,
    IonList,
    IonListHeader,
    TranslateModule,
    MuscleIconComponent,
  ],
  templateUrl: './frequent-workouts.component.html',
  styleUrls: ['./frequent-workouts.component.scss'],
})
export class FrequentWorkoutsComponent {
  private readonly progressService = inject(ProgressService);
  private readonly languageService = inject(LanguageService);

  protected readonly loading = signal(false);
  protected readonly workouts = signal<FrequentWorkout[]>([]);

  protected readonly currentLocale = this.languageService.isPortuguese()
    ? 'pt-BR'
    : 'en-US';

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
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return this.currentLocale === 'pt-BR' ? 'Hoje' : 'Today';
    if (days === 1)
      return this.currentLocale === 'pt-BR' ? 'Ontem' : 'Yesterday';
    if (days < 7)
      return this.currentLocale === 'pt-BR'
        ? `${days} dias atrás`
        : `${days} days ago`;
    if (days < 30)
      return this.currentLocale === 'pt-BR'
        ? `${Math.floor(days / 7)} semanas atrás`
        : `${Math.floor(days / 7)} weeks ago`;

    return this.currentLocale === 'pt-BR'
      ? `${Math.floor(days / 30)} meses atrás`
      : `${Math.floor(days / 30)} months ago`;
  }
}
