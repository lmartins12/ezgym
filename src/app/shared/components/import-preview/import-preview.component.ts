import { Component, computed, input } from '@angular/core';
import type { ImportPreview } from '@core';
import { IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  checkmarkCircleOutline,
  fitnessOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-import-preview',
  standalone: true,
  imports: [IonCard, IonCardContent, IonIcon, TranslateModule],
  templateUrl: './import-preview.component.html',
  styleUrls: ['./import-preview.component.scss'],
})
export class ImportPreviewComponent {
  public readonly preview = input.required<ImportPreview>();

  public readonly showNewExercises = computed(
    () => this.preview().newExercises.length > 0,
  );
  public readonly showExistingExercises = computed(
    () => this.preview().existingExercises.length > 0,
  );

  constructor() {
    addIcons({ fitnessOutline, arrowForwardOutline, checkmarkCircleOutline });
  }
}
