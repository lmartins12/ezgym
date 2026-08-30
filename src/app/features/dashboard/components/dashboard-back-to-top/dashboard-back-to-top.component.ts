import { Component, input, output } from '@angular/core';
import { IonFab, IonFabButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowUp } from 'ionicons/icons';

addIcons({
  arrowUp,
});

@Component({
  selector: 'app-dashboard-back-to-top',
  imports: [IonFab, IonFabButton, IonIcon],
  templateUrl: './dashboard-back-to-top.component.html',
  styleUrl: './dashboard-back-to-top.component.scss',
})
export class DashboardBackToTopComponent {
  public readonly visible = input(false);
  public readonly clickTop = output<void>();

  protected onClick(): void {
    this.clickTop.emit();
  }
}
