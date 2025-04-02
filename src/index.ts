import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig as AxiosInternalRequestConfig,
} from "axios";
import { CacheManager } from "./cache-manager";
import LoadingManager, { LoadingTarget } from "./loading-manager";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type LoadingConfig = boolean | LoadingTarget;

export interface InternalAxiosRequestConfig extends AxiosInternalRequestConfig {
  loading?: LoadingConfig;
}

export type RequestConfig = Prettify<
  AxiosRequestConfig & {
    /** 请求失败后的重试次数 */
    retry?: number;
    /** 当前重试次数（内部使用） */
    retryCount?: number;
    /** 重试间隔时间（毫秒） */
    retryDelay?: number;
    /** 是否启用请求缓存 */
    cache?: boolean;
    /** 缓存有效期（毫秒） */
    cacheTime?: number;
    /** 是否默认显示loading */
    loading?: LoadingConfig;
  }
>;

const defaultConfig: RequestConfig = {
  /** 默认请求错误重试 */
  retry: 3,
  retryDelay: 1000,
  /** 默认开启缓存 */
  cache: true,
  cacheTime: 1000 * 60 * 5,
  /** 默认显示loading */
  loading: true,
};

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

export class TuxinRequest {
  public instance: RequestInstance;
  /** 全局配置 */
  private globalConfig: RequestConfig;
  /** 缓存管理 */
  private cacheManager: CacheManager;
  /** loading管理 */
  private loadingManager: LoadingManager;

  constructor(config: RequestConfig) {
    this.globalConfig = { ...defaultConfig, ...config };
    this.instance = axios.create(config) as RequestInstance;
    this.cacheManager = new CacheManager();
    this.loadingManager = new LoadingManager();
    this.init();
  }

  private init(): void {
    this.instance.interceptors.request.use(this.defaultRequestHandler);
    this.instance.interceptors.response.use(
      this.defaultResponseHandler,
      this.defaultErrorHandler
    );
  }

  protected defaultRequestHandler = (config: InternalAxiosRequestConfig) => {
    console.log(
      "🚀 ~ TuxinRequest ~ defaultRequestHandler ~ config.loading:",
      config.loading
    );
    if (config.loading) {
      this.loadingManager.add(config.loading === true ? "" : config.loading);
    }
    return config;
  };

  protected defaultRequestErrorHandler = (error: any) => {
    // 关闭 loading
    if (error.config?.loading) {
      this.loadingManager.remove(
        error.config.loading === true ? "" : error.config.loading
      );
    }
  };

  protected defaultResponseHandler = (response: AxiosResponse) => {
    const { data, status } = response;
    const config = response.config as RequestConfig;
    this.stopLoading(config);

    if (status >= 200 && status < 300) {
      return data;
    }
    return Promise.reject(new Error("请求失败"));
  };

  protected defaultErrorHandler = async (error: any) => {
    const config = error.config as RequestConfig;

    this.stopLoading(config);

    const res = await this.retry(config);
    if (res) return res;

    // 错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 处理未授权
          break;
        case 403:
          // 处理禁止访问
          break;
        case 404:
          // 处理未找到
          break;
        case 500:
          // 处理服务器错误
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  };

  /**
   * 重试
   * @param config
   */
  retry(config: RequestConfig) {
    // 处理重试
    const retry =
      typeof config?.retry === "number"
        ? config.retry
        : this.globalConfig.retry;
    if (retry) {
      config.retryCount = config.retryCount || 0;
      if (config.retryCount < retry) {
        config.retryCount++;
        const delay =
          typeof config.retryDelay === "number"
            ? config.retryDelay
            : this.globalConfig.retryDelay;
        return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
          this.instance(config)
        );
      }
    }
  }

  /**
   * 开始 loading
   * @param config
   */
  startLoading(config: RequestConfig) {
    const loading =
      typeof config?.loading === "undefined"
        ? this.globalConfig.loading
        : config.loading;
    if (loading) {
      this.loadingManager.add(loading === true ? "" : loading);
    }
  }

  /**
   * 停止 loading
   * @param config
   */
  stopLoading(config: RequestConfig) {
    const loading =
      typeof config?.loading === "undefined"
        ? this.globalConfig.loading
        : config.loading;
    if (loading) {
      this.loadingManager.remove(loading === true ? "" : loading);
    }
  }

  /**
   * 清除所有 loading
   */
  clearLoading() {
    this.loadingManager.clear();
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    this.cacheManager.clear();
  }

  public async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    // 获取缓存
    const cacheKey = this.cacheManager.generateKey(
      "GET",
      url,
      config?.params,
      config?.data
    );
    const cache = this.cacheManager.get<T>(cacheKey, config);
    if (cache) return Promise.resolve(cache);

    return this.instance.get(url, config).then((response) => {
      // 缓存请求结果
      this.cacheManager.set(cacheKey, response);
      return response;
    });
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    // 获取缓存
    const cacheKey = this.cacheManager.generateKey(
      "POST",
      url,
      config?.params,
      config?.data
    );
    const cache = this.cacheManager.get<T>(cacheKey, config);
    if (cache) return Promise.resolve(cache);

    return this.instance.post(url, data, config).then((response) => {
      // 缓存请求结果
      this.cacheManager.set(cacheKey, response);
      return response;
    });
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public async delete<T = any>(
    url: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.instance.delete(url, config);
  }
}
