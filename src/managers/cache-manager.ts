import { CacheConfig, CacheItem } from "@/types";

export const DEFAULT_CACHE_TIME = 5000;
type Config = Exclude<CacheConfig, boolean>;
export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private globalConfig: Config;
  constructor(config?: Config) {
    const configObj = typeof config === "object" ? config : {};
    this.globalConfig = {
      cacheTime: DEFAULT_CACHE_TIME,
      ...configObj,
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
  public set<T>(key: string, data: T, config: Config = {}): void {
    const configObj = typeof config === "object" ? config : {};
    const mergedConfig = {
      ...this.globalConfig,
      ...configObj,
    };
    const { cacheTime } = mergedConfig;

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

  public updateConfig(config: Partial<Config>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
