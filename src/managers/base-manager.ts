import { cloneDeep } from "@/core/utils";

export default class BaseManager<T extends Record<string, any>> {
  protected defaultConfig: T;
  constructor(defaultConfig: T, config?: T) {
    this.defaultConfig = cloneDeep(defaultConfig || ({} as T));
    config && this.updateConfig(config);
  }

  protected mergeConfig(config?: Partial<T>): T {
    if (!config) return this.defaultConfig;
    return {
      ...this.defaultConfig,
      ...config,
    };
  }

  public updateConfig(config: Partial<T>): void {
    this.defaultConfig = this.mergeConfig(config);
  }
}
