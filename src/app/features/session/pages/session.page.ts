import {
  Component,
  ErrorHandler,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonService } from '@core/back-button/back-button';
import { HapticsService } from '@core/haptics/haptics';
import type { SetLog } from '@domain/sessions/set-log';
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
import { SessionFinishingComponent } from '../components/session-finishing/session-finishing.component';
import { SessionInProgressComponent } from '../components/session-in-progress/session-in-progress.component';
import { SessionPreparingComponent } from '../components/session-preparing/session-preparing.component';
import { SessionStore } from '../stores/session.store';

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
  public readonly sessionStore = inject(SessionStore);

  constructor() {
    addIcons({ barbellOutline, closeOutline });
  }

  public readonly isDashboard = signal(false);
  public readonly savingFinish = signal(false);
  public readonly startingSession = signal(false);
  private readonly alertCtrl = inject(AlertController);
  private readonly navCtrl = inject(NavController);
  private readonly translate = inject(TranslateService);
  private readonly backButton = inject(BackButtonService);
  private readonly haptics = inject(HapticsService);
  private readonly errorHandler = inject(ErrorHandler);
  protected readonly sessionProgress = viewChild(SessionInProgressComponent);

  async ionViewWillEnter() {
    const workoutId = this.id();

    if (workoutId) {
      this.isDashboard.set(false);
      const found = await this.sessionStore.initialize(workoutId);
      if (!found) {
        this.navCtrl.navigateBack('/tabs/workouts');
      }
    } else {
      this.isDashboard.set(true);
      // Check if there is ANY active session to resume
      await this.sessionStore.checkActiveSession();
    }
  }

  async onExitSession() {
    if (
      this.startingSession() ||
      this.savingFinish() ||
      this.sessionProgress()?.savingSet()
    )
      return;
    if (this.sessionStore.state() !== 'PREPARING') {
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
    await this.sessionStore.cancelSession();
    this.navCtrl.navigateBack('/tabs/workouts');
  }

  async onStartSession(): Promise<void> {
    if (this.startingSession()) return;
    this.startingSession.set(true);
    try {
      await this.sessionStore.startSession();
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this.startingSession.set(false);
    }
  }

  onCancelSession() {
    // This is called from Preparing state, so we just cancel immediately
    void this.cancelAndLeave();
  }

  async onLogSet(data: {
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
  }): Promise<void> {
    const progress = this.sessionProgress();
    try {
      if (!this.sessionStore.activeSession())
        throw new Error('No active session');
      await this.sessionStore.logSet({
        exercise_id: data.exerciseId,
        set_number: data.setNumber,
        reps: data.reps,
        weight: data.weight,
        rpe: data.rpe,
      });
      progress?.setSaveSucceeded();
      this.haptics.light();
    } catch (error) {
      progress?.setSaveFailed();
      this.errorHandler.handleError(error);
    }
  }

  onDeleteSet(setId: string) {
    void this.sessionStore.deleteSet(setId).then(() => this.haptics.medium());
  }

  onRequestFinish() {
    this.sessionStore.requestFinish();
  }

  onResumeSession() {
    this.sessionStore.resumeSession();
  }

  onSaveFinish(notes: string) {
    if (this.savingFinish()) return;
    this.savingFinish.set(true);
    void this.finishAndLeave(notes);
  }

  async onUpdateSet(log: SetLog): Promise<void> {
    const progress = this.sessionProgress();
    try {
      await this.sessionStore.updateSet(log);
      progress?.setSaveSucceeded();
      this.haptics.light();
    } catch (error) {
      progress?.setSaveFailed();
      this.errorHandler.handleError(error);
    }
  }

  private async finishAndLeave(notes: string): Promise<void> {
    try {
      if (!this.sessionStore.activeSession())
        throw new Error('No active session');
      await this.sessionStore.finishSession(notes);
      this.haptics.doubleTap();
      await this.navCtrl.navigateBack('/tabs/workouts');
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this.savingFinish.set(false);
    }
  }
}
