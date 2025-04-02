import { DuplicatedConfig } from "@/types";

export class DuplicatedManager {
  private globalConfig: DuplicatedConfig;
  /** 存储pending的请求 */
  private pendingRequests: Map<
    string,
    { controller: AbortController; timeout: NodeJS.Timeout }
  > = new Map();

  constructor(config: DuplicatedConfig = {}) {
    this.globalConfig = {
      timeout: 5000,
      ...config,
    };
  }

  /**
   * 添加pending请求
   */
  public add(requestKey: string, controller: AbortController): void {
    this.pendingRequests.set(requestKey, {
      controller,
      timeout: setTimeout(() => {
        controller.abort();
        this.pendingRequests.delete(requestKey);
      }, this.globalConfig.timeout),
    });
  }

  /**
   * 取消请求
   */
  public cancel(requestKey: string): void {
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
  public updateConfig(config: DuplicatedConfig): void {
    this.globalConfig = {
      ...this.globalConfig,
      ...config,
    };
  }
}
