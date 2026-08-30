import { Component, inject, model } from '@angular/core';
import { MUSCLE_GROUPS, type MuscleGroup } from '@core/models/app-models';
import { TranslateService } from '@ngx-translate/core';
import { MuscleIconComponent } from '../muscle-icon/muscle-icon.component';

@Component({
  selector: 'app-muscle-group-selector',
  imports: [MuscleIconComponent],
  templateUrl: './muscle-group-selector.component.html',
  styleUrl: './muscle-group-selector.component.scss',
})
export class MuscleGroupSelectorComponent {
  public readonly muscleGroup = model<MuscleGroup | undefined>(undefined);
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
