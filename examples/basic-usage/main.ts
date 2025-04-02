import { TuxinRequest } from "../../src/index";
// import { TuxinRequest } from 'tuxin-request';

// 创建请求实例
const request = new TuxinRequest({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 1500,
  headers: {
    "Content-Type": "application/json",
  },
  loading: true,
});

// 用于显示结果
function showResult(title: string, data: unknown): void {
  const result = document.getElementById("result");
  if (result) {
    result.textContent = `${title}\n${JSON.stringify(data, null, 2)}`;
  }
}

// 获取文章列表
export async function getPosts(
  page: number = 1,
  limit: number = 10
): Promise<void> {
  try {
    const response = await request.get("/posts", {
      loading: true,
      params: {
        _page: page,
        _limit: limit,
      },
    });
    showResult(`获取第 ${page} 页文章列表成功：`, response);
  } catch (error) {
    console.log("🚀 ~ getPosts ~ error:", error);
    showResult("获取文章列表失败：", error);
  }
}

// 获取单个文章（带缓存）
export async function getPostWithCache(id: number): Promise<void> {
  try {
    const response = await request.get(`/posts/${id}`, {
      cache: true,
      cacheTime: 5000,
    });
    showResult("获取文章（带缓存）成功：", response);
  } catch (error) {
    showResult("获取文章失败：", error);
  }
}

// 创建新文章
export async function createPost(): Promise<void> {
  try {
    const response = await request.post("/posts", {
      title: "foo",
      body: "bar",
      userId: 1,
    });
    showResult("创建文章成功：", response);
  } catch (error) {
    showResult("创建文章失败：", error);
  }
}

// 获取用户（带重试）
export async function getUserWithRetry(id: number): Promise<void> {
  try {
    const response = await request.get(`/users/${id}`, {
      retry: 3,
      retryDelay: 1000,
    });
    showResult("获取用户成功：", response);
  } catch (error) {
    showResult("获取用户失败：", error);
  }
}

// 将方法挂载到 window 上
declare global {
  interface Window {
    getPosts: typeof getPosts;
    getPostWithCache: typeof getPostWithCache;
    createPost: typeof createPost;
    getUserWithRetry: typeof getUserWithRetry;
  }
}

window.getPosts = getPosts;
window.getPostWithCache = getPostWithCache;
window.createPost = createPost;
window.getUserWithRetry = getUserWithRetry;
