import { Component, inject, signal, OnInit } from '@angular/core';
import { LanguageService } from '@core/services/language.service';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { barbell, calendar, trophy } from 'ionicons/icons';
import type { ExercisePR } from '../../models/progress.models';
import { ProgressService } from '../../services/progress.service';

addIcons({ barbell, calendar, trophy });

@Component({
  selector: 'app-exercise-prs',
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
  templateUrl: './exercise-prs.component.html',
  styleUrl: './exercise-prs.component.scss',
})
export class ExercisePRsComponent implements OnInit {
  private readonly progressService = inject(ProgressService);
  private readonly languageService = inject(LanguageService);

  protected readonly loading = signal(false);
  protected readonly prs = signal<ExercisePR[]>([]);

  protected readonly currentLocale = this.languageService.isPortuguese()
    ? 'pt-BR'
    : 'en-US';

  async ngOnInit(): Promise<void> {
    await this.loadPRs();
  }

  private async loadPRs(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.progressService.getExercisePRs();
      this.prs.set(data.slice(0, 5)); // Top 5 PRs
    } finally {
      this.loading.set(false);
    }
  }

  protected formatPRDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString(this.currentLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
