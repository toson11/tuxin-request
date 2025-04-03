# Tuxin Request

一个基于 axios 的 TypeScript 请求封装库，提供了更强大的功能和更好的类型支持。

## 特性

- 完整的 TypeScript 支持
- 请求重试
- 请求缓存
- 请求参数加密
- 响应数据脱敏
- 重复请求拦截
- 请求加载动画

## 安装

```bash
npm install tuxin-request
# 或
yarn add tuxin-request
```

## 使用

### 基础使用（待完善）

```typescript
// 代码示例
```

### 高级配置（待完善）

```typescript
// 代码示例
```

## API

### 配置选项（待完善）

| 参数       | 类型    | 描述                 |
| ---------- | ------- | -------------------- |
| baseURL    | string  | 基础 URL             |
| timeout    | number  | 超时时间（毫秒）     |
| headers    | object  | 请求头               |
| retry      | number  | 失败重试次数         |
| retryDelay | number  | 重试延迟时间（毫秒） |
| cache      | boolean | 是否启用缓存         |
| cacheTime  | number  | 缓存时间（毫秒）     |

### 方法

- `get<T>(url: string, config?: RequestConfig): Promise<T>`
- `post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>`
- `put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>`
- `delete<T>(url: string, config?: RequestConfig): Promise<T>`

## 许可证

MIT

## 待办事项

- [ ] 完善文档
- [ ] 完善单元测试
- [ ] 支持更多功能
