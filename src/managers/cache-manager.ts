import { CacheConfig as Config, CacheItem } from "@/types";
import BaseManager from "./base-manager";

export const DEFAULT_CACHE_TIME = 5000;
export class CacheManager extends BaseManager<Config> {
  private cache = new Map<string, CacheItem<any>>();
  constructor(config?: Config) {
    super({ cacheTime: DEFAULT_CACHE_TIME }, config);
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
    const cacheTime = config?.cacheTime || this.defaultConfig.cacheTime;

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
}
