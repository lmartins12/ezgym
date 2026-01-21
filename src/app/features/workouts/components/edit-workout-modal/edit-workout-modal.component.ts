import { CommonModule } from '@angular/common';
import { Component, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Workout } from '@core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

export interface EditWorkoutResult {
  name: string;
  description?: string;
}

@Component({
  selector: 'app-edit-workout-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonFooter,
    TranslateModule,
  ],
  templateUrl: './edit-workout-modal.component.html',
  styleUrls: ['./edit-workout-modal.component.scss'],
})
export class EditWorkoutModalComponent {
  public readonly workout = input.required<Workout>();

  public readonly name = model('');
  public readonly description = model('');

  private readonly modalCtrl = inject(ModalController);

  public constructor() {
    // Initialize with workout data when it's available
  }

  public ionViewDidEnter(): void {
    this.name.set(this.workout().name);
    this.description.set(this.workout().description ?? '');
  }

  public close(): void {
    this.modalCtrl.dismiss();
  }

  public submit(): void {
    if (!this.name()) {
      return;
    }

    const result: EditWorkoutResult = {
      name: this.name(),
    };

    if (this.description()) {
      result.description = this.description();
    }

    this.modalCtrl.dismiss(result);
  }
}
