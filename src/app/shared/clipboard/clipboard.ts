import { Injectable } from '@angular/core';

/**
 * Clipboard I/O with a legacy textarea fallback for browsers
 * without the async Clipboard API.
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  public async copy(text: string): Promise<void> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Returns { value } with the clipboard text, or null when
   * reading is unsupported or blocked.
   */
  public async read(): Promise<{ value: string } | null> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        return { value: text };
      }
      return null;
    } catch {
      return null;
    }
  }
}
