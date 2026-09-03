import { Component, computed, inject, input, output } from '@angular/core';
import { ClipboardService } from '@shared/clipboard/clipboard';
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
} from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import {
  clipboardOutline,
  closeOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { getAiPromptText } from '../../services/ai-prompt';

@Component({
  selector: 'app-ai-prompt-modal',
  imports: [
    IonTitle,
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonToolbar,
    TranslatePipe,
  ],
  templateUrl: './ai-prompt-modal.component.html',
  styleUrl: './ai-prompt-modal.component.scss',
})
export class AiPromptModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly clipboard = inject(ClipboardService);

  public readonly introMessage = input('');
  public readonly promptText = input('');
  public readonly closed = output<void>();

  protected readonly resolvedPromptText = computed(
    () => this.promptText() || getAiPromptText(),
  );
  protected readonly showIntroMessage = computed(
    () => this.introMessage().trim().length > 0,
  );

  constructor() {
    addIcons({
      clipboardOutline,
      closeOutline,
      sparklesOutline,
    });
  }

  public onClose(): void {
    this.closed.emit();
    void this.modalCtrl.dismiss();
  }

  public async onCopyPrompt(): Promise<void> {
    await this.clipboard.copy(this.resolvedPromptText());
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
