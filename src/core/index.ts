import axios, { AxiosInstance, AxiosResponse } from "axios";
import { mergeConfig as axiosMergeConfig } from "axios";
import {
  InternalAxiosRequestConfig,
  RequestConfig,
  RequestConfigWithoutCache,
} from "@/types";
import {
  CacheManager,
  LoadingManager,
  CryptoManager,
  SensitiveManager,
  RetryManager,
  DuplicatedManager,
} from "@/managers";
import { handleBooleanToConfig } from "./utils";
import { ERROR_KEY } from "./constants";

const defaultConfig: RequestConfig = {
  timeout: 15000,
  retry: true,
  loading: true,
  duplicated: true,
  cache: false,
  sensitive: { rules: [] },
  crypto: false,
};

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

/** 是否可以缓存 */
const canCache = (config: InternalAxiosRequestConfig) => {
  return (
    config.cache && ["get", "post"].includes(config.method?.toLowerCase() || "")
  );
};

export class TuxinRequest {
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

  constructor(config: RequestConfigWithoutCache) {
    this.globalConfig = axiosMergeConfig(defaultConfig, config);
    this.instance = axios.create(this.globalConfig) as RequestInstance;

    // 功能模块初始化
    this.cacheManager = new CacheManager();
    this.loadingManager = new LoadingManager();
    this.cryptoManager = new CryptoManager();
    this.sensitiveManager = new SensitiveManager();
    this.retryManager = new RetryManager();
    this.duplicatedManager = new DuplicatedManager();
    this.updateConfig(this.globalConfig);

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
    this.retryManager.updateConfig(handleBooleanToConfig(config.retry));
    this.cryptoManager.updateConfig(handleBooleanToConfig(config.crypto));
    this.sensitiveManager.updateConfig(handleBooleanToConfig(config.sensitive));
    this.cacheManager.updateConfig(handleBooleanToConfig(config.cache));
    this.loadingManager.updateConfig(handleBooleanToConfig(config.loading));
  }

  protected onFinish = async (config: InternalAxiosRequestConfig) => {
    if (config.loading) {
      this.loadingManager.remove(
        typeof config.loading === "object" ? config.loading.target : undefined
      );
    }
    if (config.duplicated) {
      // 响应完成，移除重复请求
      const requestKey = this.generateRequestKey(config);
      this.duplicatedManager.remove(requestKey);
    }
  };

  protected desensitize = async (
    response: AxiosResponse,
    config: InternalAxiosRequestConfig
  ) => {
    if (config.sensitive) {
      // 脱敏
      response.data = this.sensitiveManager.desensitize(
        response.data,
        handleBooleanToConfig(config.sensitive)
      );
    }
  };

  protected cache = async (config: InternalAxiosRequestConfig, data: any) => {
    if (canCache(config)) {
      // 缓存，必须放到最后，否则会影响脱敏和解密
      const requestKey = this.generateRequestKey(config);
      this.cacheManager.set(
        requestKey,
        data,
        handleBooleanToConfig(config.cache)
      );
    }
  };

  /** 请求拦截器 */
  protected requestHandler = async (_config: InternalAxiosRequestConfig) => {
    const config = this.mergeConfig(_config);

    if (canCache(config)) {
      const requestKey = this.generateRequestKey(config);
      const cache = this.cacheManager.get(requestKey);
      if (cache) {
        const controller = new AbortController();
        // 终断请求
        controller.abort();
        // 添加缓存数据到 signal 中, 用于在请求错误拦截器中返回缓存数据
        (controller.signal as any).cacheData = cache;
        config.signal = controller.signal;
        return config;
      }
    }

    if (config.duplicated) {
      const requestKey = this.generateRequestKey(config);
      const controller = new AbortController();
      config.signal = controller.signal;
      this.duplicatedManager.add(requestKey, controller);
    }

    if (config.loading) {
      this.loadingManager.add(handleBooleanToConfig(config.loading));
    }

    // 支持自定义每个请求的请求处理，必须在加密和脱敏之前
    if (config.requestHandler) {
      await config.requestHandler(config);
    }

    // 处理请求数据加密
    if (config.crypto) {
      config.data = this.cryptoManager.encryptFields(
        config.data,
        handleBooleanToConfig(config.crypto)
      );
      // 加密后关闭加密，避免重复加密
      config.crypto = false;
    }

    return config;
  };

  /** 请求错误拦截器 */
  protected requestErrorHandler = (error: any) => {
    const config = this.mergeConfig(error.config);
    this.onFinish(config);

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
    this.onFinish(config);
    this.desensitize(response, config);
    this.cache(config, data);

    // 支持自定义每个请求的响应成功处理
    if (config.responseSuccessHandler) {
      return config.responseSuccessHandler(response);
    }

    // 默认响应成功处理
    return Promise.resolve(response.data);
  };

  /** 响应错误拦截器 */
  protected responseErrorHandler = async (error: any) => {
    const config = this.mergeConfig(error.config);

    if (!config.retry || config.retryCount) {
      // 没有重试，关闭loading；如果需要重试，则下一个重试请求关闭上一个重试请求
      this.onFinish(config);
    }
    // 如果是请求被终断
    if (error.name === "CanceledError" && error.message === "canceled") {
      if (error.config?.signal?.cacheData) {
        // 返回缓存数据
        return error.config.signal.cacheData;
      }
      // 直接抛出错误，让 try-catch 捕获
      return Promise.reject(new Error(error.message || "请求已被取消"));
    }
    // 如果是加密错误，直接抛出，不进行重试
    if (error.message.includes(ERROR_KEY.ENCRYPT)) {
      return Promise.reject(new Error(error.message || "加密错误"));
    }

    // 如果是超时错误，直接抛出，不进行重试
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return Promise.reject(new Error(error.message || "请求超时"));
    }

    if (config.retry) {
      const retryResult = await this.retryManager.handleRetry(
        error,
        config,
        this.instance
      );
      if (retryResult) return retryResult;
    }

    this.onFinish(config);

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
  public generateRequestKey(config: InternalAxiosRequestConfig): string {
    const { method, url, params, data } = config;
    const paramsString = params ? JSON.stringify(params) : "";
    const dataString = data ? JSON.stringify(data) : "";
    const key = `${method}:${url}:${paramsString}:${dataString}`;
    return key;
  }

  public async get<T = any>(
    url: string,
    config?: RequestConfig<T>
  ): Promise<T> {
    return this.instance.get(url, config);
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: RequestConfig<T>
  ): Promise<T> {
    return this.instance.post(url, data, config);
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: RequestConfigWithoutCache<T>
  ): Promise<T> {
    return this.instance.patch(url, data, config);
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: RequestConfigWithoutCache<T>
  ): Promise<T> {
    return this.instance.put(url, data, config);
  }

  public async delete<T = any>(
    url: string,
    config?: RequestConfigWithoutCache<T>
  ): Promise<T> {
    return this.instance.delete(url, config);
  }
}
