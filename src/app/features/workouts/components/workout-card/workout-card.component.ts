import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '@core/i18n/language';
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonReorder,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { listOutline, playOutline, trashOutline } from 'ionicons/icons';
import type { WorkoutDetail } from '../../models/workout-detail.models';

@Component({
  selector: 'app-workout-card',
  imports: [
    DatePipe,
    TranslatePipe,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonIcon,
    IonLabel,
    IonReorder,
    MuscleIconComponent,
  ],
  templateUrl: './workout-card.component.html',
  styleUrl: './workout-card.component.scss',
})
export class WorkoutCardComponent {
  public readonly workout = input.required<WorkoutDetail>();
  public readonly deleteWorkout = output<string>();
  public readonly startWorkout = output<WorkoutDetail>();

  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  public readonly dateFormat = computed(() =>
    this.languageService.isPortuguese() ? 'dd/MM/yy, HH:mm' : 'short',
  );

  constructor() {
    addIcons({
      listOutline,
      playOutline,
      trashOutline,
    });
  }

  public navigate(): void {
    this.router.navigate(['/workouts', this.workout().id]);
  }
}
