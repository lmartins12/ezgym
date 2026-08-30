import {
  Component,
  computed,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type {
  ValidationErrorType,
  ValidationResult,
  ValidationWarning,
} from '@core/models/import-export.models';
import { ImportExportService } from '@core/services/import-export.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { AiPromptModalComponent } from '@shared/components/ai-prompt-modal/ai-prompt-modal.component';
import { ImportPreviewComponent } from '@shared/components/import-preview/import-preview.component';
import { ValidationListComponent } from '@shared/components/validation-list/validation-list.component';
import { ImportValidation } from '@shared/utils/validation.utils';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  closeOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  shareOutline,
  sparklesOutline,
} from 'ionicons/icons';

export type ImportExportTab = 'export' | 'import';

@Component({
  selector: 'app-import-export-modal',
  standalone: true,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTextarea,
    IonTitle,
    IonToolbar,
    TranslateModule,
    ImportPreviewComponent,
    ValidationListComponent,
  ],
  templateUrl: './import-export-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./import-export-modal.component.scss'],
})
export class ImportExportModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly importExportService = inject(ImportExportService);

  public readonly initialTab = input<ImportExportTab>('export');

  public readonly currentTab = signal<ImportExportTab>(this.initialTab());
  public readonly isLoading = signal(false);
  public readonly exportJson = signal<string>('');
  public readonly importJson = signal<string>('');
  public readonly validationResult = signal<ValidationResult | null>(null);
  public readonly importPreview = signal<{
    workoutCount: number;
    newExercises: string[];
    existingExercises: string[];
    warnings: ValidationWarning[];
  } | null>(null);
  public readonly showPreview = signal(false);

  public readonly canImport = computed(() => {
    const result = this.validationResult();
    return (
      result && result.isValid && result.workoutCount > 0 && !this.isLoading()
    );
  });

  public readonly hasValidationErrors = computed(() => {
    const result = this.validationResult();
    return result && result.errors.length > 0;
  });

  public readonly isExportTab = computed(() => this.currentTab() === 'export');
  public readonly isImportTab = computed(() => this.currentTab() === 'import');

  constructor() {
    addIcons({
      clipboardOutline,
      cloudDownloadOutline,
      cloudUploadOutline,
      closeOutline,
      shareOutline,
      sparklesOutline,
    });
    this.loadExportData();
  }

  public switchTab(tab: ImportExportTab): void {
    this.currentTab.set(tab);
  }

  public async onGenerateJson(): Promise<void> {
    this.isLoading.set(true);
    try {
      const json = await this.importExportService.exportWorkouts();
      this.exportJson.set(json);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async onCopyToClipboard(): Promise<void> {
    const json = this.exportJson();
    if (json) {
      await this.importExportService.copyToClipboard(json);
    }
  }

  public async onShare(): Promise<void> {
    const json = this.exportJson();
    if (json) {
      await this.importExportService.shareJson(json);
    }
  }

  public async onPasteFromClipboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.importExportService.getFromClipboard();
      if (result?.value) {
        this.importJson.set(result.value);
        await this.validateImport();
      }
    } catch (error) {
      console.error('Paste failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async onValidate(): Promise<void> {
    await this.validateImport();
  }

  public async onPreviewImport(): Promise<void> {
    const json = this.importJson();
    if (!json) return;

    this.isLoading.set(true);
    try {
      const preview = await this.importExportService.getImportPreview(json);
      if (preview) {
        this.importPreview.set(preview);
        this.showPreview.set(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async onConfirmImport(): Promise<void> {
    const json = this.importJson();
    if (!json) return;

    this.isLoading.set(true);
    try {
      const result = await this.importExportService.importWorkouts(json);
      if (result.success) {
        await this.modalCtrl.dismiss(result);
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  public onClose(): void {
    this.modalCtrl.dismiss();
  }

  private async loadExportData(): Promise<void> {
    await this.onGenerateJson();
  }

  private async validateImport(): Promise<void> {
    const json = this.importJson();
    if (!json) {
      this.validationResult.set(null);
      this.importPreview.set(null);
      this.showPreview.set(false);
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await ImportValidation.validateImport(json);
      this.validationResult.set(result);

      // Also get preview if valid
      if (result.isValid) {
        await this.onPreviewImport();
      }
    } catch (error) {
      console.error('Validation failed:', error);
      this.validationResult.set({
        isValid: false,
        errors: [
          {
            type: 'INVALID_JSON' as ValidationErrorType,
            message: 'INVALID_JSON',
          },
        ],
        warnings: [],
        workoutCount: 0,
        exerciseCount: 0,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  public async openAiPromptModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AiPromptModalComponent,
      componentProps: {
        introMessage: '',
        promptText: this.importExportService.getPromptText(),
      },
    });
    await modal.present();
  }
}
