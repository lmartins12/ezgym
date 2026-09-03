import { TestBed } from '@angular/core/testing';
import { provideIonicAngular, ModalController } from '@ionic/angular';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { db } from '@core/db/app-db';
import { buildExercise, resetDatabase } from '@testing/db-test-helpers';
import { ExercisePickerModalComponent } from './exercise-picker-modal.component';

describe('ExercisePickerModalComponent', () => {
  let component: ExercisePickerModalComponent;
  let dismiss: ReturnType<typeof vi.fn>;

  const searchEvent = (value: string) =>
    ({ detail: { value } }) as unknown as CustomEvent<{ value?: string }>;

  beforeEach(async () => {
    await resetDatabase();
    localStorage.clear();
    dismiss = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideTranslateService()],
    });
    TestBed.overrideProvider(ModalController, {
      useValue: { dismiss },
    });
    component = TestBed.createComponent(
      ExercisePickerModalComponent,
    ).componentInstance;
  });

  it('loads the picker lists when entering', async () => {
    expect(component.loading()).toBe(true);

    await component.ionViewWillEnter();

    expect(component.loading()).toBe(false);
    expect(component.result().library.length).toBeGreaterThan(100);
    expect(component.result().mine).toEqual([]);
    expect(component.result().recents).toEqual([]);
  });

  it('keeps the lists mounted on subsequent refreshes (no teardown flicker)', async () => {
    await component.ionViewWillEnter();
    const firstLibrary = component.result().library;

    await component.onSearch(searchEvent('supino'));

    expect(component.loading()).toBe(false);
    expect(component.result().library.length).toBeGreaterThan(0);
    expect(component.result().library).not.toBe(firstLibrary);

    await component.onSearch(searchEvent(''));
    await component.toggleFilter('biceps');

    expect(component.loading()).toBe(false);
    expect(component.result().library.length).toBeGreaterThan(0);
  });

  it('shows only the library section while idle', async () => {
    await component.ionViewWillEnter();

    expect(component.sections().map((s) => s.key)).toEqual(['library']);
  });

  it('shows the mine section only when a search is active', async () => {
    await db.exercises.add(buildExercise({ name: 'Rosca Direta' }));
    await component.ionViewWillEnter();

    expect(component.sections().map((s) => s.key)).not.toContain('mine');

    await component.onSearch(searchEvent('rosca'));

    expect(component.sections().map((s) => s.key)).toContain('mine');
    expect(component.result().mine.map((o) => o.name)).toContain(
      'Rosca Direta',
    );
  });

  it('does not offer library items already present in the catalog', async () => {
    await db.exercises.add(buildExercise({ name: 'Supino Reto' }));

    await component.ionViewWillEnter();

    expect(
      component.result().library.find((o) => o.slug === 'supino-reto'),
    ).toBeUndefined();
    expect(component.result().mine.map((o) => o.name)).toContain('Supino Reto');
  });

  it('filters the lists through the muscle chips and clears back', async () => {
    await component.ionViewWillEnter();

    await component.toggleFilter('biceps');

    expect(component.result().library.length).toBeGreaterThan(0);
    expect(
      component.result().library.every((o) => o.muscle_group === 'biceps'),
    ).toBe(true);

    await component.toggleFilter(null);

    expect(component.result().library.length).toBeGreaterThan(100);
  });

  it('toggles the selection state of an option', async () => {
    await component.ionViewWillEnter();
    const option = component.result().library[0];

    component.toggle(option);
    expect(component.selectedCount()).toBe(1);
    expect(component.isSelected(option)).toBe(true);

    component.toggle(option);
    expect(component.selectedCount()).toBe(0);
    expect(component.isSelected(option)).toBe(false);
  });

  it('confirms with the selected options', async () => {
    await component.ionViewWillEnter();
    const option = component.result().library[0];
    component.toggle(option);

    component.confirm();

    expect(dismiss).toHaveBeenCalledWith([option], 'confirm');
  });

  it('does not confirm without any selection', () => {
    component.confirm();

    expect(dismiss).not.toHaveBeenCalled();
  });

  it('cancels without data', () => {
    component.cancel();

    expect(dismiss).toHaveBeenCalledWith(null, 'cancel');
  });

  it('creates manually with the create role and no term', () => {
    component.createManual();

    expect(dismiss).toHaveBeenCalledWith(undefined, 'create');
  });

  it('creates from the search term', () => {
    component.search.set('supino');

    component.createFromTerm();

    expect(dismiss).toHaveBeenCalledWith('supino', 'create');
  });

  it('offers the create-term CTA only when the search yields nothing', async () => {
    await component.ionViewWillEnter();
    expect(component.showCreateTerm()).toBe(false);

    await component.onSearch(searchEvent('zzznada'));
    expect(component.showCreateTerm()).toBe(true);

    await component.onSearch(searchEvent(''));
    expect(component.showCreateTerm()).toBe(false);
  });

  it('resolves the equipment label for library items', async () => {
    await component.ionViewWillEnter();
    const option = component
      .result()
      .library.find((o) => o.slug === 'supino-reto');

    expect(option).toBeDefined();
    expect(component.getEquipmentLabel(option!)).toBe('EQUIPMENT.KIND_BARBELL');
  });
});
