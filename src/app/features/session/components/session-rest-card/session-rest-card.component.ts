import { Component, computed, inject, output } from '@angular/core';
import { IonButton, IonCard, IonCardContent } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { RestTimerService } from '../../services/rest-timer';

/** Geometry of the rest ring (viewBox 0 0 100 100). */
const REST_RING_RADIUS = 44;

/**
 * Rest countdown card shown while the timer runs. Presentational:
 * it reads the shared RestTimerService instance (provided by the
 * parent) and emits user intents; the parent owns the flow.
 */
@Component({
  selector: 'app-session-rest-card',
  imports: [IonButton, IonCard, IonCardContent, TranslatePipe],
  templateUrl: './session-rest-card.component.html',
  styleUrl: './session-rest-card.component.scss',
})
export class SessionRestCardComponent {
  private readonly restTimer = inject(RestTimerService);

  public readonly skip = output<void>();
  public readonly addTime = output<void>();

  protected readonly ringCircumference = 2 * Math.PI * REST_RING_RADIUS;

  protected readonly restDashOffset = computed(() => {
    const duration = this.restTimer.restDuration();
    if (duration <= 0) return this.ringCircumference;

    const progress = Math.min(this.restTimer.restRemaining() / duration, 1);
    return this.ringCircumference * (1 - progress);
  });

  protected readonly restTimeLabel = computed(() => {
    const seconds = this.restTimer.restRemaining();
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  });
}
