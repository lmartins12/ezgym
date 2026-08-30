import {
  Component,
  EventEmitter,
  input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { IonFab, IonFabButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowUp } from 'ionicons/icons';

addIcons({
  arrowUp,
});

@Component({
  selector: 'app-dashboard-back-to-top',
  standalone: true,
  imports: [IonFab, IonFabButton, IonIcon],
  templateUrl: './dashboard-back-to-top.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard-back-to-top.component.scss'],
})
export class DashboardBackToTopComponent {
  public readonly visible = input(false);

  @Output()
  public readonly clickTop = new EventEmitter<void>();

  protected onClick(): void {
    this.clickTop.emit();
  }
}
