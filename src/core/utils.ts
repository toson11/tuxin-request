export const isObject = (value: any): boolean => {
  return typeof value === "object" && value !== null;
};

export const handleBooleanToConfig = (
  config?: Record<string, any> | boolean
) => {
  if (typeof config === "object") return config;
  return {};
};
