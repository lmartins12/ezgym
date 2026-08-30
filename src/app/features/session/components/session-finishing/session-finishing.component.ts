import {
  Component,
  computed,
  EventEmitter,
  input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SetLog, Workout, WorkoutSession } from '@core/models/app-models';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonTextarea,
} from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-session-finishing',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonTextarea,
    IonButton,
  ],
  templateUrl: './session-finishing.component.html',
  styleUrls: ['./session-finishing.component.scss'],
})
export class SessionFinishingComponent {
  public readonly session = input.required<WorkoutSession>();
  public readonly workout = input.required<Workout>();
  public readonly setLogs = input.required<SetLog[]>();

  @Output() saveSession = new EventEmitter<string>(); // emits notes
  @Output() resumeSession = new EventEmitter<void>();

  notes = '';

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
    this.saveSession.emit(this.notes);
  }
}
