import { Component, computed, inject, input } from '@angular/core';
import type { ValidationError, ValidationWarning } from '@core';
import {
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { alertCircle, warningOutline } from 'ionicons/icons';

@Component({
  selector: 'app-validation-list',
  standalone: true,
  imports: [IonCard, IonIcon, IonItem, IonLabel, IonList, TranslateModule],
  templateUrl: './validation-list.component.html',
  styleUrls: ['./validation-list.component.scss'],
})
export class ValidationListComponent {
  // 1. Injeções
  protected readonly translate = inject(TranslateService);

  // 2. Inputs / Outputs
  public readonly errors = input.required<ValidationError[]>();
  public readonly warnings = input.required<ValidationWarning[]>();

  // 3. Signals
  public readonly hasErrors = computed(() => this.errors().length > 0);
  public readonly hasWarnings = computed(() => this.warnings().length > 0);

  // 4. Observables
  // 5. Propriedades
  // 6. Getters
  // 7. Lifecycle
  constructor() {
    addIcons({ alertCircle, warningOutline });
  }

  // 8. Públicos
  public getErrorMessage(error: ValidationError): string {
    let key = `IMPORT_EXPORT.${error.message}`;
    const params: Record<string, string | number> = {};

    if (error.value !== undefined) {
      params['value'] = String(error.value);
    }
    if (error.workoutName) {
      params['workout'] = error.workoutName;
    }
    if (error.exerciseName) {
      params['exercise'] = error.exerciseName;
    }

    // Replace placeholders in the translated message
    let message = this.translate.instant(key, params);

    // If translation returns the key, try a more specific format
    if (message === key) {
      if (error.type === 'UNSUPPORTED_VERSION') {
        message = this.translate.instant('IMPORT_EXPORT.UNSUPPORTED_VERSION', {
          version: error.value,
        });
      }
    }

    return message;
  }

  public getWarningMessage(warning: ValidationWarning): string {
    const key = `IMPORT_EXPORT.${warning.message}`;
    const params: Record<string, string | number> = {};

    if (warning.workoutName) {
      params['workout'] = warning.workoutName;
    }

    return this.translate.instant(key, params);
  }

  // 9. Protected
  // 10. Privados
}
