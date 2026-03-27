import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'text-annotator';
  private readonly version = 'v1';

  getItem<T>(key: string, fallbackData: T): T {
    try {
      const storageKey = this.makeStorageKey(key);
      const rawData = localStorage.getItem(storageKey);
      if (!rawData) {
        return fallbackData;
      }
      return JSON.parse(rawData) as T;
    } catch {
      return fallbackData;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      const storageKey = this.makeStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {}
  }

  private makeStorageKey(key: string) {
    return `${this.prefix}:${this.version}:${key}`;
  }
}
