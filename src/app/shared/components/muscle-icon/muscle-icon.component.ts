import { Component, input } from '@angular/core';
import type { MuscleGroup } from '@core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barbellOutline } from 'ionicons/icons';

const MUSCLE_ICON_MAP: Record<MuscleGroup, string> = {
  abs: 'assets/muscles/abs.svg',
  back: 'assets/muscles/back.svg',
  biceps: 'assets/muscles/biceps.svg',
  calves: 'assets/muscles/calves.svg',
  cardio: 'assets/muscles/cardio.svg',
  chest: 'assets/muscles/chest.svg',
  forearms: 'assets/muscles/forearms.svg',
  hamstrings: 'assets/muscles/hamstrings.svg',
  quadriceps: 'assets/muscles/quadriceps.svg',
  shoulders: 'assets/muscles/shoulders.svg',
  triceps: 'assets/muscles/triceps.svg',
  other: '', // Will use Ionic icon fallback
};

@Component({
  selector: 'app-muscle-icon',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './muscle-icon.component.html',
  styleUrls: ['./muscle-icon.component.scss'],
})
export class MuscleIconComponent {
  public readonly muscleGroup = input<MuscleGroup | undefined>(undefined);
  public readonly size = input<'sm' | 'md' | 'lg'>('md');

  protected readonly iconMap = MUSCLE_ICON_MAP;

  constructor() {
    addIcons({
      barbellOutline,
    });
  }

  protected get hasSvg(): boolean {
    return this.iconMap[this.muscleGroup() ?? 'other'] !== '';
  }

  protected get iconPath(): string {
    return this.iconMap[this.muscleGroup() ?? 'other'];
  }
}
