import { LoadingConfig, RetryConfig, TuxinRequest } from "../../src";
// import { TuxinRequest } from "tuxin-request";

// 创建请求实例
const request = new TuxinRequest({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 1500,
  headers: {
    "Content-Type": "application/json",
  },
});

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
    const response = await request.get("/posts", {
      loading: false,
      params: {
        _page: 1,
        _limit: 5,
      },
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
        cacheTime: 5000,
      },
    });
    showResult("获取文章（带缓存）成功：", response);
  } catch (error) {
    showResult("获取文章失败：", error);
  }
}

// 无重试
export async function getUserWithoutRetry(): Promise<void> {
  try {
    const response = await request.get(`/users/1`, {
      retry: false,
    });
    showResult("获取用户成功：", response);
  } catch (error) {
    showResult("获取用户失败：", error);
  }
}

// 脱敏
export async function getUserWithSensitive(): Promise<void> {
  try {
    const response = await request.get("/users/1", {
      retry: false,
      sensitive: true,
    });
    showResult("获取用户脱敏成功：", response);
  } catch (error) {
    showResult("获取用户失败：", error);
  }
}

// 加密
export async function getUserWithCrypto(): Promise<void> {
  try {
    const response = await request.get("/users/1", {
      crypto: true,
    });
    showResult("获取用户加密成功：", response);
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
    showResult("创建文章成功：", response);
  } catch (error) {
    showResult("创建文章失败：", error);
  }
}

// 将方法挂载到 window 上
declare global {
  interface Window {
    getPostsWithoutLoading: typeof getPostsWithoutLoading;
    getPostWithCache: typeof getPostWithCache;
    createPostWithDuplicated: typeof createPostWithDuplicated;
    getUserWithoutRetry: typeof getUserWithoutRetry;
    getUserWithSensitive: typeof getUserWithSensitive;
    getUserWithCrypto: typeof getUserWithCrypto;
  }
}

window.getPostsWithoutLoading = getPostsWithoutLoading;
window.getPostWithCache = getPostWithCache;
window.createPostWithDuplicated = createPostWithDuplicated;
window.getUserWithoutRetry = getUserWithoutRetry;
window.getUserWithSensitive = getUserWithSensitive;
window.getUserWithCrypto = getUserWithCrypto;
