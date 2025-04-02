export type LoadingTarget = string | HTMLElement;

export class Loading {
  public el: HTMLElement | null = null;
  public container: HTMLElement;

  constructor(target?: HTMLElement, hasLoadingStyle = false) {
    this.container = target || document.body;
    if (hasLoadingStyle) {
      this.addStyle();
    }
  }

  /**
   * 创建 loading 元素
   */
  private createLoadingEl(): HTMLElement {
    const loadingEl = document.createElement("div");
    loadingEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
    loadingEl.innerHTML = `
        <div style="
          background: white;
          padding: 20px;
          border-radius: 4px;
          text-align: center;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
          "></div>
          <div>加载中...</div>
        </div>
      `;
    return loadingEl;
  }

  /**
   * 添加 loading 样式
   */
  private addStyle() {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 开始 loading
   * @param target loading 的容器
   */
  public start() {
    // 如果容器正在 loading，则不重复创建
    if (this.el || !this.container) {
      return;
    }
    this.el = this.createLoadingEl();
    this.container.append(this.el);
  }

  /**
   * 自动关闭 loading
   * @param target loading 的容器
   */
  public close() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}

type LoadingItem = {
  loading: Loading;
  count: number;
};

class LoadingManager {
  /** 存储所有loading的容器对应的loading实例 */
  private loadingMap: WeakMap<HTMLElement, LoadingItem>;
  /** 存储所有loading的容器 */
  private containers: HTMLElement[] = [];
  /** 是否已经添加了全局loading样式 */
  private hasLoading = false;

  constructor() {
    this.loadingMap = new WeakMap();
  }

  /**
   * 获取 loading 的容器
   * @param target loading 的容器
   * @returns loading 的容器
   */
  private generateContainer(target?: LoadingTarget) {
    let loadingContainer: HTMLElement | null = null;
    if (target) {
      if (typeof target === "string") {
        loadingContainer = document.querySelector(target);
      } else {
        loadingContainer = target;
      }
    }
    if (!loadingContainer) {
      loadingContainer = document.body;
    }
    return loadingContainer;
  }

  private addContainer(container: HTMLElement, loading: Loading) {
    this.containers.push(container);
    this.loadingMap!.set(container, { loading, count: 1 });
  }

  private removeContainer(container: HTMLElement) {
    this.containers = this.containers.filter((c) => c !== container);
    this.loadingMap!.delete(container);
  }

  private clearContainer() {
    this.containers = [];
    this.loadingMap = new WeakMap();
  }

  /**
   * 添加 loading
   * @param target loading 的容器
   */
  public add(target: LoadingTarget = "body") {
    // 创建loading，如果hasLoading为true，表示已经添加了loading样式，无需重复添加
    const loading = new Loading(
      this.generateContainer(target),
      !this.hasLoading
    );
    this.hasLoading = true;
    const loadingItem = this.loadingMap.get(loading.container);
    if (loadingItem) {
      loadingItem.count++;
      return;
    }
    this.addContainer(loading.container, loading);
    loading.start();
    debugger;
  }

  /**
   * 移除 loading
   * @param target loading 的容器
   */
  public remove(_target?: LoadingTarget) {
    const container = this.generateContainer(_target);
    const loadingItem = this.loadingMap?.get(container);
    if (loadingItem) {
      loadingItem.count--;
      if (loadingItem.count <= 0) {
        loadingItem.loading.close();
        this.removeContainer(container);
      }
    }
    debugger;
  }

  /**
   * 清除所有 loading
   */
  public clear() {
    if (!this.loadingMap) {
      return;
    }
    this.containers.forEach((container) => {
      const loadingItem = this.loadingMap!.get(container);
      if (loadingItem) {
        loadingItem.loading.close();
      }
    });
    this.clearContainer();
  }
}

export default LoadingManager;
