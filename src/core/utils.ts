export const isObject = (value: any): boolean => {
  return typeof value === "object" && value !== null;
};

export const handleBooleanToConfig = (
  config?: Record<string, any> | boolean
) => {
  if (typeof config === "object") return config;
  return {};
};

export const getValueByPath = (obj: any, path: string) => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
};

/**
 * 设置对象指定路径的值
 */
export const setValueByPath = (obj: any, path: string, value: any): void => {
  const parts = path.split(".");
  const last = parts.pop()!;
  const target = parts.reduce((acc, part) => {
    if (!(part in acc)) {
      acc[part] = {};
    }
    return acc[part];
  }, obj);
  target[last] = value;
};

export const cloneDeep = <T>(obj: T, cache = new WeakMap()): T => {
  if (typeof obj !== "object" || obj === null) return obj;

  // 如果已经克隆过这个对象，直接返回缓存的结果
  if (cache.has(obj)) return cache.get(obj);

  const result: Record<string, any> = Array.isArray(obj) ? [] : {};
  // 缓存当前对象
  cache.set(obj, result);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = cloneDeep(obj[key], cache);
    }
  }
  return result as T;
};
