import { Component, EventEmitter, input, Output } from '@angular/core';
import type { Workout, WorkoutExercise } from '@core/models/app-models';
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
} from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-session-preparing',
  standalone: true,
  imports: [
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
