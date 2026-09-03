import { Component, computed, inject, signal } from '@angular/core';
import { LanguageService } from '@core/i18n/language';
import { MUSCLE_GROUPS, type MuscleGroup } from '@domain/shared/muscle-group';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, createOutline } from 'ionicons/icons';
import { MuscleIconComponent } from '@shared/components/muscle-icon/muscle-icon.component';
import {
  equipmentKindLabelKey,
  type ExercisePickerOption,
  type ExercisePickerResult,
} from '../../models/exercise-picker.models';
import { ExercisePickerQuery } from '../../queries/exercise-picker.query';

const EMPTY_RESULT: ExercisePickerResult = {
  recents: [],
  mine: [],
  library: [],
};

/**
 * Multi-select exercise picker. Emits via ModalController roles:
 * - 'confirm'  → data: ExercisePickerOption[] (selected, in order)
 * - 'create'   → data: string | undefined (search term or undefined)
 * - 'cancel'   → data: null
 */
@Component({
  selector: 'app-exercise-picker-modal',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonContent,
    IonItem,
    IonCheckbox,
    IonLabel,
    IonSpinner,
    IonFooter,
    TranslatePipe,
    MuscleIconComponent,
  ],
  templateUrl: './exercise-picker-modal.component.html',
  styleUrl: './exercise-picker-modal.component.scss',
})
export class ExercisePickerModalComponent {
  public readonly muscleGroups = MUSCLE_GROUPS;

  public readonly search = signal('');
  public readonly muscleFilter = signal<MuscleGroup | null>(null);
  public readonly result = signal<ExercisePickerResult>(EMPTY_RESULT);
  public readonly loading = signal(true);
  public readonly selected = signal<Map<string, ExercisePickerOption>>(
    new Map(),
  );

  public readonly selectedCount = computed(() => this.selected().size);
  public readonly hasSearchOrFilter = computed(
    () => this.search().trim().length > 0 || this.muscleFilter() !== null,
  );
  public readonly showCreateTerm = computed(
    () => !this.loading() && this.hasSearchOrFilter() && !this.hasAnyResult(),
  );

  /**
   * Sections to render. "Meus exercícios" only takes space while a
   * search/filter is active (§6): idle browsing is Recentes + Biblioteca.
   */
  public readonly sections = computed(() => {
    const result = this.result();
    return [
      {
        key: 'recents',
        titleKey: 'LIBRARY.SECTION_RECENTS',
        options: result.recents,
      },
      {
        key: 'mine',
        titleKey: 'LIBRARY.SECTION_MINE',
        options: result.mine,
      },
      {
        key: 'library',
        titleKey: 'LIBRARY.SECTION_LIBRARY',
        options: result.library,
      },
    ].filter(
      (section) =>
        section.options.length > 0 &&
        (section.key !== 'mine' || this.hasSearchOrFilter()),
    );
  });

  private readonly modalCtrl = inject(ModalController);
  private readonly pickerQuery = inject(ExercisePickerQuery);
  private readonly languageService = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private requestSeq = 0;
  private hasLoaded = false;

  constructor() {
    addIcons({ addOutline, closeOutline, createOutline });
  }

  public async ionViewWillEnter(): Promise<void> {
    await this.refresh();
  }

  public async onSearch(
    event: CustomEvent<{ value?: string | null }>,
  ): Promise<void> {
    this.search.set(event.detail.value ?? '');
    await this.refresh();
  }

  public async toggleFilter(group: MuscleGroup | null): Promise<void> {
    this.muscleFilter.set(group);
    await this.refresh();
  }

  public isSelected(option: ExercisePickerOption): boolean {
    return this.selected().has(option.key);
  }

  public toggle(option: ExercisePickerOption): void {
    this.selected.update((current) => {
      const next = new Map(current);
      if (next.has(option.key)) {
        next.delete(option.key);
      } else {
        next.set(option.key, option);
      }
      return next;
    });
  }

  public cancel(): void {
    void this.modalCtrl.dismiss(null, 'cancel');
  }

  public confirm(): void {
    if (this.selected().size === 0) return;
    void this.modalCtrl.dismiss([...this.selected().values()], 'confirm');
  }

  public createManual(): void {
    void this.modalCtrl.dismiss(undefined, 'create');
  }

  public createFromTerm(): void {
    void this.modalCtrl.dismiss(this.search().trim(), 'create');
  }

  public getMuscleLabel(group: MuscleGroup): string {
    return this.translate.instant(`EXERCISE.MUSCLE_${group.toUpperCase()}`);
  }

  public getEquipmentLabel(option: ExercisePickerOption): string | undefined {
    if (option.equipment_kind) {
      return this.translate.instant(
        equipmentKindLabelKey(option.equipment_kind),
      );
    }
    return option.equipment || undefined;
  }

  private hasAnyResult(): boolean {
    const result = this.result();
    return (
      result.recents.length > 0 ||
      result.mine.length > 0 ||
      result.library.length > 0
    );
  }

  private async refresh(): Promise<void> {
    const seq = ++this.requestSeq;
    // Full-screen spinner only until the first load: afterwards the
    // current lists stay mounted while the refresh swaps them in place,
    // so the muscle chip carousel keeps its scroll position.
    if (!this.hasLoaded) {
      this.loading.set(true);
    }
    try {
      const result = await this.pickerQuery.build(
        this.search(),
        this.muscleFilter(),
        this.languageService.language(),
      );
      if (seq === this.requestSeq) {
        this.result.set(result);
        this.hasLoaded = true;
      }
    } finally {
      if (seq === this.requestSeq) {
        this.loading.set(false);
      }
    }
  }
}
