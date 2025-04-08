import type { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

export type RequestCustomConfig<T = any> = {
  /** 请求失败后的重试次数，默认 3 次 */
  retry?: RetryConfig | boolean;
  /** 加密配置 */
  crypto?: CryptoConfig | boolean;
  /** 是否显示loading，默认 true */
  loading?: LoadingConfig | boolean;
  /** 是否启用请求去重，默认 true */
  duplicated?: DuplicatedConfig;
  /** 默认脱敏配置 */
  sensitive?: SensitiveConfig | boolean;
  /** 默认请求缓存配置 */
  cache?: CacheConfig;
};

export type InternalRequestConfig<T = any> = InternalAxiosRequestConfig &
  Omit<RequestConfig<T>, "cache"> & {
    /** 默认请求缓存配置 */
    cache?: CacheConfig | boolean;
    /** 当前重试次数（内部使用） */
    retryCount?: number;
    /** 请求key */
    requestKey?: string;
  };

export type RequestConfig<T = any> = AxiosRequestConfig<T> &
  RequestCustomConfig<T>;

export type RequestConfigWithoutCache<T = any> = Omit<
  RequestConfig<T>,
  "cache"
>;

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
export type SensitiveConfig = {
  /** 脱敏规则列表 */
  rules?: SensitiveRule[];
};

export type RetryConfig = {
  count?: number;
  delay?: number;
  /** 重试前回调 */
  beforeRetry?: (error: any, retryCount: number) => Promise<any>;
};

export type EncryptAlgorithm = "AES" | "DES" | "RC4";

export type CryptoConfig = {
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
};

export interface CacheItem<T> {
  data: T;
  timeout: NodeJS.Timeout;
}

export type CacheConfig = {
  cacheTime?: number;
};

export type DuplicatedConfig = boolean;

export type LoadingTarget = string | HTMLElement;
export type LoadingConfig = {
  target?: LoadingTarget;
  loadingText?: string;
};
