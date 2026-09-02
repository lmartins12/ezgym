import { Injectable, inject } from '@angular/core';
import { DatabaseService } from '@core/db/database';

/**
 * Prefix shared by every app-owned localStorage key (app_theme,
 * app_language, ...). Any task that persists a new preference must
 * use this prefix so the wipe covers it.
 */
const APP_STORAGE_PREFIX = 'app_';

/**
 * Single entry point for the destructive "reset app" action: deletes
 * every Dexie table and all app preferences from localStorage.
 * Irreversible — the caller must ask for explicit confirmation first.
 */
@Injectable({ providedIn: 'root' })
export class DataWipeService {
  private readonly database = inject(DatabaseService);

  public async wipeAll(): Promise<void> {
    await this.database.wipe();
    this.clearAppPreferences();
  }

  private clearAppPreferences(): void {
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(APP_STORAGE_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => localStorage.removeItem(key));
  }
}
