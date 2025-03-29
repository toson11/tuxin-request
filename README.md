# Tuxin Request

一个基于 axios 的 TypeScript 请求封装库，提供了更强大的功能和更好的类型支持。

## 特性

- 完整的 TypeScript 支持
- 请求重试机制
- 请求缓存
- 统一的错误处理
- 请求/响应拦截器
- Token 自动注入
- 支持自定义配置

## 安装

```bash
npm install tuxin-request
# 或
yarn add tuxin-request
```

## 使用

### 基础使用

```typescript
import request from 'tuxin-request';

// GET 请求
const getData = async () => {
  try {
    const response = await request.get('/api/data');
    console.log(response);
  } catch (error) {
    console.error(error);
  }
};

// POST 请求
const postData = async () => {
  try {
    const response = await request.post('/api/data', {
      name: 'test',
      age: 18
    });
    console.log(response);
  } catch (error) {
    console.error(error);
  }
};
```

### 高级配置

```typescript
import { TuxinRequest } from 'tuxin-request';

const customRequest = new TuxinRequest({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Custom-Header': 'value'
  }
});

// 使用自定义实例
const getData = async () => {
  try {
    const response = await customRequest.get('/api/data', {
      retry: 3,           // 失败重试次数
      retryDelay: 1000,   // 重试延迟时间
      cache: true,        // 启用缓存
      cacheTime: 5000     // 缓存时间（毫秒）
    });
    console.log(response);
  } catch (error) {
    console.error(error);
  }
};
```

## API

### 配置选项

| 参数 | 类型 | 描述 |
|------|------|------|
| baseURL | string | 基础 URL |
| timeout | number | 超时时间（毫秒）|
| headers | object | 请求头 |
| retry | number | 失败重试次数 |
| retryDelay | number | 重试延迟时间（毫秒）|
| cache | boolean | 是否启用缓存 |
| cacheTime | number | 缓存时间（毫秒）|

### 方法

- `get<T>(url: string, config?: RequestConfig): Promise<T>`
- `post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>`
- `put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>`
- `delete<T>(url: string, config?: RequestConfig): Promise<T>`
- `clearCache(): void`

## 许可证

MIT 