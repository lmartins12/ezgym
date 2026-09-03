import { Component, input, output } from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import type { SetLog } from '@domain/sessions/set-log';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';

/**
 * Logged-sets list for the current exercise. Presentational: the
 * parent owns the logs and the editing state; this component only
 * renders rows and emits user intents.
 */
@Component({
  selector: 'app-session-logs-list',
  imports: [
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    TranslatePipe,
  ],
  templateUrl: './session-logs-list.component.html',
  styleUrl: './session-logs-list.component.scss',
})
export class SessionLogsListComponent {
  public readonly logs = input.required<SetLog[]>();
  public readonly editingSetId = input.required<string | null>();

  public readonly editSet = output<SetLog>();
  public readonly deleteSet = output<string>();

  constructor() {
    addIcons({ createOutline, trashOutline });
  }
}
