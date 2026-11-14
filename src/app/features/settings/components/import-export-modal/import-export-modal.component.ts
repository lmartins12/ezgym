import {
  Component,
  computed,
  inject,
  input,
  signal,
  type OnInit,
} from '@angular/core';
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
  downloadOutline,
  documentTextOutline,
  shareOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { getAiPromptText } from '../../services/ai-prompt';

export type ImportExportTab = 'export' | 'import';

const TOAST_DURATION_MS = 3000;
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

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
export class ImportExportModalComponent implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly importExport = inject(ImportExport);
  private readonly clipboard = inject(ClipboardService);
  private readonly share = inject(ShareService);
  private readonly toastCtrl = inject(ToastController);
  private readonly translate = inject(TranslateService);
  private readonly backButton = inject(BackButtonService);

  public readonly initialTab = input<ImportExportTab>('export');
  private validationSequence = 0;

  public readonly currentTab = signal<ImportExportTab>(this.initialTab());
  private readonly generating = signal(false);
  private readonly reading = signal(false);
  private readonly validating = signal(false);
  public readonly importing = signal(false);
  public readonly isLoading = computed(
    () =>
      this.generating() ||
      this.reading() ||
      this.validating() ||
      this.importing(),
  );
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
      downloadOutline,
      documentTextOutline,
      closeOutline,
      shareOutline,
      sparklesOutline,
    });
    this.loadExportData();
  }

  public ngOnInit(): void {
    this.currentTab.set(this.initialTab());
  }

  public switchTab(tab: ImportExportTab): void {
    this.currentTab.set(tab);
  }

  public async onGenerateJson(): Promise<void> {
    if (this.generating()) return;
    this.generating.set(true);
    try {
      const json = await this.importExport.exportWorkouts();
      this.exportJson.set(json);
    } catch (error) {
      console.error('Export failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_EXPORT');
    } finally {
      this.generating.set(false);
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
    if (this.isLoading()) return;
    const sequence = ++this.validationSequence;
    this.reading.set(true);
    try {
      const result = await this.clipboard.read();
      if (sequence !== this.validationSequence) return;
      if (result?.value) {
        this.importJson.set(result.value);
        await this.validateImport();
      } else {
        await this.showErrorToast('IMPORT_EXPORT.ERROR_PASTE');
      }
    } catch (error) {
      console.error('Paste failed:', error);
      await this.showErrorToast('IMPORT_EXPORT.ERROR_PASTE');
    } finally {
      this.reading.set(false);
    }
  }

  public async onValidate(value: string): Promise<void> {
    if (this.importing()) return;
    this.importJson.set(value);
    await this.validateImport();
  }

  public async onFileSelected(event: Event): Promise<void> {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    inputElement.value = '';
    if (!file || this.isLoading()) return;
    const sequence = ++this.validationSequence;
    this.validationResult.set(null);
    this.importPreview.set(null);
    this.showPreview.set(false);
    if (file.size > MAX_IMPORT_BYTES) {
      await this.showErrorToast('IMPORT_EXPORT.ERROR_FILE_SIZE');
      return;
    }
    this.reading.set(true);
    try {
      const content = await file.text();
      if (sequence !== this.validationSequence) return;
      this.importJson.set(content);
      await this.validateImport();
    } catch {
      await this.showErrorToast('IMPORT_EXPORT.ERROR_FILE_READ');
    } finally {
      this.reading.set(false);
    }
  }

  public async onConfirmImport(): Promise<void> {
    const json = this.importJson();
    if (!json || !this.canImport() || !this.showPreview()) return;

    this.importing.set(true);
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
      this.importing.set(false);
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
    const sequence = ++this.validationSequence;
    this.validationResult.set(null);
    this.importPreview.set(null);
    this.showPreview.set(false);
    if (!json) {
      this.validating.set(false);
      return;
    }

    this.validating.set(true);
    try {
      const result = await ImportValidation.validateImport(json);
      if (sequence !== this.validationSequence) return;
      this.validationResult.set(result);

      // Also get preview if valid
      if (result.isValid) {
        const preview = await this.importExport.getImportPreview(json);
        if (sequence !== this.validationSequence) return;
        this.importPreview.set(preview);
        this.showPreview.set(preview !== null);
      }
    } catch (error) {
      if (sequence !== this.validationSequence) return;
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
      if (sequence === this.validationSequence) this.validating.set(false);
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
    void this.backButton.track(toast);
  }
}
