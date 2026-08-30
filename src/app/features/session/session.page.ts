import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { barbellOutline, closeOutline } from 'ionicons/icons';
import { SessionFinishingComponent } from './components/session-finishing/session-finishing.component';
import { SessionInProgressComponent } from './components/session-in-progress/session-in-progress.component';
import { SessionPreparingComponent } from './components/session-preparing/session-preparing.component';
import { SessionService } from './services/session.service';

@Component({
  selector: 'app-session',
  standalone: true,
  imports: [
    TranslateModule,
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
  styleUrls: ['./session.page.scss'],
})
export class SessionPage {
  private readonly route = inject(ActivatedRoute);
  public readonly sessionService = inject(SessionService);

  constructor() {
    addIcons({ barbellOutline, closeOutline });
  }

  public readonly isDashboard = signal(false);
  private readonly alertCtrl = inject(AlertController);
  private readonly navCtrl = inject(NavController);
  private readonly translate = inject(TranslateService);

  async ionViewWillEnter() {
    const workoutId = this.route.snapshot.paramMap.get('id');

    if (workoutId) {
      this.isDashboard.set(false);
      await this.sessionService.initialize(workoutId);
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
              this.sessionService.cancelSession();
              this.navCtrl.navigateBack('/tabs/workouts');
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
    } else {
      this.sessionService.cancelSession();
      this.navCtrl.navigateBack('/tabs/workouts');
    }
  }

  onStartSession() {
    this.sessionService.startSession();
  }

  onCancelSession() {
    // This is called from Preparing state, so we just cancel immediately
    this.sessionService.cancelSession();
    this.navCtrl.navigateBack('/tabs/workouts');
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
    this.sessionService.finishSession(notes);
  }

  onUpdateSet(log: any) {
    this.sessionService.updateSet(log);
  }
}
