import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  barbell,
  calendarNumber,
  fitness,
  time,
  trendingUp,
} from 'ionicons/icons';
import type { WorkoutStats } from '../../models/progress.models';

addIcons({ barbell, calendarNumber, fitness, trendingUp, time });

@Component({
  selector: 'app-stats-cards',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonIcon, TranslateModule],
  templateUrl: './stats-cards.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./stats-cards.component.scss'],
})
export class StatsCardsComponent {
  public readonly stats = input<WorkoutStats | null>(null);
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');

  protected readonly localeValue = computed(() => this.locale());
}
