import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import type { SetLog } from '@domain/sessions/set-log';
import type { WorkoutSession } from '@domain/sessions/workout-session';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import {
  buildSession,
  buildSetLog,
  buildWorkoutExercise,
} from '@testing/db-test-helpers';
import { SessionInProgressComponent } from './session-in-progress.component';

describe('SessionInProgressComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(SessionInProgressComponent);
    const component = fixture.componentInstance;

    const exercises: WorkoutExercise[] = [
      buildWorkoutExercise({
        sets: 2,
        reps: '10',
        target_weight: 40,
        exercise_name: 'Bench Press',
      }),
      buildWorkoutExercise({
        sets: 3,
        reps: '8',
        target_weight: 60,
        exercise_name: 'Row',
      }),
    ];
    const logs: SetLog[] = [];
    const session: WorkoutSession = buildSession();

    fixture.componentRef.setInput('exercises', exercises);
    fixture.componentRef.setInput('setLogs', logs);
    fixture.componentRef.setInput('session', session);

    return { fixture, component, exercises, logs, session };
  }

  it('exposes the exercise at the current index', () => {
    const { component, exercises } = setup();

    expect(component.currentExercise()?.exercise_id).toBe(
      exercises[0].exercise_id,
    );

    component.selectExercise(1);

    expect(component.currentExercise()?.exercise_id).toBe(
      exercises[1].exercise_id,
    );
  });

  it('guards currentExercise when the index is out of bounds', () => {
    const { component } = setup();

    component.currentExerciseIndex.set(99);

    expect(component.currentExercise()).toBeUndefined();
    expect(component.currentLogs()).toEqual([]);
    expect(() => component.resetForm()).not.toThrow();
  });

  it('does not emit logSet without a valid current exercise', () => {
    const { component } = setup();
    const emitted: unknown[] = [];
    component.logSet.subscribe((value) => emitted.push(value));

    component.currentExerciseIndex.set(99);
    component.reps = 10;
    component.weight = 50;
    component.onLogSet();

    expect(emitted).toHaveLength(0);
  });

  it('resets the form with the target values and the default RPE', () => {
    const { component, exercises } = setup();

    component.selectExercise(1);

    expect(component.reps).toBe(8);
    expect(component.weight).toBe(60);
    expect(component.rpe).toBe(7);
    expect(component.editingSetId()).toBeNull();
    expect(component.currentExercise()?.exercise_id).toBe(
      exercises[1].exercise_id,
    );
  });

  it('advances to the next incomplete exercise after the last set', () => {
    const { fixture, component, exercises } = setup();
    fixture.componentRef.setInput('setLogs', [
      buildSetLog({
        session_id: component.session().id,
        exercise_id: exercises[0].exercise_id,
        set_number: 0,
      }),
    ]);

    component.reps = 10;
    component.weight = 50;
    component.onLogSet();

    expect(component.currentExerciseIndex()).toBe(1);
    expect(component.reps).toBe(8);
  });

  it('emits the log for the current exercise', () => {
    const { component, exercises } = setup();
    const emitted: {
      exerciseId: string;
      setNumber: number;
      reps: number;
      weight: number;
    }[] = [];
    component.logSet.subscribe((value) => emitted.push(value));

    component.reps = 10;
    component.weight = 50;
    component.onLogSet();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      exerciseId: exercises[0].exercise_id,
      setNumber: 0,
      reps: 10,
      weight: 50,
    });
  });
});
