import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DesignTokensService {
  private cache = new Map<string, number>();

  getNumber(varName: string, fallback: number): number {
    const cached = this.cache.get(varName);
    if (cached != null) {
      return cached;
    }
    const value = this.readNumber(varName, fallback);
    this.cache.set(varName, value);
    return value;
  }

  refresh(): void {
    this.cache.clear();
  }

  private readNumber(varName: string, fallback: number): number {
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }
}
