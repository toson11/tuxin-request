import axios, { AxiosInstance, AxiosResponse } from "axios";
import { mergeConfig as axiosMergeConfig } from "axios";
import { InternalAxiosRequestConfig, RequestConfig } from "@/types";
import {
  CacheManager,
  LoadingManager,
  CryptoManager,
  SensitiveManager,
  RetryManager,
  DuplicatedManager,
} from "@/managers";

const defaultConfig: RequestConfig = {
  retry: {
    enabled: true,
  },
  cache: {
    enabled: true,
  },
  loading: {
    enabled: true,
  },
  duplicated: {
    enabled: true,
  },
  sensitive: {
    enabled: false,
  },
  crypto: {
    enabled: false,
  },
  /** 默认响应成功处理 */
  responseSuccessHandler: async (response) => {
    const { data } = response;
    if (data.code >= 200 && data.code < 300) {
      return data.data;
    }
    return Promise.reject(data);
  },
};

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

class TuxinRequest {
  public instance: RequestInstance;
  /** 全局配置，不允许外部直接修改 */
  private globalConfig: RequestConfig;
  /** 缓存管理 */
  public cacheManager: CacheManager;
  /** loading管理 */
  public loadingManager: LoadingManager;
  /** 加密管理 */
  public cryptoManager: CryptoManager;
  /** 脱敏管理 */
  public sensitiveManager: SensitiveManager;
  /** 重试管理 */
  public retryManager: RetryManager;
  /** 重复请求管理 */
  public duplicatedManager: DuplicatedManager;

  constructor(config: RequestConfig) {
    this.globalConfig = axiosMergeConfig(defaultConfig, config);
    this.instance = axios.create(this.globalConfig) as RequestInstance;

    // 功能模块初始化
    const { cache, crypto, sensitive, retry, duplicated, loading } =
      this.globalConfig;
    this.cacheManager = new CacheManager(cache);
    this.loadingManager = new LoadingManager(loading);
    this.cryptoManager = new CryptoManager(crypto);
    this.sensitiveManager = new SensitiveManager(sensitive);
    this.retryManager = new RetryManager(retry);
    this.duplicatedManager = new DuplicatedManager(duplicated);

    // 拦截器初始化
    this.instance.interceptors.request.use(this.requestHandler);
    this.instance.interceptors.response.use(
      this.responseSuccessHandler,
      this.responseErrorHandler
    );
  }

  /** 合并配置 */
  private mergeConfig(
    config: InternalAxiosRequestConfig
  ): InternalAxiosRequestConfig {
    return axiosMergeConfig(
      this.globalConfig,
      config
    ) as InternalAxiosRequestConfig;
  }

  /** 更新全局配置 */
  public updateConfig(config: Partial<RequestConfig>): void {
    config.retry && this.retryManager.updateConfig(config.retry);
    config.crypto && this.cryptoManager.updateConfig(config.crypto);
    config.sensitive && this.sensitiveManager.updateConfig(config.sensitive);
    config.cache && this.cacheManager.updateConfig(config.cache);
    config.duplicated && this.duplicatedManager.updateConfig(config.duplicated);
    config.loading && this.loadingManager.updateConfig(config.loading);
  }

  /** 请求结束回调 */
  protected requestFinish = async (config: InternalAxiosRequestConfig) => {
    if (config.loading?.enabled) {
      this.loadingManager.remove(config.loading);
    }
    if (config.duplicated?.enabled) {
      const requestKey = this.generateRequestKey(config);
      this.duplicatedManager.remove(requestKey);
    }
  };

  /** 请求拦截器 */
  protected requestHandler = async (_config: InternalAxiosRequestConfig) => {
    const config = this.mergeConfig(_config);
    if (config.duplicated?.enabled) {
      const requestKey = this.generateRequestKey(config);
      this.duplicatedManager.cancel(requestKey);
      const controller = new AbortController();
      config.signal = controller.signal;
      this.duplicatedManager.add(requestKey, controller);
    }
    this.loadingManager.add(config.loading);

    // 支持自定义每个请求的请求处理
    if (config.requestHandler) {
      await config.requestHandler(config);
    }

    // 处理请求数据加密
    if (config.data && config.crypto?.enabled) {
      config.data = this.cryptoManager.encrypt(config.data);
    }

    return config;
  };

  /** 请求错误拦截器 */
  protected requestErrorHandler = (error: any) => {
    const config = this.mergeConfig(error.config);
    this.requestFinish(config);

    // 支持自定义每个请求的请求错误处理
    if (config.requestErrorHandler) {
      return config.requestErrorHandler(error);
    }
    // 默认请求错误处理
    return Promise.reject(error);
  };

  /** 响应成功拦截器 */
  protected responseSuccessHandler = (response: AxiosResponse) => {
    const config = this.mergeConfig(response.config);
    const { data } = response;
    this.requestFinish(config);

    // 处理响应数据解密
    if (data && config.crypto?.enabled) {
      response.data = this.cryptoManager.decrypt(data);
    }

    // 处理响应数据脱敏
    if (data && config.sensitive?.enabled) {
      response.data = this.sensitiveManager.desensitize(data);
    }

    // 支持自定义每个请求的响应成功处理
    if (config.responseSuccessHandler) {
      return config.responseSuccessHandler(response);
    }

    // 默认响应成功处理
    return Promise.resolve(data);
  };

  /** 响应错误拦截器 */
  protected responseErrorHandler = async (error: any) => {
    const config = this.mergeConfig(error.config);

    this.requestFinish(config);

    const retryResult = await this.retryManager.handleRetry(
      error,
      config,
      this.instance
    );
    if (retryResult) return retryResult;

    // 自定义错误处理
    if (config.responseErrorHandler) {
      return config.responseErrorHandler(error.response);
    }

    // 默认错误处理
    return Promise.reject(error);
  };

  /**
   * 生成请求的唯一标识
   */
  public generateRequestKey(config: any): string {
    const { method, url, params, data } = config;
    const paramsString = params ? JSON.stringify(params) : "";
    const dataString = data ? JSON.stringify(data) : "";
    return `${method}:${url}:${paramsString}:${dataString}`;
  }

  public async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    // 获取缓存
    const requestKey = this.generateRequestKey({
      ...(config || {}),
      method: "GET",
      url,
    });
    const cache = this.cacheManager.get<T>(requestKey);
    if (cache) return Promise.resolve(cache);

    return this.instance.get(url, config).then((response) => {
      // 缓存请求结果
      this.cacheManager.set(requestKey, response);
      return response;
    });
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    // 获取缓存
    const requestKey = this.generateRequestKey({
      ...(config || {}),
      method: "POST",
      url,
      data,
    });
    const cache = this.cacheManager.get<T>(requestKey);
    if (cache) return Promise.resolve(cache);

    return this.instance.post(url, data, config).then((response) => {
      // 缓存请求结果
      this.cacheManager.set(requestKey, response);
      return response;
    });
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig<T>
  ): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig<T>
  ): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public async delete<T = any>(
    url: string,
    config?: RequestConfig<T>
  ): Promise<T> {
    return this.instance.delete(url, config);
  }
}

export default TuxinRequest;
