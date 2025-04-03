import {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig as AxiosInternalRequestConfig,
} from "axios";

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type RequestConfig<T = any> = Prettify<
  AxiosRequestConfig & {
    /** 请求失败后的重试次数，默认 3 次 */
    retry?: RetryConfig;
    /** 当前重试次数（内部使用） */
    retryCount?: number;
    /** 加密配置 */
    crypto?: CryptoConfig;
    /** 脱敏配置 */
    sensitive?: SensitiveConfig;
    /** 是否启用请求缓存，默认 true */
    cache?: CacheConfig;
    /** 是否显示loading，默认 true */
    loading?: LoadingConfig;
    duplicated?: DuplicatedConfig;
    /** 响应错误处理 */
    responseErrorHandler?: (errorResponse: AxiosResponse) => Promise<any>;
    /** 响应成功处理 */
    responseSuccessHandler?: (response: AxiosResponse) => Promise<T>;
    /** 请求处理 */
    requestHandler?: (config: InternalAxiosRequestConfig) => Promise<any>;
    /** 请求错误处理 */
    requestErrorHandler?: (error: any) => Promise<any>;
  }
>;

export type RequestConfigWithoutCache<T = any> = Omit<
  RequestConfig<T>,
  "cache"
>;

export type InternalAxiosRequestConfig<T = any> = AxiosInternalRequestConfig &
  RequestConfig<T>;

/** 脱敏规则 */
export type SensitiveRule =
  | {
      /** 字段路径，支持点号分隔的路径，如 'user.phone' */
      path: string;
      /** 脱敏类型 */
      type: "phone" | "email" | "idCard" | "bankCard" | "name" | "address";
      custom: never;
    }
  | {
      path: string;
      /** 自定义脱敏函数 */
      custom: (value: any) => any;
      type: never;
    };

/** 脱敏配置 */
export type SensitiveConfig =
  | {
      /** 脱敏规则列表 */
      rules?: SensitiveRule[];
    }
  | boolean;

export type RetryConfig =
  | {
      count?: number;
      delay?: number;
      /** 重试前回调 */
      beforeRetry?: (error: any, retryCount: number) => Promise<any>;
    }
  | boolean;

export type EncryptAlgorithm = "AES" | "DES" | "RC4";

export type CryptoConfig =
  | {
      /** 加密字段，为空时加密所有字段 */
      fields?: string[];
      /** 加密算法 */
      algorithm?: EncryptAlgorithm;
      /** 密钥 */
      key?: string;
      /** 加密模式 */
      mode?: (typeof CryptoJS.mode)[keyof typeof CryptoJS.mode];
      /** 填充方式 */
      padding?: (typeof CryptoJS.pad)[keyof typeof CryptoJS.pad];
    }
  | boolean;

export interface CacheItem<T> {
  data: T;
  timeout: NodeJS.Timeout;
}

export type CacheConfig =
  | {
      cacheTime?: number;
    }
  | boolean;

export type DuplicatedConfig = boolean;

export type LoadingTarget = string | HTMLElement;
export type LoadingConfig =
  | {
      target?: LoadingTarget;
      loadingText?: string;
    }
  | boolean;
