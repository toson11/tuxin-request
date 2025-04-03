import { CacheConfig, CacheItem } from "@/types";

export const DEFAULT_CACHE_TIME = 5000;
type Config = Exclude<CacheConfig, boolean>;
export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private cacheTime: number = DEFAULT_CACHE_TIME;
  constructor(config?: Config) {
    if (config) {
      this.cacheTime = config.cacheTime || DEFAULT_CACHE_TIME;
    }
  }

  /**
   * 获取缓存
   * @param key 缓存key
   * @param config 单独自定义缓存配置
   */
  public get<T>(key: string): T | undefined {
    const cachedData = this.cache.get(key);
    return cachedData?.data;
  }

  /**
   * 设置缓存
   * @param key 缓存key
   * @param data 缓存数据
   * @param config 单独自定义缓存配置
   */
  public set<T>(key: string, data: T, config?: Config): void {
    const cacheTime = config?.cacheTime || this.cacheTime;

    this.cache.set(key, {
      data,
      timeout: setTimeout(() => {
        this.remove(key);
      }, cacheTime),
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public remove(key: string): void {
    const cachedData = this.cache.get(key);
    if (cachedData?.timeout) {
      clearTimeout(cachedData.timeout);
    }
    this.cache.delete(key);
  }

  public updateConfig(config: Partial<Config>): void {
    if (config.cacheTime) {
      this.cacheTime = config.cacheTime;
    }
  }
}
