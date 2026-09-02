import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideTranslateService } from '@ngx-translate/core';
import type { SetLog } from '@domain/sessions/set-log';
import type { WorkoutSession } from '@domain/sessions/workout-session';
import type { WorkoutExercise } from '@domain/workouts/workout-exercise';
import {
  buildSession,
  buildSetLog,
  buildWorkoutExercise,
} from '@testing/db-test-helpers';
import { vi } from 'vitest';
import { SessionInProgressComponent } from './session-in-progress.component';

describe('SessionInProgressComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideTranslateService()],
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
        rest_seconds: 0,
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

describe('SessionInProgressComponent rest flow', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(), provideTranslateService()],
    });
    Element.prototype.scrollIntoView = vi.fn();
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(overrides: Partial<WorkoutExercise>[] = []) {
    const fixture = TestBed.createComponent(SessionInProgressComponent);
    const component = fixture.componentInstance;

    const exercises: WorkoutExercise[] = [
      buildWorkoutExercise({
        sets: 3,
        reps: '10',
        rest_seconds: 60,
        exercise_name: 'Bench Press',
      }),
      buildWorkoutExercise({
        sets: 3,
        reps: '8',
        rest_seconds: 60,
        exercise_name: 'Row',
      }),
      buildWorkoutExercise({
        sets: 3,
        reps: '12',
        rest_seconds: 60,
        exercise_name: 'Dip',
      }),
    ].map((exercise, index) => ({ ...exercise, ...overrides[index] }));

    fixture.componentRef.setInput('exercises', exercises);
    fixture.componentRef.setInput('setLogs', []);
    fixture.componentRef.setInput('session', buildSession());

    function logLastSetOf(exerciseIndex: number) {
      const exercise = exercises[exerciseIndex];
      const logs: SetLog[] = [];
      for (let i = 0; i < exercise.sets - 1; i++) {
        logs.push(
          buildSetLog({
            exercise_id: exercise.exercise_id,
            set_number: i,
          }),
        );
      }
      fixture.componentRef.setInput('setLogs', logs);
      component.currentExerciseIndex.set(exerciseIndex);
      component.resetForm();
    }

    return { fixture, component, exercises, logLastSetOf };
  }

  function logSet(component: SessionInProgressComponent): void {
    component.reps = 10;
    component.weight = 50;
    component.onLogSet();
  }

  it('starts the rest countdown after logging a set when more work remains', () => {
    const { component } = setup();

    logSet(component);

    expect(component.restTimer.isResting()).toBe(true);
    expect(component.restTimer.restRemaining()).toBe(60);
    expect(component.currentExerciseIndex()).toBe(0);
  });

  it('advances immediately and skips the rest when rest_seconds is 0', () => {
    const { component, logLastSetOf } = setup([{ rest_seconds: 0 }]);
    const finished: unknown[] = [];
    component.finishSession.subscribe(() => finished.push(true));
    logLastSetOf(0);

    logSet(component);

    expect(component.restTimer.isResting()).toBe(false);
    expect(component.currentExerciseIndex()).toBe(1);
    expect(finished).toHaveLength(0);
  });

  it('skipping the rest advances to the next set focus without waiting', () => {
    const { component, exercises, logLastSetOf } = setup();
    logLastSetOf(0);

    logSet(component);
    expect(component.restTimer.isResting()).toBe(true);

    component.onSkipRest();

    expect(component.restTimer.isResting()).toBe(false);
    expect(component.currentExerciseIndex()).toBe(1);
    expect(component.currentExercise()?.exercise_id).toBe(
      exercises[1].exercise_id,
    );
  });

  it('advances to the next exercise and pulses when the countdown ends', () => {
    const { component, logLastSetOf } = setup();
    logLastSetOf(0);

    logSet(component);
    vi.advanceTimersByTime(60_000);

    expect(component.currentExerciseIndex()).toBe(1);
    expect(component.restTimer.isResting()).toBe(false);
    expect(component.restTimer.justFinished()).toBe(true);
  });

  it('adds 30s to the remaining time and stays on the same exercise', () => {
    const { component } = setup();

    logSet(component);
    vi.advanceTimersByTime(50_000);
    component.onAddRestTime();

    expect(component.restTimer.restRemaining()).toBe(40);

    vi.advanceTimersByTime(40_000);

    expect(component.restTimer.isResting()).toBe(false);
    expect(component.currentExerciseIndex()).toBe(0);
  });

  it('does not trigger rest on the last set of the last exercise and requests finish', () => {
    const { component, logLastSetOf } = setup();
    const finished: unknown[] = [];
    component.finishSession.subscribe(() => finished.push(true));
    logLastSetOf(2);

    logSet(component);

    expect(component.restTimer.isResting()).toBe(false);
    expect(finished).toHaveLength(1);
  });

  it('does not move the focus when the user navigates away during the rest', () => {
    const { component, logLastSetOf } = setup();
    logLastSetOf(0);

    logSet(component);
    component.selectExercise(2);
    vi.advanceTimersByTime(60_000);

    expect(component.currentExerciseIndex()).toBe(2);
  });
});
