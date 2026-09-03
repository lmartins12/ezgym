import { TestBed } from '@angular/core/testing';
import { provideIonicAngular, ModalController } from '@ionic/angular';
import { provideTranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';
import { buildWorkoutExercise } from '@testing/db-test-helpers';
import { ExerciseEditorModalComponent } from './exercise-editor-modal.component';

describe('ExerciseEditorModalComponent', () => {
  let component: ExerciseEditorModalComponent;
  let fixture: ReturnType<
    typeof TestBed.createComponent<ExerciseEditorModalComponent>
  >;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideTranslateService()],
    });
    TestBed.overrideProvider(ModalController, {
      useValue: { dismiss: vi.fn().mockResolvedValue(true) },
    });
    fixture = TestBed.createComponent(ExerciseEditorModalComponent);
    component = fixture.componentInstance;
  });

  it('starts empty without initialName', () => {
    component.ionViewDidEnter();

    expect(component.name()).toBe('');
  });

  it('prefills the name from initialName', () => {
    fixture.componentRef.setInput('initialName', 'Supino Reto');

    component.ionViewDidEnter();

    expect(component.name()).toBe('Supino Reto');
    expect(component.sets()).toBe(3);
    expect(component.reps()).toBe('12');
  });

  it('keeps the exercise fields winning over initialName when editing', () => {
    fixture.componentRef.setInput('initialName', 'Ignored');
    fixture.componentRef.setInput(
      'exercise',
      buildWorkoutExercise({
        exercise_name: 'Remada Curvada',
        sets: 5,
        reps: '8-10',
      }),
    );

    component.ionViewDidEnter();

    expect(component.name()).toBe('Remada Curvada');
    expect(component.sets()).toBe(5);
    expect(component.reps()).toBe('8-10');
  });
});
