import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SetLog } from '@domain/sessions/set-log';
import type { WorkoutSession } from '@domain/sessions/workout-session';
import type { Workout } from '@domain/workouts/workout';
import { NOTES_MAX_LENGTH } from '@domain/shared/limits';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonTextarea,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { TextLimitDirective } from '@shared/directives/text-limit.directive';

@Component({
  selector: 'app-session-finishing',
  imports: [
    FormsModule,
    TranslatePipe,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonTextarea,
    IonButton,
    TextLimitDirective,
  ],
  templateUrl: './session-finishing.component.html',
  styleUrl: './session-finishing.component.scss',
})
export class SessionFinishingComponent {
  public readonly session = input.required<WorkoutSession>();
  public readonly workout = input.required<Workout>();
  public readonly setLogs = input.required<SetLog[]>();

  saveSession = output<string>(); // emits notes
  resumeSession = output<void>();

  notes = '';

  protected readonly notesMaxLength = NOTES_MAX_LENGTH;

  public readonly duration = computed(() => {
    const start = this.session().started_at;
    const end = Date.now();
    const diff = end - start;
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  });

  public readonly totalSets = computed(() => {
    return this.setLogs().length;
  });

  public readonly totalVolume = computed(() => {
    return this.setLogs().reduce((acc, log) => acc + log.weight * log.reps, 0);
  });

  onSave() {
    this.saveSession.emit(this.notes.trim());
  }
}
