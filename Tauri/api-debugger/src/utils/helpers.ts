import type { HttpMethod, RequestConfig, KeyValuePair } from "../types";

// HTTP 方法颜色映射
export const methodColors: Record<HttpMethod, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  DELETE: "text-method-delete",
  PATCH: "text-method-patch",
  HEAD: "text-method-head",
  OPTIONS: "text-method-options",
};

// HTTP 方法背景色映射
export const methodBgColors: Record<HttpMethod, string> = {
  GET: "bg-method-get/20 border-method-get/40",
  POST: "bg-method-post/20 border-method-post/40",
  PUT: "bg-method-put/20 border-method-put/40",
  DELETE: "bg-method-delete/20 border-method-delete/40",
  PATCH: "bg-method-patch/20 border-method-patch/40",
  HEAD: "bg-method-head/20 border-method-head/40",
  OPTIONS: "bg-method-options/20 border-method-options/40",
};

// 状态码颜色
export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return "text-accent-green";
  if (status >= 300 && status < 400) return "text-accent-blue";
  if (status >= 400 && status < 500) return "text-accent-orange";
  if (status >= 500) return "text-accent-red";
  return "text-text-secondary";
};

// 状态码背景色
export const getStatusBgColor = (status: number): string => {
  if (status >= 200 && status < 300)
    return "bg-accent-green/10 border-accent-green/30";
  if (status >= 300 && status < 400)
    return "bg-accent-blue/10 border-accent-blue/30";
  if (status >= 400 && status < 500)
    return "bg-accent-orange/10 border-accent-orange/30";
  if (status >= 500) return "bg-accent-red/10 border-accent-red/30";
  return "bg-bg-tertiary border-border-primary";
};

// 格式化字节大小
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 格式化持续时间
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

// 格式化时间戳
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 尝试解析 JSON
export const tryParseJson = (str: string): object | null => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

// 格式化 JSON
export const formatJson = (str: string): string => {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
};

// 将键值对转换为对象
export const keyValueToObject = (
  items: KeyValuePair[]
): Record<string, string> => {
  return items
    .filter((item) => item.enabled && item.key.trim())
    .reduce(
      (acc, item) => {
        acc[item.key] = item.value;
        return acc;
      },
      {} as Record<string, string>
    );
};

// 将对象转换为键值对
export const objectToKeyValue = (obj: Record<string, string>): KeyValuePair[] => {
  return Object.entries(obj).map(([key, value]) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    key,
    value,
    enabled: true,
  }));
};

// 构建完整 URL（包含 query 参数）
export const buildFullUrl = (
  baseUrl: string,
  queryParams: KeyValuePair[]
): string => {
  const enabledParams = queryParams.filter(
    (p) => p.enabled && p.key.trim()
  );

  if (enabledParams.length === 0) return baseUrl;

  const url = new URL(baseUrl.startsWith("http") ? baseUrl : `http://${baseUrl}`);
  enabledParams.forEach((param) => {
    url.searchParams.append(param.key, param.value);
  });

  return url.toString();
};

// 生成 cURL 命令
export const generateCurl = (request: RequestConfig): string => {
  const parts: string[] = ["curl"];

  // 方法
  if (request.method !== "GET") {
    parts.push(`-X ${request.method}`);
  }

  // URL
  const url = buildFullUrl(request.url, request.queryParams);
  parts.push(`'${url}'`);

  // Headers
  request.headers
    .filter((h) => h.enabled && h.key.trim())
    .forEach((header) => {
      parts.push(`-H '${header.key}: ${header.value}'`);
    });

  // Body
  if (
    request.bodyType === "json" &&
    request.body &&
    ["POST", "PUT", "PATCH"].includes(request.method)
  ) {
    parts.push("-H 'Content-Type: application/json'");
    parts.push(`-d '${request.body.replace(/'/g, "'\\''")}'`);
  } else if (
    request.bodyType === "x-www-form-urlencoded" &&
    request.formData.length > 0
  ) {
    const formBody = request.formData
      .filter((f) => f.enabled && f.key.trim())
      .map((f) => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
      .join("&");
    parts.push(`-d '${formBody}'`);
  }

  // 其他选项
  if (!request.verifySsl) {
    parts.push("-k");
  }

  if (request.followRedirects) {
    parts.push("-L");
  }

  return parts.join(" \\\n  ");
};

// 复制到剪贴板
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// 防抖函数
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// 类名合并
export const cn = (...classes: (string | boolean | undefined)[]): string => {
  return classes.filter(Boolean).join(" ");
};
