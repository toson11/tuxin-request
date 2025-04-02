import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig as AxiosInternalRequestConfig,
} from "axios";
import { CacheManager } from "./cache-manager";
import LoadingManager, { LoadingTarget } from "./loading-manager";
import { CryptoManager, CryptoConfig } from "./crypto-manager";

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type LoadingConfig = boolean | LoadingTarget;

export type InternalAxiosRequestConfig<T = any> = AxiosInternalRequestConfig &
  RequestConfig<T>;

export type RequestConfig<T = any> = Prettify<
  AxiosRequestConfig & {
    /** 请求失败后的重试次数，默认 3 次 */
    retry?: number;
    /** 当前重试次数（内部使用） */
    retryCount?: number;
    /** 重试间隔时间（毫秒） */
    retryDelay?: number;
    /** 重试前回调 */
    beforeRetry?: (error: any, retryCount: number) => Promise<any>;
    /** 是否启用请求缓存，默认 true */
    cache?: boolean;
    /** 缓存有效期（毫秒） */
    cacheTime?: number;
    /** 是否显示loading，默认 true */
    loading?: LoadingConfig;
    /** 是否取消重复请求，默认 true */
    cancelDuplicated?: boolean;
    /** 响应错误处理 */
    responseErrorHandler?: (errorResponse: AxiosResponse) => Promise<any>;
    /** 响应成功处理 */
    responseSuccessHandler?: (response: AxiosResponse) => Promise<T>;
    /** 请求处理 */
    requestHandler?: (config: InternalAxiosRequestConfig) => Promise<any>;
    /** 请求错误处理 */
    requestErrorHandler?: (error: any) => Promise<any>;
    /** 加密配置 */
    crypto?: CryptoConfig;
  }
>;

const defaultConfig: RequestConfig = {
  /** 默认请求错误重试 */
  retry: 3,
  retryDelay: 500,
  /** 默认开启缓存 */
  cache: true,
  cacheTime: 1000 * 60 * 5,
  /** 是否显示loading，默认显示 */
  loading: true,
  /** 是否默认取消重复请求，默认取消 */
  cancelDuplicated: true,
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
  /** 全局配置 */
  private globalConfig: RequestConfig;
  /** 缓存管理 */
  private cacheManager: CacheManager;
  /** loading管理 */
  private loadingManager: LoadingManager;
  /** 加密管理 */
  private cryptoManager: CryptoManager;
  /** 存储pending的请求 */
  private pendingRequests: Map<string, AbortController> = new Map();

  constructor(config: RequestConfig) {
    this.globalConfig = { ...defaultConfig, ...config };
    this.instance = axios.create(config) as RequestInstance;
    this.cacheManager = new CacheManager();
    this.loadingManager = new LoadingManager();
    this.cryptoManager = new CryptoManager(config.crypto || { enabled: false });
    this.init();
  }

  private init(): void {
    this.instance.interceptors.request.use(this.requestHandler);
    this.instance.interceptors.response.use(
      this.responseSuccessHandler,
      this.responseErrorHandler
    );
  }

  normalizeConfig(
    config: InternalAxiosRequestConfig
  ): InternalAxiosRequestConfig {
    return {
      ...this.globalConfig,
      ...config,
    };
  }

  protected requestFinish = async (config: InternalAxiosRequestConfig) => {
    this.stopLoading(config);
    if (config.cancelDuplicated) {
      const requestKey = this.generateRequestKey(config);
      // 移除请求记录，请求已经结束，不需要取消请求
      this.pendingRequests.delete(requestKey);
    }
  };

  protected requestHandler = async (_config: InternalAxiosRequestConfig) => {
    const config = this.normalizeConfig(_config);
    if (config.cancelDuplicated) {
      const requestKey = this.generateRequestKey(config);
      this.removePendingRequest(requestKey);
      const controller = new AbortController();
      config.signal = controller.signal;
      this.pendingRequests.set(requestKey, controller);
    }
    this.startLoading(config);

    // 处理请求数据加密
    if (config.data && config.crypto?.enabled) {
      config.data = this.cryptoManager.encrypt(config.data);
    }

    // 支持自定义每个请求的请求处理
    if (config.requestHandler) {
      await config.requestHandler(config);
    }
    // 默认请求处理
    return config;
  };

  protected requestErrorHandler = (error: any) => {
    const config = this.normalizeConfig(error.config);
    this.requestFinish(config);

    // 支持自定义每个请求的请求错误处理
    if (config.requestErrorHandler) {
      return config.requestErrorHandler(error);
    }
    // 默认请求错误处理
    return Promise.reject(error);
  };

  protected responseSuccessHandler = (response: AxiosResponse) => {
    const config = this.normalizeConfig(response.config);
    const { data } = response;
    this.requestFinish(config);

    // 处理响应数据解密
    if (data && config.crypto?.enabled) {
      response.data = this.cryptoManager.decrypt(data);
    }

    // 支持自定义每个请求的响应成功处理
    if (config.responseSuccessHandler) {
      return config.responseSuccessHandler(response);
    }

    // 默认响应成功处理
    return Promise.resolve(data);
  };

  protected responseErrorHandler = async (error: any) => {
    const config = this.normalizeConfig(error.config);

    this.requestFinish(config);

    const res = await this.retry(error);
    if (res) return res;

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
  public generateRequestKey(config: RequestConfig): string {
    const { method, url, params, data } = config;
    const paramsString = params ? JSON.stringify(params) : "";
    const dataString = data ? JSON.stringify(data) : "";
    return `${method}:${url}:${paramsString}:${dataString}`;
  }

  /**
   * 取消重复请求
   * @param config
   */
  private removePendingRequest(requestKey: string): void {
    if (this.pendingRequests.has(requestKey)) {
      const controller = this.pendingRequests.get(requestKey);
      controller?.abort();
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 取消请求
   * @param requestKey
   */
  public cancelRequest(requestKey: string): void {
    const controller = this.pendingRequests.get(requestKey);
    controller?.abort();
    this.pendingRequests.delete(requestKey);
  }

  /**
   * 取消所有请求
   */
  public cancelAllRequest(): void {
    this.pendingRequests.forEach((controller) => controller.abort());
    this.pendingRequests.clear();
  }

  /**
   * 重试
   * @param config
   */
  protected async retry(error: any) {
    const config = error.config;
    // 处理重试
    const retry =
      typeof config?.retry === "number"
        ? config.retry
        : this.globalConfig.retry;
    if (retry) {
      config.retryCount = config.retryCount || 0;
      if (config.retryCount < retry) {
        await config.beforeRetry?.(error, config.retryCount);
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
  protected startLoading(config: RequestConfig) {
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
  protected stopLoading(config: RequestConfig) {
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
  public clearLoading() {
    this.loadingManager.clear();
  }

  /**
   * 清除所有缓存
   */
  public clearCache() {
    this.cacheManager.clear();
  }

  public async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    // 获取缓存
    const requestKey = this.generateRequestKey({
      ...(config || {}),
      method: "GET",
      url,
    });
    const cache = this.cacheManager.get<T>(requestKey, config);
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
    const cache = this.cacheManager.get<T>(requestKey, config);
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

  /**
   * 更新加密配置
   * @param config 新的加密配置
   */
  public updateCryptoConfig(config: Partial<CryptoConfig>): void {
    this.cryptoManager.updateConfig(config);
  }
}

export default TuxinRequest;
