import { Component, input } from '@angular/core';
import type { MuscleGroup } from '@core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

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
  imports: [],
  templateUrl: './muscle-icon.component.html',
  styleUrls: ['./muscle-icon.component.scss'],
})
export class MuscleIconComponent {
  public readonly muscleGroup = input.required<MuscleGroup>();
  public readonly size = input<'sm' | 'md' | 'lg'>('md');

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly iconMap = MUSCLE_ICON_MAP;

  protected get hasSvg(): boolean {
    return this.iconMap[this.muscleGroup()] !== '';
  }

  protected get iconPath(): string {
    return this.iconMap[this.muscleGroup()];
  }
}
