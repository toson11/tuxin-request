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

const defaultConfig: RequestConfig = {
  retry: true,
  loading: true,
  duplicated: true,
  cache: false,
  sensitive: false,
  crypto: false,
};

export interface RequestInstance extends AxiosInstance {
  get<T = any>(url: string, config?: RequestConfig): Promise<T>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<T>;
}

class CacheHitError extends Error {
  constructor(public data: any) {
    super("Cache hit");
    this.name = "CacheHitError";
  }
}

let originUrl = "";

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
    const { crypto, sensitive, retry, duplicated, loading } = this.globalConfig;
    this.cacheManager = new CacheManager();
    this.loadingManager = new LoadingManager(handleBooleanToConfig(loading));
    this.cryptoManager = new CryptoManager(handleBooleanToConfig(crypto));
    this.sensitiveManager = new SensitiveManager(
      handleBooleanToConfig(sensitive)
    );
    this.retryManager = new RetryManager(handleBooleanToConfig(retry));
    this.duplicatedManager = new DuplicatedManager(
      handleBooleanToConfig(duplicated)
    );

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
    this.duplicatedManager.updateConfig(
      handleBooleanToConfig(config.duplicated)
    );
    this.loadingManager.updateConfig(handleBooleanToConfig(config.loading));
  }

  /** 请求结束回调 */
  protected onFinish = async (
    response: AxiosResponse,
    isSuccess: boolean = false
  ) => {
    const config = this.mergeConfig(response.config);
    if (config.loading) {
      this.loadingManager.remove(handleBooleanToConfig(config.loading));
    }
    if (config.duplicated) {
      const requestKey = this.generateRequestKey(config);
      this.duplicatedManager.remove(requestKey);
    }
    if (isSuccess) {
      if (config.sensitive) {
        // 脱敏
        this.sensitiveManager.desensitize(
          config.data,
          handleBooleanToConfig(config.sensitive)
        );
      }
      if (config.crypto) {
        // 解密
        this.cryptoManager.decrypt(
          config.data,
          handleBooleanToConfig(config.crypto)
        );
      }
      if (canCache(config)) {
        // 缓存，必须放到最后，否则会影响脱敏和解密
        const requestKey = this.generateRequestKey(config);
        this.cacheManager.set(
          requestKey,
          response.data,
          handleBooleanToConfig(config.cache)
        );
      }
    }
  };

  /** 请求拦截器 */
  protected requestHandler = async (_config: InternalAxiosRequestConfig) => {
    const config = this.mergeConfig(_config);

    if (canCache(config)) {
      const requestKey = this.generateRequestKey(config);
      const cache = this.cacheManager.get(requestKey);
      if (cache) {
        debugger;
        // TODO: 为什么不生效
        throw new CacheHitError(cache);
      }
    }

    if (config.duplicated) {
      const requestKey = this.generateRequestKey(config);
      this.duplicatedManager.cancel(requestKey);
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
    if (config.data && config.crypto) {
      config.data = this.cryptoManager.encrypt(config.data);
    }

    // TODO: 测试重试
    if (config.url?.includes("users")) {
      if (
        (config.retryCount || 0)! <
        (handleBooleanToConfig(config.retry)?.count || 3)
      ) {
        // 如果retryCount为0，则记录originUrl
        if (!config.retryCount) originUrl = config.url || "";
        // 请求404接口
        config.url = "/users/1ddd";
      } else {
        // @ts-ignore
        config.url = originUrl;
      }
    }

    return config;
  };

  /** 请求错误拦截器 */
  protected requestErrorHandler = (error: any) => {
    console.log("🚀 ~ TuxinRequest ~ error:", error);
    if (error instanceof CacheHitError) {
      return Promise.resolve(error.data);
    }
    const config = this.mergeConfig(error.config);
    this.onFinish(error);

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
    this.onFinish(response, true);

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
    const retryResult = await this.retryManager.handleRetry(
      error,
      config,
      this.instance
    );

    if (retryResult) {
      this.onFinish(error);
      return retryResult;
    }

    this.onFinish(error);

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
