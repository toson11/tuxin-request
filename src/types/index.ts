import type {
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

export type EnabledConfig<T extends Record<string, any>> =
  | ({
      enabled: boolean;
    } & T)
  | boolean;

export type RequestCacheConfig = CacheConfig & {
  /** 校验是否进行缓存, 返回 true 则进行缓存 */
  validateResponse?: <T = any>(response: AxiosResponse<T>) => boolean;
};

export type RequestCustomConfig<T = any> = {
  /** 请求失败后的重试次数，默认 true */
  retry?: EnabledConfig<RetryConfig>;
  /** 加密配置，默认 false */
  crypto?: EnabledConfig<CryptoConfig>;
  /** 是否显示loading，默认 true */
  loading?: EnabledConfig<LoadingConfig>;
  /** 是否启用请求去重，默认 true */
  duplicated?: EnabledConfig<DuplicatedConfig>;
  /** 默认脱敏配置，默认 false */
  sensitive?: EnabledConfig<SensitiveConfig>;
  /** 默认请求缓存配置，默认 false */
  cache?: EnabledConfig<RequestCacheConfig>;
};

export type InternalRequestConfig<T = any> = InternalAxiosRequestConfig &
  Omit<RequestConfig<T>, "cache"> & {
    /** 默认请求缓存配置，默认 false */
    cache?: EnabledConfig<RequestCacheConfig>;
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
export type SensitiveRule = {
  /** 字段路径，支持点号分隔的路径，如 'user.phone' */
  path: string;
} & (
  | {
      /** 脱敏类型 */
      type: "phone" | "email" | "idCard" | "bankCard" | "name" | "address";
      custom?: never;
    }
  | {
      /** 自定义脱敏函数 */
      custom: (value: any) => any;
      type?: never;
    }
);

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
  /** TODO: 缓存策略 */
  // strategy?: "memory" | "localStorage" | "sessionStorage";
  /** TODO: 缓存最大数量 */
  // maxSize?: number;
  /** 缓存时间 */
  cacheTime?: number;
};

export type DuplicatedConfig = {};

export type LoadingTarget = string | HTMLElement;
export type LoadingConfig = {
  target?: LoadingTarget;
  loadingText?: string;
};
