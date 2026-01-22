import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, input, Output } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonAccordion,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { listOutline, playOutline, trashOutline } from 'ionicons/icons';
import type { WorkoutDetail } from '../../models';

@Component({
  selector: 'app-workout-card',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonItem,
    IonButton,
    IonIcon,
    IonLabel,
    IonAccordion,
  ],
  templateUrl: './workout-card.component.html',
  styleUrls: ['./workout-card.component.scss'],
})
export class WorkoutCardComponent {
  public readonly workout = input.required<WorkoutDetail>();

  @Output()
  public readonly deleteWorkout = new EventEmitter<string>();

  @Output()
  public readonly startWorkout = new EventEmitter<string>();

  private readonly router = inject(Router);

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
