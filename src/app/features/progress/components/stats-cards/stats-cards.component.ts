import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
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
  imports: [CommonModule, IonCard, IonCardContent, IonIcon, TranslatePipe],
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.scss',
})
export class StatsCardsComponent {
  public readonly stats = input<WorkoutStats | null>(null);
  public readonly locale = input<'pt-BR' | 'en-US'>('pt-BR');

  protected readonly localeValue = computed(() => this.locale());
}
