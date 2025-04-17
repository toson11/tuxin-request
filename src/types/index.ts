import type {
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

export type EnabledConfig<T extends Record<string, any>> =
  | ({
      enabled?: boolean;
    } & T)
  | boolean;

export type RequestCacheConfig = CacheConfig & {
  /** 校验是否进行缓存, 返回 true 则进行缓存 */
  validateResponse?: <T = any>(response: AxiosResponse<T>) => boolean;
};

/** 请求自定义配置 */
export type CustomRequestConfig<
  Other extends Record<string, any> = Record<string, any>,
> = {
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
} & Other;

/** 请求配置 */
export type RequestConfig<
  T = any,
  CustomConfig extends Record<string, any> = Record<string, any>,
> = AxiosRequestConfig<T> & CustomRequestConfig<CustomConfig>;

/** 内部请求配置 */
export type InternalRequestConfig<
  T = any,
  CustomConfig extends Record<string, any> = Record<string, any>,
> = InternalAxiosRequestConfig<T> &
  Omit<CustomRequestConfig<CustomConfig>, "cache"> & {
    /** 默认请求缓存配置，默认 false */
    cache?: EnabledConfig<RequestCacheConfig>;
    /** 当前重试次数（内部使用） */
    retryCount?: number;
    /** 请求key */
    requestKey?: string;
  };

/** 请求方法配置（不带缓存配置） */
export type MethodRequestConfigWithoutCache<
  T = any,
  CustomConfig extends Record<string, any> = Record<string, any>,
> = Omit<RequestConfig<T, CustomRequestConfig<CustomConfig>>, "cache">;

/** 请求方法配置 */
export type MethodRequestConfig<
  T = any,
  CustomConfig extends Record<string, any> = Record<string, any>,
> = Omit<RequestConfig<T, CustomRequestConfig<CustomConfig>>, "cache"> & {
  // 不允许设置 maxSize
  cache?: EnabledConfig<Omit<RequestCacheConfig, "maxSize">>;
};

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
  beforeRetry?: (
    error: AxiosError<any>,
    retryCount: number
  ) => Promise<boolean>;
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
  /** 缓存最大数量 */
  maxSize?: number;
  /** 缓存时间 */
  cacheTime?: number;
};

export type DuplicatedConfig = {};

export type LoadingTarget = string | HTMLElement;
export type LoadingConfig = {
  target?: LoadingTarget;
  loadingText?: string;
};
