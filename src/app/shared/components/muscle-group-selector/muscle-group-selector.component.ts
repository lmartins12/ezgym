import { Component, inject, model } from '@angular/core';
import type { MuscleGroup } from '@core';
import { MUSCLE_GROUPS } from '@core';
import { TranslateService } from '@ngx-translate/core';
import { MuscleIconComponent } from '@shared';

@Component({
  selector: 'app-muscle-group-selector',
  standalone: true,
  imports: [MuscleIconComponent],
  templateUrl: './muscle-group-selector.component.html',
  styleUrls: ['./muscle-group-selector.component.scss'],
})
export class MuscleGroupSelectorComponent {
  public readonly muscleGroup = model.required<MuscleGroup>();
  public readonly muscleGroups = MUSCLE_GROUPS;

  private readonly translate = inject(TranslateService);

  public selectMuscleGroup(group: MuscleGroup): void {
    this.muscleGroup.set(group);
  }

  public getMuscleGroupLabel(group: MuscleGroup): string {
    return this.translate.instant(`EXERCISE.MUSCLE_${group.toUpperCase()}`);
  }

  protected isSelected(group: MuscleGroup): boolean {
    return this.muscleGroup() === group;
  }
}
