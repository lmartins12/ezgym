import { Injectable } from '@angular/core';

/**
 * Text sharing via the Web Share API with a file-download fallback.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  public async share(
    content: string,
    filename = 'ezgym-workouts.json',
  ): Promise<void> {
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ text: content })
    ) {
      try {
        await navigator.share({
          title: 'EzGym Workouts Export',
          text: content,
        });
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback: Download file
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
