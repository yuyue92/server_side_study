import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/appStore";
import type { RequestConfig, ResponseData } from "../types";
import { keyValueToObject, buildFullUrl } from "../utils/helpers";

// 请求 Hook
export const useRequest = () => {
  const {
    currentRequest,
    setLoading,
    setResponse,
    addToHistory,
    replaceVariables,
    addSSEEvent,
    setSSEConnected,
    clearSSEEvents,
  } = useAppStore();

  // 发送普通 HTTP 请求
  const sendRequest = useCallback(async () => {
    if (!currentRequest.url.trim()) {
      setResponse({
        status: 0,
        statusText: "Error",
        headers: {},
        body: "请输入 URL",
        bodySize: 0,
        duration: 0,
        timestamp: Date.now(),
        error: "URL is required",
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    const startTime = Date.now();

    try {
      // 替换环境变量
      const processedUrl = replaceVariables(currentRequest.url);
      const fullUrl = buildFullUrl(processedUrl, currentRequest.queryParams);

      // 准备请求头
      const headers = keyValueToObject(currentRequest.headers);

      // 准备请求体
      let body: string | undefined;
      if (
        ["POST", "PUT", "PATCH"].includes(currentRequest.method) &&
        currentRequest.bodyType !== "none"
      ) {
        if (currentRequest.bodyType === "json") {
          body = replaceVariables(currentRequest.body);
          headers["Content-Type"] = "application/json";
        } else if (currentRequest.bodyType === "x-www-form-urlencoded") {
          const formBody = currentRequest.formData
            .filter((f) => f.enabled && f.key.trim())
            .map(
              (f) =>
                `${encodeURIComponent(f.key)}=${encodeURIComponent(
                  replaceVariables(f.value)
                )}`
            )
            .join("&");
          body = formBody;
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        } else if (currentRequest.bodyType === "raw") {
          body = replaceVariables(currentRequest.body);
        }
      }

      // 调用 Tauri 命令
      const response = await invoke<ResponseData>("send_http_request", {
        method: currentRequest.method,
        url: fullUrl,
        headers,
        body,
        timeout: currentRequest.timeout,
        followRedirects: currentRequest.followRedirects,
        verifySsl: currentRequest.verifySsl,
      });

      const duration = Date.now() - startTime;
      const finalResponse: ResponseData = {
        ...response,
        duration,
        timestamp: Date.now(),
      };

      setResponse(finalResponse);
      addToHistory(currentRequest, finalResponse);
    } catch (error) {
      const errorResponse: ResponseData = {
        status: 0,
        statusText: "Error",
        headers: {},
        body: String(error),
        bodySize: 0,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        error: String(error),
      };
      setResponse(errorResponse);
    } finally {
      setLoading(false);
    }
  }, [
    currentRequest,
    setLoading,
    setResponse,
    addToHistory,
    replaceVariables,
  ]);

  // 发送 SSE 请求
  const startSSE = useCallback(async () => {
    if (!currentRequest.url.trim()) return;

    setLoading(true);
    clearSSEEvents();
    setSSEConnected(true);

    try {
      const processedUrl = replaceVariables(currentRequest.url);
      const fullUrl = buildFullUrl(processedUrl, currentRequest.queryParams);

      // 使用原生 EventSource
      const eventSource = new EventSource(fullUrl);

      eventSource.onopen = () => {
        setLoading(false);
      };

      eventSource.onmessage = (event) => {
        addSSEEvent({
          data: event.data,
          timestamp: Date.now(),
        });
      };

      eventSource.onerror = () => {
        setSSEConnected(false);
        eventSource.close();
      };

      // 返回关闭函数
      return () => {
        eventSource.close();
        setSSEConnected(false);
      };
    } catch (error) {
      setSSEConnected(false);
      setLoading(false);
      console.error("SSE Error:", error);
    }
  }, [
    currentRequest,
    setLoading,
    clearSSEEvents,
    setSSEConnected,
    addSSEEvent,
    replaceVariables,
  ]);

  // 停止 SSE
  const stopSSE = useCallback(() => {
    setSSEConnected(false);
  }, [setSSEConnected]);

  return {
    sendRequest,
    startSSE,
    stopSSE,
  };
};

// 模拟请求 Hook（用于开发测试）
export const useMockRequest = () => {
  const {
    currentRequest,
    setLoading,
    setResponse,
    addToHistory,
    replaceVariables,
  } = useAppStore();

  const sendMockRequest = useCallback(async () => {
    if (!currentRequest.url.trim()) {
      setResponse({
        status: 0,
        statusText: "Error",
        headers: {},
        body: "请输入 URL",
        bodySize: 0,
        duration: 0,
        timestamp: Date.now(),
        error: "URL is required",
      });
      return;
    }

    setLoading(true);
    setResponse(null);

    const startTime = Date.now();

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    try {
      const processedUrl = replaceVariables(currentRequest.url);
      
      // 模拟响应
      const mockBody = JSON.stringify(
        {
          success: true,
          message: "Mock response",
          method: currentRequest.method,
          url: processedUrl,
          timestamp: new Date().toISOString(),
          data: {
            id: Math.floor(Math.random() * 1000),
            name: "Test Item",
            created_at: new Date().toISOString(),
          },
        },
        null,
        2
      );

      const response: ResponseData = {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "application/json",
          "x-request-id": `req-${Date.now()}`,
          "x-response-time": `${Date.now() - startTime}ms`,
        },
        body: mockBody,
        bodySize: new Blob([mockBody]).size,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };

      setResponse(response);
      addToHistory(currentRequest, response);
    } catch (error) {
      const errorResponse: ResponseData = {
        status: 0,
        statusText: "Error",
        headers: {},
        body: String(error),
        bodySize: 0,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        error: String(error),
      };
      setResponse(errorResponse);
    } finally {
      setLoading(false);
    }
  }, [currentRequest, setLoading, setResponse, addToHistory, replaceVariables]);

  return {
    sendRequest: sendMockRequest,
    startSSE: async () => {},
    stopSSE: () => {},
  };
};
