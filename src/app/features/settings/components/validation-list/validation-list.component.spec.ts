import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  ValidationErrorType,
  ValidationWarningType,
} from '@domain/import-export/export-data';
import pt from '../../../../../assets/i18n/pt.json';
import en from '../../../../../assets/i18n/en.json';
import { ValidationListComponent } from './validation-list.component';

describe('ValidationListComponent', () => {
  it.each([
    ['pt', pt],
    ['en', en],
  ] as const)(
    'interpolates workout and version in %s',
    async (language, translations) => {
      TestBed.configureTestingModule({
        providers: [provideIonicAngular(), provideTranslateService()],
      });
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation(language, translations);
      await firstValueFrom(translate.use(language));
      const component = TestBed.createComponent(
        ValidationListComponent,
      ).componentInstance;

      expect(
        component.getWarningMessage({
          type: ValidationWarningType.WORKOUT_WITHOUT_EXERCISES,
          message: 'WORKOUT_WITHOUT_EXERCISES',
          workoutName: 'Treino X',
        }),
      ).toContain('Treino X');
      expect(
        component.getErrorMessage({
          type: ValidationErrorType.UNSUPPORTED_VERSION,
          message: 'UNSUPPORTED_VERSION',
          value: '9.9',
        }),
      ).toContain('9.9');
    },
  );
});
