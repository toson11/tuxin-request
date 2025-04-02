import { CacheConfig, CacheItem } from "@/types";

export const DEFAULT_CACHE_TIME = 5000;
export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private globalConfig: CacheConfig;
  constructor(config?: CacheConfig) {
    this.globalConfig = {
      cacheTime: DEFAULT_CACHE_TIME,
      ...(config || {}),
    };
  }

  /**
   * 获取缓存
   * @param key 缓存key
   * @param config 单独自定义缓存配置
   */
  public get<T>(key: string): T | null {
    const cachedData = this.cache.get(key);
    if (cachedData) {
      const now = Date.now();
      if (now < cachedData.expireTime) {
        return cachedData.data;
      } else {
        this.remove(key);
      }
    }
    return null;
  }

  /**
   * 设置缓存
   * @param key 缓存key
   * @param data 缓存数据
   * @param config 单独自定义缓存配置
   */
  public set<T>(key: string, data: T, config: CacheConfig = {}): void {
    const { cacheTime } = { ...this.globalConfig, ...config };

    this.cache.set(key, {
      data,
      expireTime: Date.now() + (cacheTime || DEFAULT_CACHE_TIME),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public remove(key: string): void {
    this.cache.delete(key);
  }

  public updateConfig(config: Partial<CacheConfig>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
