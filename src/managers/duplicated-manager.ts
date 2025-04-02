import { DuplicatedConfig } from "@/types";

type Config = Exclude<DuplicatedConfig, boolean>;
export class DuplicatedManager {
  private globalConfig: Exclude<Config, boolean>;
  /** 存储pending的请求 */
  private pendingRequests: Map<
    string,
    { controller: AbortController; timeout: NodeJS.Timeout }
  > = new Map();

  constructor(config: Config = {}) {
    this.globalConfig = {
      timeout: 5000,
      ...config,
    };
  }

  /**
   * 添加pending请求
   */
  public add(requestKey: string, controller: AbortController): void {
    this.cancel(requestKey);
    this.pendingRequests.set(requestKey, {
      controller,
      timeout: setTimeout(() => {
        this.remove(requestKey);
      }, this.globalConfig.timeout),
    });
  }

  /**
   * 取消请求
   */
  public cancel(requestKey: string): void {
    if (!this.pendingRequests.has(requestKey)) return;
    const { controller, timeout } = this.pendingRequests.get(requestKey)!;
    controller?.abort();
    clearTimeout(timeout);
    this.pendingRequests.delete(requestKey);
  }

  /**
   * 移除请求，适用于请求成功后移除
   */
  public remove(requestKey: string): void {
    this.pendingRequests.delete(requestKey);
  }

  /**
   * 取消所有请求
   */
  public cancelAll(): void {
    this.pendingRequests.forEach(({ controller, timeout }) => {
      controller.abort();
      clearTimeout(timeout);
    });
    this.pendingRequests.clear();
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Config): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
