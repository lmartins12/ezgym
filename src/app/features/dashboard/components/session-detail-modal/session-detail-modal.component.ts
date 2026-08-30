import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
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
import { addIcons } from 'ionicons';
import { barbell, close, fitness } from 'ionicons/icons';
import type { SessionDetail } from '../../models/dashboard.models';

addIcons({ close, fitness, barbell });

@Component({
  selector: 'app-session-detail-modal',
  imports: [
    CommonModule,
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

  ngOnInit(): void {
    this.detail.set(this.sessionDetail);
  }

  protected get totalVolume(): number {
    const detail = this.detail();
    if (!detail) return 0;

    return detail.exercises.reduce(
      (sum, ex) =>
        sum + ex.sets.reduce((s, set) => s + (set.weight ?? 0) * set.reps, 0),
      0,
    );
  }

  protected get totalSets(): number {
    const detail = this.detail();
    if (!detail) return 0;

    return detail.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  }

  protected closeModal(): void {
    this.modalController.dismiss();
  }
}
