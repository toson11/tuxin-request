import { CacheConfig as Config, CacheItem } from "@/types";
import BaseManager from "./base-manager";

/** 默认缓存时间 */
export const DEFAULT_CACHE_TIME = 60 * 1000; // 1分钟
/** 默认缓存最大数量 */
export const DEFAULT_MAX_SIZE = 50;
export class CacheManager extends BaseManager<Config> {
  private cache = new Map<string, CacheItem<any>>();
  constructor(config?: Config) {
    super({ cacheTime: DEFAULT_CACHE_TIME, maxSize: DEFAULT_MAX_SIZE }, config);
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
    const { cacheTime = DEFAULT_CACHE_TIME, maxSize = DEFAULT_MAX_SIZE } =
      this.mergeConfig(config);
    if (this.cache.size >= maxSize) {
      // 如果缓存数量超过最大数量，则删除最早的缓存
      const firstKey = this.cache.keys().next().value;
      this.remove(firstKey!);
    }
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
