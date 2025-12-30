/**
 * 从 SSE 流中提取 answer 类型的 content
 * 建立长连接，遇到 type=answer 时立即返回响应
 * @param url - 请求的 URL
 * @param postData - POST 请求的数据
 * @returns 返回 answer 类型数据的 content 字段
 */
export const fetchSSEAnswer = async (
  url: string,
  postData: Record<string, unknown>,
): Promise<string> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith(':')) {
        continue;
      }

      if (trimmedLine.startsWith('data: ')) {
        const data = trimmedLine.slice(6);

        try {
          const jsonData = JSON.parse(data);
          if (jsonData.type === 'answer' && jsonData.content) {
            reader.cancel(); // 找到答案后立即关闭连接
            return jsonData.content;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  }

  throw new Error('未找到 answer 类型的响应');
};
