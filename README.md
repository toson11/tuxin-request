# Tuxin Request

一个基于 axios 的 TypeScript 请求封装库，提供了更强大的功能和更好的类型支持。

## 特性

- 完整的 TypeScript 支持
- 请求错误重试
- 请求结果缓存
- 请求参数加密
- 响应数据脱敏
- 重复请求拦截
- 自带请求加载动画，支持自定义样式
- 保留 axios 的所有功能

## 安装

本仓库依赖于 axios crypto-js 依赖

```bash
npm install @tuxinlab/request axios crypto-js
# 或
yarn add @tuxinlab/request axios crypto-js
```

## 使用

### 基础使用

```typescript
import TuxinRequest from "@tuxinlab/request";

// 创建请求实例
const request = new TuxinRequest({
  baseURL: "https://api.example.com",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  // 全局启用请求错误重试，非必须（默认为 true，使用对象值可自定义配置）
  retry: true,
  // 全局启用请求加载动画，非必须（默认为 true，使用对象值可自定义配置）
  loading: true,
  // 全局启用重复请求拦截，非必须（默认为 true，使用对象值可自定义配置）
  duplicated: true,
  // 全局启用请求参数加密，非必须（默认为 false，使用对象值可自定义配置）
  crypto: false,
  // 全局配置脱敏规则，非必须
  sensitive: {
    rules: [
      // 使用自带的脱敏规则
      { path: "user.name", type: "name" },
      // 自定义脱敏规则
      { path: "user.phone", custom: (value) => `+86${value}` },
    ],
  },
  // 全局缓存配置，非必须（使用默认配置）
  cache: {
    maxSize: 5, // 最多缓存5个请求结果
    cacheTime: 60000, // 缓存时间（毫秒）
  },
});

// 基本请求方法
// GET 请求
async function fetchData() {
  try {
    const data = await request.get("/users");
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// POST 请求
async function createUser() {
  try {
    const data = await request.post("/users", {
      name: "张三",
      age: 30,
    });
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// 添加拦截器
request.instance.interceptors.request.use(
  (config) => {
    // 对请求参数进行处理
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

request.instance.interceptors.response.use(
  (response) => {
    // 对响应数据进行处理
    return response;
  },
  (error) => {
    // 对响应错误进行处理
    return Promise.reject(error);
  }
);
```

### 高级配置

#### 请求重试

```typescript
// 自定义全局重试配置
const request = new TuxinRequest({
  baseURL: "https://api.example.com",
  retry: {
    enabled: true,
    count: 3, // 重试次数
    delay: 1000, // 重试延迟时间（毫秒）
  },
});

// 单个请求重试配置
async function getUserWithRetry() {
  try {
    const data = await request.get("/users/1", {
      retry: {
        enabled: true,
        count: 5,
        delay: 2000,
        beforeRetry: async (error, retryCount) => {
          console.log(`第${retryCount}次重试`, error);
          // 返回 false 则不进行重试
          // return false;
        },
      },
    });
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// 禁用重试
const data = await request.get("/users/1", { retry: false });
```

#### 请求缓存

```typescript
// 启用缓存
const data = await request.get("/users/1", {
  cache: {
    enabled: true,
    cacheTime: 60000, // 缓存时间（毫秒）
    validateResponse: (response) => {
      // 根据响应判断是否进行缓存，返回 true 才缓存
      return true;
    },
  },
});

// 简单启用缓存（使用默认缓存时间）
const data = await request.get("/users/1", { cache: true });
```

#### 请求加载动画

```typescript
// 全局自定义加载动画配置
const request = new TuxinRequest({
  baseURL: "https://api.example.com",
  loading: {
    enabled: true,
    target: "#loading-container", // 加载动画显示的目标元素
    loadingText: "加载中...", // 加载文本
  },
});

// 单个请求加载动画配置
const data = await request.get("/users/1", {
  loading: {
    enabled: true,
    target: document.querySelector(".loading-area"),
  },
});

// 简单禁用加载动画
const data = await request.get("/users/1", { loading: false });
```

#### 请求参数加密

```typescript
// 全局配置加密
const request = new TuxinRequest({
  baseURL: "https://api.example.com",
  crypto: {
    enabled: true,
    algorithm: "AES", // 加密算法: 'AES', 'DES', 'RC4'
    key: "your-secret-key",
    fields: ["password", "token"], // 需要加密的字段
  },
});

// 单个请求配置加密
const data = await request.post(
  "/login",
  {
    username: "admin",
    password: "123456",
  },
  {
    crypto: {
      enabled: true,
      fields: ["password"],
    },
  }
);

// 简单启用加密（使用默认配置）
const data = await request.post(
  "/login",
  { username: "admin", password: "123456" },
  { crypto: true }
);
```

#### 响应数据脱敏

```typescript
// 全局配置脱敏
const request = new TuxinRequest({
  baseURL: "https://api.example.com",
  sensitive: {
    enabled: true,
    rules: [
      {
        path: "email",
        type: "email",
      },
      {
        path: "phone",
        type: "phone",
      },
    ],
  },
});

// 单个请求配置脱敏
const data = await request.get("/users/1", {
  sensitive: {
    enabled: true,
    rules: [
      { path: "idCard", type: "idCard" },
      { path: "name", type: "name" },
      {
        path: "customField",
        custom: (value) => value.replace(/\d/g, "*"), // 自定义脱敏函数
      },
    ],
  },
});
```

#### 重复请求拦截

```typescript
// 默认已启用重复请求拦截，同一时刻相同的请求只会发送一次

// 禁用重复请求拦截
const data = await request.post("/users", userData, { duplicated: false });
```

## 许可证

MIT

## 待办事项

- [ ] 自定义loading样式
- [ ] 支持更多功能
