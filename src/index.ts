import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig as AxiosInternalRequestConfig,
} from "axios";
import { CacheManager } from "./cache-manager";
import LoadingManager, { LoadingTarget } from "./loading";

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
    /** 请求显示loading */
    loading?: LoadingConfig;
  }
>;

// 添加 loading 样式
const style = document.createElement("style");
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

export class TuxinRequest {
  public instance: RequestInstance;
  private globalConfig: RequestConfig;
  private cacheManager: CacheManager;
  private loadingManager: LoadingManager;

  constructor(config: RequestConfig) {
    this.globalConfig = config;
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

  protected defaultRequestHandler(config: InternalAxiosRequestConfig) {
    if (config.loading) {
      this.loadingManager.add(config.loading === true ? "" : config.loading);
    }
    return config;
  }

  protected defaultRequestErrorHandler(error: any) {
    // 关闭 loading
    if (error.config?.loading) {
      this.loadingManager.remove(
        error.config.loading === true ? "" : error.config.loading
      );
    }
  }

  protected defaultResponseHandler(response: AxiosResponse) {
    const { data, status } = response;
    if (status >= 200 && status < 300) {
      return data;
    }
    return Promise.reject(new Error("请求失败"));
  }

  protected async defaultErrorHandler(error: any) {
    const config = error.config as RequestConfig;

    // 关闭 loading
    if (config?.loading) {
      this.loadingManager.remove(config.loading === true ? "" : config.loading);
    }

    // 处理重试
    if (config?.retry) {
      config.retryCount = config.retryCount || 0;
      if (config.retryCount < config.retry) {
        config.retryCount++;
        const delay = config.retryDelay || 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.instance(config);
      }
    }

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
  }

  public get<T = any>(url: string, config?: RequestConfig): Promise<T> {
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

  public post<T = any>(
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

  public patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  public clearCache(): void {
    this.cacheManager.clear();
  }
}
