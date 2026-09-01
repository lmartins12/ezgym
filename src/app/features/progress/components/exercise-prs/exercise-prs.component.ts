import { Component, computed, inject, input } from '@angular/core';
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
import { formatStatNumber } from '@shared/utils/number.utils';
import { addIcons } from 'ionicons';
import { barbell, calendar, trophy } from 'ionicons/icons';
import type { ExercisePR } from '../../models/progress.models';

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
export class ExercisePRsComponent {
  private readonly languageService = inject(LanguageService);

  public readonly prs = input.required<ExercisePR[]>();

  protected readonly currentLocale = computed(() =>
    this.languageService.isPortuguese() ? 'pt-BR' : 'en-US',
  );

  // Top 5 PRs
  protected readonly topPrs = computed(() => this.prs().slice(0, 5));

  protected formatPRDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString(this.currentLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected formatWeight(weight: number): string {
    return formatStatNumber(weight, this.currentLocale());
  }
}
