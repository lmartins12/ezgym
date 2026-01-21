import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { add, barbellOutline, settingsOutline } from 'ionicons/icons';
import type { EditWorkoutResult } from '../components';
import {
  EditWorkoutModalComponent,
  QuickCreateWorkoutModalComponent,
  WorkoutCardComponent,
} from '../components';
import type { WorkoutDetail } from '../models';
import { WorkoutsService } from '../services';

@Component({
  selector: 'app-workouts-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonList,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    WorkoutCardComponent,
  ],
  templateUrl: './workouts-list.page.html',
  styleUrls: ['./workouts-list.page.scss'],
})
export class WorkoutsListPage {
  private readonly workoutsService = inject(WorkoutsService);
  private readonly modalCtrl = inject(ModalController);
  private readonly alertCtrl = inject(AlertController);
  private readonly router = inject(Router);

  public readonly workouts = signal<WorkoutDetail[]>([]);
  public readonly loading = signal(false);

  constructor() {
    addIcons({
      add,
      settingsOutline,
      barbellOutline,
    });
  }

  public async ionViewWillEnter(): Promise<void> {
    await this.loadWorkouts();
  }

  private async loadWorkouts(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.workoutsService.getAll();
      this.workouts.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  public async openQuickCreate(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: QuickCreateWorkoutModalComponent,
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<string>();

    if (data) {
      const id = await this.workoutsService.create(data);
      this.router.navigate(['/workouts', id]);
    }
  }

  public async openEdit(workout: WorkoutDetail): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditWorkoutModalComponent,
      componentProps: { workout },
      breakpoints: [0, 0.7],
      initialBreakpoint: 0.7,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss<EditWorkoutResult>();

    if (data) {
      await this.workoutsService.update(
        workout.id,
        data.name,
        data.description,
      );
      await this.loadWorkouts();
    }
  }

  public async confirmDelete(workoutId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.workouts().find((w) => w.id === workoutId)?.name,
      message:
        '{{ "WORKOUTS.DELETE_CONFIRM" | translate }}\n\n{{ "WORKOUTS.DELETE_ALL_EXERCISES" | translate }}',
      buttons: [
        {
          text: '{{ "COMMON.CANCEL" | translate }}',
          role: 'cancel',
        },
        {
          text: '{{ "COMMON.DELETE" | translate }}',
          role: 'destructive',
          handler: async () => {
            await this.workoutsService.delete(workoutId);
            await this.loadWorkouts();
          },
        },
      ],
    });

    await alert.present();
  }

  public navigateToWorkout(workoutId: string): void {
    this.router.navigate(['/workouts', workoutId]);
  }
}
