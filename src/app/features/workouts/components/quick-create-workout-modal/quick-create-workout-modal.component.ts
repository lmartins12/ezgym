import {
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-quick-create-workout-modal',
  standalone: true,
  imports: [
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
    IonFooter,
    TranslateModule,
  ],
  templateUrl: './quick-create-workout-modal.component.html',
  styleUrls: ['./quick-create-workout-modal.component.scss'],
})
export class QuickCreateWorkoutModalComponent {
  private readonly modalCtrl = inject(ModalController);

  @ViewChild('input', { read: ElementRef })
  public readonly input?: ElementRef<HTMLInputElement>;

  public readonly workoutName = signal('');

  public ionViewDidEnter(): void {
    this.input?.nativeElement.focus();
  }

  public close(): void {
    this.modalCtrl.dismiss();
  }

  public submit(): void {
    if (!this.workoutName()) {
      return;
    }

    this.modalCtrl.dismiss(this.workoutName());
  }
}
