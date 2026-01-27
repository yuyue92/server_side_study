// HTTP 方法类型
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

// 请求体类型
export type BodyType = "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary";

// 键值对
export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

// 请求配置
export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  bodyType: BodyType;
  body: string;
  formData: KeyValuePair[];
  timeout: number;
  followRedirects: boolean;
  verifySsl: boolean;
  // 加密配置
  encryption?: {
    enabled: boolean;
    algorithm: "aes-256-gcm" | "rsa" | "none";
    key?: string;
  };
  // SSE 配置
  sse?: {
    enabled: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

// 响应数据
export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
  duration: number;
  timestamp: number;
  error?: string;
}

// SSE 事件
export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  timestamp: number;
}

// 历史记录
export interface HistoryItem {
  id: string;
  request: RequestConfig;
  response: ResponseData;
  timestamp: number;
}

// 集合
export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: RequestConfig[];
  createdAt: number;
  updatedAt: number;
}

// 环境变量
export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
  isActive: boolean;
}

// 应用状态
export interface AppState {
  // 当前请求
  currentRequest: RequestConfig;
  // 当前响应
  currentResponse: ResponseData | null;
  // 加载状态
  isLoading: boolean;
  // SSE 事件列表
  sseEvents: SSEEvent[];
  // 是否 SSE 连接中
  isSSEConnected: boolean;
  // 历史记录
  history: HistoryItem[];
  // 集合列表
  collections: Collection[];
  // 环境列表
  environments: Environment[];
  // 当前环境 ID
  activeEnvironmentId: string | null;
  // 侧边栏展开状态
  sidebarOpen: boolean;
  // 当前侧边栏 Tab
  sidebarTab: "history" | "collections" | "environments";
}

// Tauri 命令响应
export interface TauriResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 导出格式
export type ExportFormat = "json" | "curl" | "postman";
