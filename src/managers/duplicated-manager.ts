export class DuplicatedManager {
  private pendingRequests: Map<string, AbortController> = new Map();

  /**
   * 添加pending请求
   */
  public add(requestKey: string, controller: AbortController): void {
    this.cancel(requestKey);
    this.pendingRequests.set(requestKey, controller);
  }

  /**
   * 取消请求
   */
  public cancel(requestKey: string): boolean {
    if (!this.pendingRequests.has(requestKey)) return false;
    const controller = this.pendingRequests.get(requestKey);

    controller?.abort();
    return this.pendingRequests.delete(requestKey);
  }

  /**
   * 移除请求，适用于请求成功后移除
   */
  public remove(requestKey: string): boolean {
    return this.pendingRequests.delete(requestKey);
  }

  /**
   * 取消所有请求
   */
  public cancelAll(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }
}
