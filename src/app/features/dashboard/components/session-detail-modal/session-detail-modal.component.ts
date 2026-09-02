import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import { formatStatNumber } from '@shared/utils/number.utils';
import { addIcons } from 'ionicons';
import { barbell, close, fitness } from 'ionicons/icons';
import type { SessionDetail } from '../../models/dashboard.models';

addIcons({ close, fitness, barbell });

@Component({
  selector: 'app-session-detail-modal',
  imports: [
    DatePipe,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonToolbar,
    TranslatePipe,
    MuscleIconComponent,
  ],
  templateUrl: './session-detail-modal.component.html',
  styleUrl: './session-detail-modal.component.scss',
})
export class SessionDetailModalComponent implements OnInit {
  private readonly modalController = inject(ModalController);

  @Input({ required: true }) sessionDetail!: SessionDetail;
  @Input() locale: 'pt-BR' | 'en-US' = 'pt-BR';

  // Internal signal for reactivity in template
  protected readonly detail = signal<SessionDetail | null>(null);

  protected readonly totalVolume = computed(() => {
    const detail = this.detail();
    if (!detail) return 0;

    return detail.exercises.reduce(
      (sum, ex) =>
        sum + ex.sets.reduce((s, set) => s + (set.weight ?? 0) * set.reps, 0),
      0,
    );
  });

  protected readonly totalSets = computed(() => {
    const detail = this.detail();
    if (!detail) return 0;

    return detail.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  });

  /** Session duration in whole minutes (DatePipe 'mm' breaks past 59 min). */
  protected readonly durationMinutes = computed(() => {
    const detail = this.detail();
    if (!detail?.finishedAt) return 0;

    return Math.max(
      0,
      Math.round((detail.finishedAt - detail.startedAt) / 60000),
    );
  });

  protected formatStat(value: number): string {
    return formatStatNumber(value, this.locale);
  }

  ngOnInit(): void {
    this.detail.set(this.sessionDetail);
  }

  protected closeModal(): void {
    this.modalController.dismiss();
  }
}
