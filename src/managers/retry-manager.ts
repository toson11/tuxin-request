import { handleBooleanToConfig } from "@/core/utils";
import { InternalAxiosRequestConfig, RetryConfig } from "@/types";

type Config = Exclude<RetryConfig, boolean>;
export class RetryManager {
  private globalConfig: Config;

  constructor(config?: Config) {
    this.globalConfig = {
      count: 3,
      delay: 500,
      ...(config || {}),
    };
  }

  /**
   * 更新重试配置
   * @param config 新的重试配置
   */
  public updateConfig(config: Partial<Config>): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }

  /**
   * 处理重试
   * @param error 错误信息
   * @param config 请求配置
   * @param instance axios实例
   */
  public async handleRetry(
    error: any,
    config: InternalAxiosRequestConfig,
    instance: any
  ): Promise<any> {
    const retry = {
      ...this.globalConfig,
      ...handleBooleanToConfig(config?.retry),
    };
    if (typeof retry.count === "number") {
      config.retryCount = config.retryCount || 0;
      if (config.retryCount < retry.count) {
        await retry.beforeRetry?.(error, config.retryCount);
        config.retryCount++;
        const delay = typeof retry.delay === "number" ? retry.delay : 500;
        return new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
          instance(config)
        );
      }
    }
    return null;
  }
}
