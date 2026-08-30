import { Injectable, signal } from '@angular/core';
import { db, EzGymDatabase } from './app-db';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  public readonly db: EzGymDatabase = db;

  private readonly isReady = signal(false);
  public readonly ready = this.isReady.asReadonly();

  public async initialize(): Promise<void> {
    if (this.isReady()) return;

    try {
      if (!this.db.isOpen()) {
        await this.db.open();
      }
      this.isReady.set(true);
    } catch (err) {
      console.error('Database initialization failed:', err);
      throw err;
    }
  }

  public async close(): Promise<void> {
    this.db.close();
    this.isReady.set(false);
  }
}
