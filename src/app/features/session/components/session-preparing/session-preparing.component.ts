import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Output } from '@angular/core';
import type { Workout, WorkoutExercise } from '@core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-session-preparing',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonNote,
    MuscleIconComponent,
  ],
  templateUrl: './session-preparing.component.html',
  styleUrls: ['./session-preparing.component.scss'],
})
export class SessionPreparingComponent {
  public readonly workout = input.required<Workout>();
  public readonly exercises = input.required<WorkoutExercise[]>();
  @Output() startSession = new EventEmitter<void>();
  @Output() cancelSession = new EventEmitter<void>();

  constructor() {
    addIcons({ timeOutline });
  }
}
