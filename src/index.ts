import { fetchEventSource } from '@microsoft/fetch-event-source';

/**
 * SSE 响应数据类型定义
 */
interface SSEResponse {
  type: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * 从 SSE 流中提取 answer 类型的 content
 * 建立长连接，遇到 type=answer 时立即返回响应
 * @param url - 请求的 URL
 * @param postData - POST 请求的数据
 * @returns 返回 answer 类型数据的 content 字段
 * @throws {Error} 当请求失败、响应体为空或未找到 answer 类型响应时抛出错误
 */
export const askOxygent = async (
  url: string,
  postData: Record<string, unknown>,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let foundAnswer = false;
    const controller = new AbortController();

    fetchEventSource(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
      signal: controller.signal,
      async onopen(response) {
        if (!response.ok) {
          const statusText = response.statusText || '未知错误';
          reject(
            new Error(
              `请求失败：${response.status} ${statusText}。URL: ${url}`,
            ),
          );
          controller.abort();
        }
      },
      onmessage(event) {
        try {
          const jsonData = JSON.parse(event.data) as SSEResponse;
          if (jsonData.type === 'answer' && jsonData.content) {
            foundAnswer = true;
            // 找到答案后立即中止连接
            controller.abort();
            resolve(jsonData.content);
          }
        } catch {
          // 忽略 JSON 解析错误，继续处理下一个消息
        }
      },
      onerror(error) {
        // 只有在未找到答案时才拒绝 Promise
        if (!foundAnswer) {
          reject(
            new Error(
              `SSE 连接错误：${error.message || '未知错误'}`,
            ),
          );
        }
        // 如果已经找到答案，停止重试
        throw error;
      },
      onclose() {
        // 连接关闭时，如果还未找到答案，则拒绝 Promise
        if (!foundAnswer) {
          reject(
            new Error('SSE 流已结束，但未找到 type=answer 的响应'),
          );
        }
      },
    }).catch((error) => {
      // 忽略中止错误（当我们找到答案时主动中止）
      if (!foundAnswer && error.name !== 'AbortError') {
        reject(
          error instanceof Error
            ? error
            : new Error(`请求失败：${String(error)}`),
        );
      }
    });
  });
};
