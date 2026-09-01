import { Component, computed, inject, input, signal } from '@angular/core';
import type {
  ValidationErrorType,
  ValidationResult,
  ValidationWarning,
} from '@domain/import-export/export-data';
import { ImportExport } from '@domain/import-export/import-export';
import { ImportValidation } from '@domain/import-export/validation';
import { BackButtonService } from '@core/back-button/back-button';
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
  ToastController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ClipboardService } from '@shared/clipboard/clipboard';
import { ShareService } from '@shared/share/share';
import { AiPromptModalComponent } from '../ai-prompt-modal/ai-prompt-modal.component';
import { ImportPreviewComponent } from '../import-preview/import-preview.component';
import { ValidationListComponent } from '../validation-list/validation-list.component';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  closeOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  shareOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { getAiPromptText } from '../../services/ai-prompt';

export type ImportExportTab = 'export' | 'import';

const TOAST_DURATION_MS = 3000;

@Component({
  selector: 'app-import-export-modal',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonTextarea,
    IonTitle,
    IonToolbar,
    TranslatePipe,
    ImportPreviewComponent,
    ValidationListComponent,
  ],
  templateUrl: './import-export-modal.component.html',
  styleUrl: './import-export-modal.component.scss',
})
export class ImportExportModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly importExport = inject(ImportExport);
  private readonly clipboard = inject(ClipboardService);
  private readonly share = inject(ShareService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly backButton = inject(BackButtonService);

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
      const json = await this.importExport.exportWorkouts();
      this.exportJson.set(json);
    } catch (error) {
      console.error('Export failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_EXPORT');
    } finally {
      this.isLoading.set(false);
    }
  }

  public async onCopyToClipboard(): Promise<void> {
    const json = this.exportJson();
    if (!json) return;

    try {
      await this.clipboard.copy(json);
    } catch (error) {
      console.error('Copy failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_COPY');
    }
  }

  public async onShare(): Promise<void> {
    const json = this.exportJson();
    if (json) {
      await this.share.share(json);
    }
  }

  public async onPasteFromClipboard(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.clipboard.read();
      if (result?.value) {
        this.importJson.set(result.value);
        await this.validateImport();
      }
    } catch (error) {
      console.error('Paste failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_PASTE');
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
      const preview = await this.importExport.getImportPreview(json);
      if (preview) {
        this.importPreview.set(preview);
        this.showPreview.set(true);
      } else {
        await this.showErrorToast('IMPORT_EXPORT.ERROR_PREVIEW');
      }
    } catch (error) {
      console.error('Preview failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_PREVIEW');
    } finally {
      this.isLoading.set(false);
    }
  }

  public async onConfirmImport(): Promise<void> {
    const json = this.importJson();
    if (!json) return;

    this.isLoading.set(true);
    try {
      const result = await this.importExport.importWorkouts(json);
      if (result.success) {
        await this.modalCtrl.dismiss(result);
      } else {
        console.error('Import failed:', result.errors);
        await this.showErrorToast('IMPORT_EXPORT.ERROR_IMPORT');
      }
    } catch (error) {
      console.error('Import failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_IMPORT');
    } finally {
      this.isLoading.set(false);
    }
  }

  public onClose(): void {
    this.modalCtrl.dismiss();
  }

  public async openAiPromptModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AiPromptModalComponent,
      componentProps: {
        introMessage: '',
        promptText: getAiPromptText(),
      },
    });
    await modal.present();
    void this.backButton.track(modal);
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

  private async showErrorToast(messageKey: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: this.translate.instant(messageKey),
      duration: TOAST_DURATION_MS,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }
}
