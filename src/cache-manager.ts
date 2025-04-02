export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export interface CacheConfig {
  cache?: boolean;
  cacheTime?: number;
}

export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private defaultCacheTime = 5000;

  public get<T>(key: string, config?: CacheConfig): T | null {
    if (!config?.cache) return null;

    const cachedData = this.cache.get(key);
    if (cachedData) {
      const now = Date.now();
      if (
        now - cachedData.timestamp <
        (config.cacheTime || this.defaultCacheTime)
      ) {
        return cachedData.data;
      }
    }
    return null;
  }

  public set<T>(key: string, data: T, config?: CacheConfig): void {
    if (!config?.cache) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public remove(key: string): void {
    this.cache.delete(key);
  }
}
