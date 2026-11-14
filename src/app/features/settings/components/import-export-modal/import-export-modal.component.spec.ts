import { TestBed } from '@angular/core/testing';
import {
  ModalController,
  ToastController,
  provideIonicAngular,
} from '@ionic/angular';
import { provideTranslateService } from '@ngx-translate/core';
import { ImportExport } from '@domain/import-export/import-export';
import { ImportValidation } from '@domain/import-export/validation';
import { BackButtonService } from '@core/back-button/back-button';
import { vi } from 'vitest';
import { ImportExportModalComponent } from './import-export-modal.component';

describe('ImportExportModalComponent', () => {
  const valid = {
    isValid: true,
    errors: [],
    warnings: [],
    workoutCount: 1,
    exerciseCount: 0,
  };
  const invalid = {
    isValid: false,
    errors: [],
    warnings: [],
    workoutCount: 0,
    exerciseCount: 0,
  };
  let preview: ReturnType<typeof vi.fn>;
  let importWorkouts: ReturnType<typeof vi.fn>;
  let exportWorkouts: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    preview = vi.fn().mockResolvedValue({
      workoutCount: 1,
      newExercises: [],
      existingExercises: [],
      warnings: [],
    });
    importWorkouts = vi.fn();
    exportWorkouts = vi.fn().mockResolvedValue('');
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideTranslateService()],
    });
    TestBed.overrideProvider(ImportExport, {
      useValue: {
        exportWorkouts,
        getImportPreview: preview,
        importWorkouts,
      },
    });
    TestBed.overrideProvider(ModalController, {
      useValue: { dismiss: vi.fn().mockResolvedValue(true) },
    });
    TestBed.overrideProvider(BackButtonService, {
      useValue: { track: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses the input passed to the modal', () => {
    const fixture = TestBed.createComponent(ImportExportModalComponent);
    fixture.componentRef.setInput('initialTab', 'import');
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.isImportTab()).toBe(true);
  });

  it('invalidates an old preview as soon as input changes', async () => {
    vi.spyOn(ImportValidation, 'validateImport').mockImplementation(
      async (value) => (value === 'valid' ? valid : invalid),
    );
    const component = TestBed.createComponent(
      ImportExportModalComponent,
    ).componentInstance;
    await component.onValidate('valid');
    expect(component.showPreview()).toBe(true);
    await component.onValidate('invalid');
    expect(component.showPreview()).toBe(false);
    await component.onConfirmImport();
    expect(importWorkouts).not.toHaveBeenCalled();
  });

  it('ignores a validation response that arrives after newer input', async () => {
    let resolveFirst!: (result: typeof valid) => void;
    vi.spyOn(ImportValidation, 'validateImport').mockImplementation((value) =>
      value === 'old'
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(invalid),
    );
    const component = TestBed.createComponent(
      ImportExportModalComponent,
    ).componentInstance;
    const first = component.onValidate('old');
    await component.onValidate('new');
    resolveFirst(valid);
    await first;
    expect(component.importJson()).toBe('new');
    expect(component.validationResult()?.isValid).toBe(false);
    expect(preview).not.toHaveBeenCalled();
  });

  it('keeps import locked until it finishes even if export completes', async () => {
    let resolveExport!: (value: string) => void;
    let resolveImport!: (value: { success: boolean }) => void;
    exportWorkouts.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExport = resolve;
        }),
    );
    importWorkouts.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
    );
    vi.spyOn(ImportValidation, 'validateImport').mockResolvedValue(valid);
    const component = TestBed.createComponent(
      ImportExportModalComponent,
    ).componentInstance;
    await component.onValidate('valid');
    resolveExport('');
    await Promise.resolve();
    const pending = component.onConfirmImport();
    expect(component.importing()).toBe(true);
    await component.onValidate('changed');
    await component.onConfirmImport();
    expect(component.importJson()).toBe('valid');
    expect(importWorkouts).toHaveBeenCalledTimes(1);
    resolveImport({ success: true });
    await pending;
    expect(component.importing()).toBe(false);
  });

  it('validates a selected local JSON file before allowing import', async () => {
    vi.spyOn(ImportValidation, 'validateImport').mockResolvedValue(valid);
    const component = TestBed.createComponent(
      ImportExportModalComponent,
    ).componentInstance;
    await Promise.resolve();
    const input = {
      files: [{ size: 12, text: vi.fn().mockResolvedValue('valid') }],
      value: 'file.json',
    };

    await component.onFileSelected({ target: input } as unknown as Event);

    expect(input.value).toBe('');
    expect(component.importJson()).toBe('valid');
    expect(component.showPreview()).toBe(true);
    expect(component.canImport()).toBe(true);
  });

  it('does not replace newer typed input with an older file read', async () => {
    let finishRead!: (value: string) => void;
    vi.spyOn(ImportValidation, 'validateImport').mockResolvedValue(invalid);
    const component = TestBed.createComponent(
      ImportExportModalComponent,
    ).componentInstance;
    await Promise.resolve();
    const input = {
      files: [
        {
          size: 12,
          text: () =>
            new Promise<string>((resolve) => {
              finishRead = resolve;
            }),
        },
      ],
      value: 'file.json',
    };
    const pending = component.onFileSelected({
      target: input,
    } as unknown as Event);
    await component.onValidate('newer');
    finishRead('older');
    await pending;

    expect(component.importJson()).toBe('newer');
    expect(component.validationResult()?.isValid).toBe(false);
  });

  it('rejects an oversized file without reading it', async () => {
    const present = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue({ present });
    TestBed.overrideProvider(ToastController, { useValue: { create } });
    const component = TestBed.createComponent(
      ImportExportModalComponent,
    ).componentInstance;
    await Promise.resolve();
    const read = vi.fn();
    const input = {
      files: [{ size: 5 * 1024 * 1024 + 1, text: read }],
      value: 'large.json',
    };

    await component.onFileSelected({ target: input } as unknown as Event);

    expect(read).not.toHaveBeenCalled();
    expect(present).toHaveBeenCalledOnce();
    expect(component.showPreview()).toBe(false);
  });
});
