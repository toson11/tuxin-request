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
