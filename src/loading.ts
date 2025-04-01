export type LoadingTarget = string | HTMLElement

export class Loading {
  public el: HTMLElement | null = null
  public container: HTMLElement
  public id: string

  constructor(target?: LoadingTarget) {
    this.container = this.getContainer(target)
    this.id = `tuxin-loading-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 获取 loading 的容器
   * @param target loading 的容器
   * @returns loading 的容器
   */
  private getContainer(target?: LoadingTarget) {
    let loadingContainer: HTMLElement | null = null
    if (typeof target === 'string') {
      loadingContainer = document.querySelector(target)
    } else if (target) {
      loadingContainer = target
    }
    if(!loadingContainer) {
      loadingContainer = document.body
    }
    return loadingContainer
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
    return loadingEl
  }

  /**
   * 开始 loading
   * @param target loading 的容器
   */
  public start() {
    // 如果容器正在 loading，则不重复创建
    if(this.el || !this.container) {
      return
    }
    this.el = this.createLoadingEl()
    this.container.append(this.el)
  }

  /**
   * 自动关闭 loading
   * @param target loading 的容器
   */
  public close() {
    if(this.el) {
      this.el.remove()
      this.el = null
    }
  }
}

class LoadingManager {
  private loadingMap: Map<LoadingTarget, { loading: Loading, count: number }> = new Map()

  public add(target?: LoadingTarget) {
    const loading = new Loading(target)
    const loadingItem = this.loadingMap.get(loading.container)
    if(loadingItem) {
      loadingItem.count++
      return
    }
    this.loadingMap.set(loading.container, { loading, count: 1 })
    loading.start()
  }

  public remove(_target?: LoadingTarget) {
    const loadingItem = this.loadingMap.get(_target || 'body')
    if(loadingItem) {
      loadingItem.count--
      if(loadingItem.count <= 0) {
        loadingItem.loading.close()
        this.loadingMap.delete(loadingItem.loading.container)
      }
    }
  }

  public clear() {
    this.loadingMap.forEach((loadingItem) => {
      loadingItem.loading.close()
    })
    this.loadingMap.clear()
  }
}

export default LoadingManager