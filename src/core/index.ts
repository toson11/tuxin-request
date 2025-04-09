import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import {
  InternalRequestConfig,
  RequestConfig,
  RequestConfigWithoutCache,
  RequestCustomConfig,
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
import { ERROR_MESSAGE_KEY } from "./constants";

const DEFAULT_MANAGER_CONFIG: RequestCustomConfig = {
  retry: true,
  loading: true,
  duplicated: true,
  cache: { enabled: false },
  sensitive: { enabled: false },
  crypto: false,
};

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
}

class TuxinRequestManager {
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
  /** 全局配置 */
  public defaultConfig: RequestCustomConfig = {};

  constructor(config?: RequestCustomConfig) {
    // 功能模块初始化
    this.cacheManager = new CacheManager();
    this.loadingManager = new LoadingManager();
    this.cryptoManager = new CryptoManager();
    this.sensitiveManager = new SensitiveManager();
    this.retryManager = new RetryManager();
    this.duplicatedManager = new DuplicatedManager();
    config && this.updateManagerConfig(config);
  }

  /** 是否启用，如果未定义，则使用默认配置 */
  isEnabled(config: InternalRequestConfig, key: keyof RequestCustomConfig) {
    let managerConfig;
    if (config[key] === undefined) {
      managerConfig = this.defaultConfig[key];
    } else {
      managerConfig = config[key];
    }
    return typeof managerConfig === "object"
      ? managerConfig.enabled
      : managerConfig;
  }

  /** 是否可以缓存 */
  canCache(config: InternalRequestConfig) {
    return (
      this.isEnabled(config, "cache") &&
      ["get", "post"].includes(config.method?.toLowerCase() || "")
    );
  }

  /** 脱敏 */
  protected desensitize = async (
    response: AxiosResponse,
    config: InternalRequestConfig
  ) => {
    if (this.isEnabled(config, "sensitive")) {
      response.data = this.sensitiveManager.desensitize(
        response.data,
        handleBooleanToConfig(config.sensitive)
      );
    }
  };

  /** 开始loading */
  protected startLoading = (config: InternalRequestConfig) => {
    if (this.isEnabled(config, "retry") && config.retryCount) return; // 重试请求，不添加loading
    if (this.isEnabled(config, "loading")) {
      this.loadingManager.add(handleBooleanToConfig(config.loading));
    }
  };

  /** 停止loading */
  protected stopLoading = (config: InternalRequestConfig) => {
    if (this.isEnabled(config, "loading")) {
      this.loadingManager.remove(
        typeof config.loading === "object" ? config.loading.target : undefined
      );
    }
  };

  /** 添加重复请求 */
  protected addDuplicated = (config: InternalRequestConfig) => {
    if (this.isEnabled(config, "duplicated")) {
      const controller = new AbortController();
      config.signal = controller.signal;
      this.duplicatedManager.add(config.requestKey!, controller);
    }
  };

  /** 移除重复请求 */
  protected removeDuplicated = (config: InternalRequestConfig) => {
    if (this.isEnabled(config, "duplicated")) {
      // 响应完成，移除重复请求
      this.duplicatedManager.remove(config.requestKey!);
    }
  };

  /** 设置缓存 */
  protected setCache = async (config: InternalRequestConfig, data: any) => {
    if (this.canCache(config)) {
      // 缓存，必须放到最后，否则会影响脱敏和解密
      this.cacheManager.set(
        config.requestKey!,
        data,
        handleBooleanToConfig(config.cache)
      );
    }
  };
  /** 获取缓存 */
  protected getCache = async (config: InternalRequestConfig) => {
    if (this.canCache(config)) {
      const cache = this.cacheManager.get(config.requestKey!);
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
  };

  /** 加密 */
  protected encrypt = (config: InternalRequestConfig) => {
    if (this.isEnabled(config, "crypto")) {
      config.data = this.cryptoManager.encrypt(
        config.data,
        handleBooleanToConfig(config.crypto)
      );
      // 加密后关闭加密，避免重复加密
      config.crypto = false;
    }
  };

  /** 重试 */
  protected retry = async (
    error: AxiosError,
    config: InternalRequestConfig,
    instance: RequestInstance
  ) => {
    if (this.isEnabled(config, "retry")) {
      return this.retryManager.handleRetry(error, config, instance);
    }
  };

  /** 更新全局配置 */
  // 定义一个公共方法 updateManagerConfig，用于更新默认配置
  public updateManagerConfig(config: Partial<RequestConfig>): void {
    this.defaultConfig = config;
    typeof config.retry === "object" &&
      this.retryManager.updateConfig(config.retry);
    typeof config.crypto === "object" &&
      this.cryptoManager.updateConfig(config.crypto);
    typeof config.sensitive === "object" &&
      this.sensitiveManager.updateConfig(config.sensitive);
    typeof config.cache === "object" &&
      this.cacheManager.updateConfig(config.cache);
    typeof config.loading === "object" &&
      this.loadingManager.updateConfig(config.loading);
  }
}

export default class TuxinRequest extends TuxinRequestManager {
  public instance: RequestInstance;
  /** 第一个执行的请求拦截器ID */
  private firstInterceptorId: number | undefined;

  constructor(config: RequestConfigWithoutCache) {
    super({ ...DEFAULT_MANAGER_CONFIG, ...config });
    this.instance = axios.create(config) as RequestInstance;

    this.initInterceptors();
  }

  /** 初始化拦截器 */
  initInterceptors() {
    // 请求加密拦截
    this.instance.interceptors.request.use((config) => {
      this.encrypt(config);
      return config;
    });
    // 响应默认拦截
    this.instance.interceptors.response.use(
      this.responseSuccessHandler,
      this.responseErrorHandler
    );

    // 重写请求拦截器，确保最先执行的拦截器永远在最后
    const originalRequestUse = this.instance.interceptors.request.use.bind(
      this.instance.interceptors.request
    );

    this.instance.interceptors.request.use = (...args) => {
      // 移除之前最先执行的拦截器
      if (this.firstInterceptorId !== undefined) {
        this.instance.interceptors.request.eject(this.firstInterceptorId);
      }

      const interceptorId = originalRequestUse(...args);

      // 最先执行的拦截器永远在最后
      this.firstInterceptorId = originalRequestUse(
        this.requestHandler,
        this.requestErrorHandler
      );

      return interceptorId;
    };
  }

  protected onFinish = async (config: InternalRequestConfig) => {
    if (!config) {
      this.loadingManager.clear();
      return;
    }
    this.stopLoading(config);
    this.removeDuplicated(config);
  };

  /** 请求拦截器 */
  protected requestHandler = async (config: InternalRequestConfig) => {
    config.requestKey = this.generateRequestKey(config);

    const configWithCache = await this.getCache(config);
    if (configWithCache) return configWithCache;

    this.addDuplicated(config);

    this.startLoading(config);

    return config;
  };

  /** 请求错误拦截器 */
  protected requestErrorHandler = (error: any) => {
    const { config } = error;
    this.onFinish(config);

    // 默认请求错误处理
    throw error;
  };

  /** 响应成功拦截器 */
  protected responseSuccessHandler = (response: AxiosResponse) => {
    const config = response.config as InternalRequestConfig;
    this.onFinish(config);
    this.desensitize(response, config);
    this.setCache(config, response);

    // 默认响应成功处理
    return response;
  };

  /** 响应错误拦截器 */
  protected responseErrorHandler = async (error: AxiosError) => {
    const config = error.config as InternalRequestConfig & {
      signal: any;
    };

    const isCanceled =
      error.name === "CanceledError" && error.message === "canceled";
    // 如果是请求被取消
    if (isCanceled) {
      this.stopLoading(config);
      if (config.signal?.cacheData) {
        // 返回缓存数据
        return config.signal.cacheData;
      }
      // 直接抛出错误，让 try-catch 捕获
      throw error;
    }

    const isEncryptError = error.message.includes(ERROR_MESSAGE_KEY.ENCRYPT);
    const isTimeoutError =
      error.code === "ECONNABORTED" || error.message.includes("timeout");

    // 如果是加密错误或超时错误，直接抛出，不进行重试
    if (!isEncryptError && !isTimeoutError) {
      const retryResult = await this.retry(error, config, this.instance);
      if (retryResult) {
        this.onFinish(config);
        return retryResult;
      }
    }

    this.onFinish(config);

    // 默认错误处理
    throw error;
  };

  /**
   * 生成请求的唯一标识
   */
  public generateRequestKey(config: InternalRequestConfig): string {
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
