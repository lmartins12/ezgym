import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SetLog } from '@core/models/app-models';
import { BackButtonService } from '@core/services/back-button.service';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { barbellOutline, closeOutline } from 'ionicons/icons';
import { SessionFinishingComponent } from './components/session-finishing/session-finishing.component';
import { SessionInProgressComponent } from './components/session-in-progress/session-in-progress.component';
import { SessionPreparingComponent } from './components/session-preparing/session-preparing.component';
import { SessionService } from './services/session.service';

@Component({
  selector: 'app-session',
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    SessionPreparingComponent,
    SessionInProgressComponent,
    SessionFinishingComponent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButtons,
    IonButton,
    IonIcon,
    RouterLink,
  ],
  templateUrl: './session.page.html',
  styleUrl: './session.page.scss',
})
export class SessionPage {
  public readonly id = input<string>();
  public readonly sessionService = inject(SessionService);

  constructor() {
    addIcons({ barbellOutline, closeOutline });
  }

  public readonly isDashboard = signal(false);
  private readonly alertCtrl = inject(AlertController);
  private readonly navCtrl = inject(NavController);
  private readonly translate = inject(TranslateService);
  private readonly backButton = inject(BackButtonService);

  async ionViewWillEnter() {
    const workoutId = this.id();

    if (workoutId) {
      this.isDashboard.set(false);
      const found = await this.sessionService.initialize(workoutId);
      if (!found) {
        this.navCtrl.navigateBack('/tabs/workouts');
      }
    } else {
      this.isDashboard.set(true);
      // Check if there is ANY active session to resume
      await this.sessionService.checkActiveSession();
    }
  }

  async onExitSession() {
    if (this.sessionService.state() !== 'PREPARING') {
      const alert = await this.alertCtrl.create({
        header: this.translate.instant('SESSION.EXIT.TITLE'),
        message: this.translate.instant('SESSION.EXIT.MESSAGE'),
        buttons: [
          {
            text: this.translate.instant('SESSION.EXIT.DISCARD'),
            role: 'destructive',
            handler: () => {
              void this.cancelAndLeave();
            },
          },
          {
            text: this.translate.instant('SESSION.EXIT.RESUME_LATER'),
            handler: () => {
              this.navCtrl.navigateBack('/tabs/workouts');
            },
          },
          {
            text: this.translate.instant('COMMON.CANCEL'),
            role: 'cancel',
          },
        ],
      });
      await alert.present();
      void this.backButton.track(alert);
    } else {
      await this.cancelAndLeave();
    }
  }

  private async cancelAndLeave(): Promise<void> {
    await this.sessionService.cancelSession();
    this.navCtrl.navigateBack('/tabs/workouts');
  }

  onStartSession() {
    void this.sessionService.startSession();
  }

  onCancelSession() {
    // This is called from Preparing state, so we just cancel immediately
    void this.cancelAndLeave();
  }

  onLogSet(data: {
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
  }) {
    this.sessionService.logSet({
      exercise_id: data.exerciseId,
      set_number: data.setNumber,
      reps: data.reps,
      weight: data.weight,
      rpe: data.rpe,
    });
  }

  onDeleteSet(setId: string) {
    this.sessionService.deleteSet(setId);
  }

  onRequestFinish() {
    this.sessionService.requestFinish();
  }

  onResumeSession() {
    this.sessionService.resumeSession();
  }

  onSaveFinish(notes: string) {
    void this.finishAndLeave(notes);
  }

  onUpdateSet(log: SetLog) {
    this.sessionService.updateSet(log);
  }

  private async finishAndLeave(notes: string): Promise<void> {
    await this.sessionService.finishSession(notes);
    this.navCtrl.navigateBack('/tabs/workouts');
  }
}
