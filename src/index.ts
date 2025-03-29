import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CacheManager } from './cache-manager';

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type RequestConfig = Prettify<AxiosRequestConfig & {
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
}>

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

export class TuxinRequest {
  private instance: RequestInstance;
  private cacheManager: CacheManager

  constructor(config: RequestConfig) {
    this.instance = axios.create(config) as RequestInstance;
    this.cacheManager = new CacheManager();
    this.init();
  }

  private init(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加 token
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const { data, status } = response;
        if (status >= 200 && status < 300) {
          return data;
        }
        return Promise.reject(new Error('请求失败'));
      },
      async (error) => {
        const config = error.config as RequestConfig;
        
        // 处理重试
        if (config && config.retry) {
          config.retryCount = config.retryCount || 0;
          if (config.retryCount < config.retry) {
            config.retryCount++;
            const delay = config.retryDelay || 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
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
    );
  }

  public get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const cacheKey = this.cacheManager.generateKey('GET', url, config?.params, config?.data)
    const cache = this.cacheManager.get<T>(cacheKey, config)
    if(cache) return Promise.resolve(cache)

    return this.instance.get(url, config).then(response => {
      this.cacheManager.set(cacheKey, response)
      return response;
    });
  }

  public post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const cacheKey = this.cacheManager.generateKey('POST', url, config?.params, config?.data)
    const cache = this.cacheManager.get<T>(cacheKey, config)
    if(cache) return Promise.resolve(cache)

    return this.instance.post(url, data, config).then(response => {
      this.cacheManager.set(cacheKey, response)
      return response;
    });
  }

  public patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete(url, config);
  }

  public clearCache(): void {
    this.cacheManager.clear();
  }
}
