import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  RequestConfig,
  ResponseData,
  SSEEvent,
  HistoryItem,
  Collection,
  Environment,
  KeyValuePair,
} from "../types";

// 生成唯一 ID
export const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// 创建空的键值对
export const createEmptyKeyValue = (): KeyValuePair => ({
  id: generateId(),
  key: "",
  value: "",
  enabled: true,
});

// 默认请求配置
const defaultRequest: RequestConfig = {
  id: generateId(),
  name: "New Request",
  method: "GET",
  url: "",
  headers: [createEmptyKeyValue()],
  queryParams: [createEmptyKeyValue()],
  bodyType: "none",
  body: "",
  formData: [createEmptyKeyValue()],
  timeout: 30000,
  followRedirects: true,
  verifySsl: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

interface AppStore extends AppState {
  // 请求操作
  setCurrentRequest: (request: Partial<RequestConfig>) => void;
  resetRequest: () => void;

  // 响应操作
  setResponse: (response: ResponseData | null) => void;
  clearResponse: () => void;

  // 加载状态
  setLoading: (loading: boolean) => void;

  // SSE 操作
  addSSEEvent: (event: SSEEvent) => void;
  clearSSEEvents: () => void;
  setSSEConnected: (connected: boolean) => void;

  // 历史记录操作
  addToHistory: (request: RequestConfig, response: ResponseData) => void;
  clearHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  loadFromHistory: (item: HistoryItem) => void;

  // 集合操作
  addCollection: (name: string, description?: string) => void;
  deleteCollection: (id: string) => void;
  addRequestToCollection: (collectionId: string, request: RequestConfig) => void;
  removeRequestFromCollection: (collectionId: string, requestId: string) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;

  // 环境变量操作
  addEnvironment: (name: string) => void;
  deleteEnvironment: (id: string) => void;
  updateEnvironment: (id: string, updates: Partial<Environment>) => void;
  setActiveEnvironment: (id: string | null) => void;

  // UI 操作
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: "history" | "collections" | "environments") => void;

  // 变量替换
  replaceVariables: (text: string) => string;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentRequest: { ...defaultRequest },
      currentResponse: null,
      isLoading: false,
      sseEvents: [],
      isSSEConnected: false,
      history: [],
      collections: [],
      environments: [],
      activeEnvironmentId: null,
      sidebarOpen: true,
      sidebarTab: "history",

      // 请求操作
      setCurrentRequest: (request) =>
        set((state) => ({
          currentRequest: {
            ...state.currentRequest,
            ...request,
            updatedAt: Date.now(),
          },
        })),

      resetRequest: () =>
        set({
          currentRequest: { ...defaultRequest, id: generateId() },
          currentResponse: null,
          sseEvents: [],
        }),

      // 响应操作
      setResponse: (response) => set({ currentResponse: response }),
      clearResponse: () => set({ currentResponse: null }),

      // 加载状态
      setLoading: (loading) => set({ isLoading: loading }),

      // SSE 操作
      addSSEEvent: (event) =>
        set((state) => ({
          sseEvents: [...state.sseEvents, event],
        })),

      clearSSEEvents: () => set({ sseEvents: [] }),

      setSSEConnected: (connected) => set({ isSSEConnected: connected }),

      // 历史记录操作
      addToHistory: (request, response) =>
        set((state) => ({
          history: [
            {
              id: generateId(),
              request: { ...request },
              response: { ...response },
              timestamp: Date.now(),
            },
            ...state.history.slice(0, 99), // 保留最近 100 条
          ],
        })),

      clearHistory: () => set({ history: [] }),

      deleteHistoryItem: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),

      loadFromHistory: (item) =>
        set({
          currentRequest: { ...item.request, id: generateId() },
          currentResponse: item.response,
        }),

      // 集合操作
      addCollection: (name, description) =>
        set((state) => ({
          collections: [
            ...state.collections,
            {
              id: generateId(),
              name,
              description,
              requests: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        })),

      deleteCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        })),

      addRequestToCollection: (collectionId, request) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  requests: [...c.requests, { ...request, id: generateId() }],
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      removeRequestFromCollection: (collectionId, requestId) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  requests: c.requests.filter((r) => r.id !== requestId),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })),

      updateCollection: (id, updates) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          ),
        })),

      // 环境变量操作
      addEnvironment: (name) =>
        set((state) => ({
          environments: [
            ...state.environments,
            {
              id: generateId(),
              name,
              variables: [createEmptyKeyValue()],
              isActive: false,
            },
          ],
        })),

      deleteEnvironment: (id) =>
        set((state) => ({
          environments: state.environments.filter((e) => e.id !== id),
          activeEnvironmentId:
            state.activeEnvironmentId === id
              ? null
              : state.activeEnvironmentId,
        })),

      updateEnvironment: (id, updates) =>
        set((state) => ({
          environments: state.environments.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),

      setActiveEnvironment: (id) =>
        set((state) => ({
          activeEnvironmentId: id,
          environments: state.environments.map((e) => ({
            ...e,
            isActive: e.id === id,
          })),
        })),

      // UI 操作
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),

      // 变量替换
      replaceVariables: (text) => {
        const state = get();
        const activeEnv = state.environments.find(
          (e) => e.id === state.activeEnvironmentId
        );

        if (!activeEnv) return text;

        let result = text;
        activeEnv.variables.forEach((v) => {
          if (v.enabled && v.key) {
            const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
            result = result.replace(regex, v.value);
          }
        });

        return result;
      },
    }),
    {
      name: "api-debugger-storage",
      partialize: (state) => ({
        history: state.history,
        collections: state.collections,
        environments: state.environments,
        activeEnvironmentId: state.activeEnvironmentId,
      }),
    }
  )
);
