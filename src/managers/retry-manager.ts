import { InternalRequestConfig, RetryConfig as Config } from "@/types";
import BaseManager from "./base-manager";
import { RequestInstance } from "@/core";

export class RetryManager extends BaseManager<Config> {
  constructor(config?: Config) {
    super({ count: 3, delay: 500 }, config);
  }

  /**
   * 处理重试
   * @param error 错误信息
   * @param config 请求配置
   * @param instance axios实例
   */
  public async handleRetry(
    error: any,
    config: InternalRequestConfig,
    instance: RequestInstance
  ): Promise<any> {
    const retry = this.mergeConfig(
      typeof config.retry === "boolean" ? undefined : config.retry
    );
    if (typeof retry.count === "number") {
      config.retryCount = config.retryCount || 0;
      if (config.retryCount < retry.count) {
        const result = await retry.beforeRetry?.(error, config.retryCount);
        // 如果 beforeRetry 返回 false，则不进行重试
        if (result === false) return false;
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
