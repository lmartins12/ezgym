import { Component, EventEmitter, inject, Input, Output, model } from '@angular/core';
import { ImportExportService } from '@core/services/import-export.service';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  closeOutline,
  sparklesOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-ai-prompt-modal',
  standalone: true,
  imports: [
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonToolbar,
    TranslateModule,
  ],
  templateUrl: './ai-prompt-modal.component.html',
  styleUrls: ['./ai-prompt-modal.component.scss'],
})
export class AiPromptModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly importExportService = inject(ImportExportService);

  @Input() public introMessage = '';
  @Input() public promptText = '';

  @Output()
  public readonly closed = new EventEmitter<void>();

  constructor() {
    addIcons({
      clipboardOutline,
      closeOutline,
      sparklesOutline,
    });
  }

  public ionViewDidEnter(): void {
    // Initialize with default prompt text if not provided
    if (!this.promptText) {
      this.promptText = this.importExportService.getPromptText();
    }
  }

  protected get showIntroMessage(): boolean {
    return this.introMessage !== undefined && this.introMessage !== null && this.introMessage !== '' && this.introMessage.length > 0;
  }

  public onClose(): void {
    this.closed.emit();
    this.modalCtrl.dismiss();
  }

  public async onCopyPrompt(): Promise<void> {
    await this.importExportService.copyToClipboard(this.promptText);
    this.onClose();
  }

  protected readonly promptTitleKey = 'IMPORT_PROMPT.TITLE';
  protected readonly promptIntroKey = 'IMPORT_PROMPT.INTRO';
  protected readonly promptTextKey = 'IMPORT_PROMPT.PROMPT_TEXT';
  protected readonly howToUseKey = 'IMPORT_PROMPT.HOW_TO_USE';
  protected readonly howToUseSteps = [
    'IMPORT_PROMPT.HOW_TO_USE_1',
    'IMPORT_PROMPT.HOW_TO_USE_2',
    'IMPORT_PROMPT.HOW_TO_USE_3',
    'IMPORT_PROMPT.HOW_TO_USE_4',
    'IMPORT_PROMPT.HOW_TO_USE_5',
  ];
  protected readonly copyPromptKey = 'IMPORT_PROMPT.COPY_PROMPT';
}
