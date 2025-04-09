import TuxinRequest from "../../src";
// import TuxinRequest from "tuxin-request";

// 创建请求实例
const request = new TuxinRequest({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
  sensitive: {
    rules: [
      {
        path: "email",
        type: "email",
      },
    ],
  },
});

request.instance.interceptors.request.use(
  (config) => {
    // 对请求参数进行处理
    return config;
  },
  (error) => {
    // 对请求错误进行处理
    alert(`请求失败: ${error.message}`);
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
    alert(`请求失败: ${error.message}`);
    return Promise.reject(error);
  }
);

// 用于显示结果
function showResult(title: string, data: unknown): void {
  const result = document.getElementById("result");
  if (result) {
    result.textContent = `${title}\n${JSON.stringify(data, null, 2)}`;
  }
}

// 无loading
export async function getPostsWithoutLoading(): Promise<void> {
  try {
    const response = await request.get("/posts/1", {
      loading: false,
    });
    showResult(`获取文章列表成功：`, response);
  } catch (error) {
    console.log("🚀 ~ getPosts ~ error:", error);
    showResult("获取文章列表失败：", error);
  }
}

// 缓存
export async function getPostWithCache(): Promise<void> {
  try {
    const response = await request.get(`/posts/1`, {
      cache: {
        enabled: true,
        cacheTime: 60000,
      },
    });
    showResult("获取文章（带缓存）成功：", response);
  } catch (error) {
    showResult("获取文章失败：", error);
  }
}

// 重试
export async function getUserWithRetry(): Promise<void> {
  try {
    const response = await request.get(`/posts`, {
      timeout: 400, // 设置比较短的超时时间，方便测试重试
      params: {
        _page: 1,
        _limit: 10,
      },
    });
    showResult("获取用户成功：", response);
  } catch (error) {
    showResult("获取用户失败：", error);
  }
}

// 重复请求
export async function createPostWithDuplicated(): Promise<void> {
  try {
    const response = await request.post(
      "/posts",
      {
        title: "foo",
        body: "bar",
        userId: 1,
      },
      {
        retry: false,
        loading: false,
      }
    );
    showResult("重复请求创建文章成功：", response);
  } catch (error) {
    showResult("重复请求创建文章失败：", error);
  }
}

// 脱敏
export async function getUserWithSensitive(): Promise<void> {
  try {
    const response = await request.get("/users/1", {
      sensitive: {
        enabled: true,
        rules: [
          // @ts-ignore
          {
            path: "phone",
            custom: (value: string) => value.replace(/-/g, ""),
          },
          // @ts-ignore
          { type: "name", path: "name" },
        ],
      },
    });
    showResult("脱敏获取用户成功：", response);
  } catch (error) {
    showResult("脱敏获取用户失败：", error);
  }
}

// 加密
export async function getUserWithCrypto(): Promise<void> {
  try {
    const response = await request.post(
      "/posts",
      {
        title: "foo",
        body: "bar",
        userId: 1,
      },
      {
        crypto: {
          enabled: true,
          fields: ["title", "body"],
        },
      }
    );
    showResult("加密获取用户成功：", response);
  } catch (error) {
    showResult("加密获取用户失败：", error);
  }
}

// 将方法挂载到 window 上
declare global {
  interface Window {
    getPostsWithoutLoading: typeof getPostsWithoutLoading;
    getPostWithCache: typeof getPostWithCache;
    createPostWithDuplicated: typeof createPostWithDuplicated;
    getUserWithRetry: typeof getUserWithRetry;
    getUserWithSensitive: typeof getUserWithSensitive;
    getUserWithCrypto: typeof getUserWithCrypto;
  }
}

window.getPostsWithoutLoading = getPostsWithoutLoading;
window.getPostWithCache = getPostWithCache;
window.createPostWithDuplicated = createPostWithDuplicated;
window.getUserWithRetry = getUserWithRetry;
window.getUserWithSensitive = getUserWithSensitive;
window.getUserWithCrypto = getUserWithCrypto;
