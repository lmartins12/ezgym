import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  inject,
  input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import {
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonReorder,
} from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { listOutline, playOutline, trashOutline } from 'ionicons/icons';
import type { WorkoutDetail } from '../../models/workout-detail.model';

@Component({
  selector: 'app-workout-card',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./workout-card.component.scss'],
})
export class WorkoutCardComponent {
  public readonly workout = input.required<WorkoutDetail>();

  @Output()
  public readonly deleteWorkout = new EventEmitter<string>();

  @Output()
  public readonly startWorkout = new EventEmitter<WorkoutDetail>();

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
