import React, { useState, useMemo } from "react";
import { useAppStore } from "../../stores/appStore";
import { Tabs } from "../common/Tabs";
import {
  CopyIcon,
  DownloadIcon,
  CheckIcon,
} from "../common/Icons";
import {
  formatBytes,
  formatDuration,
  getStatusColor,
  getStatusBgColor,
  tryParseJson,
  formatJson,
  generateCurl,
  copyToClipboard,
} from "../../utils/helpers";

// JSON 语法高亮组件
const JsonHighlight: React.FC<{ json: string }> = ({ json }) => {
  const highlighted = useMemo(() => {
    try {
      const formatted = formatJson(json);
      return formatted
        .replace(
          /"([^"]+)":/g,
          '<span class="text-accent-purple">"$1"</span>:'
        )
        .replace(
          /: "([^"]*)"/g,
          ': <span class="text-accent-green">"$1"</span>'
        )
        .replace(
          /: (\d+)/g,
          ': <span class="text-accent-orange">$1</span>'
        )
        .replace(
          /: (true|false)/g,
          ': <span class="text-accent-blue">$1</span>'
        )
        .replace(
          /: (null)/g,
          ': <span class="text-text-muted">$1</span>'
        );
    } catch {
      return json;
    }
  }, [json]);

  return (
    <pre
      className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
};

export const ResponseViewer: React.FC = () => {
  const { currentRequest, currentResponse, isLoading, sseEvents, isSSEConnected } = useAppStore();
  const [activeTab, setActiveTab] = useState("body");
  const [copied, setCopied] = useState(false);

  const isJson = useMemo(() => {
    if (!currentResponse?.body) return false;
    return tryParseJson(currentResponse.body) !== null;
  }, [currentResponse?.body]);

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCurl = () => {
    const curl = generateCurl(currentRequest);
    handleCopy(curl);
  };

  const handleExportJson = () => {
    if (!currentResponse) return;
    const exportData = {
      request: currentRequest,
      response: currentResponse,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(exportData, null, 2);
    
    // 创建下载
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers", badge: currentResponse ? Object.keys(currentResponse.headers).length : 0 },
    { id: "sse", label: "SSE Events", badge: sseEvents.length },
  ];

  // 空状态
  if (!currentResponse && !isLoading && sseEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-24 h-24 mb-6 rounded-full bg-bg-tertiary flex items-center justify-center">
          <svg
            className="w-12 h-12 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          等待响应
        </h3>
        <p className="text-sm text-text-muted max-w-xs">
          输入 URL 并点击发送按钮，响应结果将显示在这里
        </p>
      </div>
    );
  }

  // 加载状态
  if (isLoading && !isSSEConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-bg-tertiary" />
          <div className="absolute inset-0 rounded-full border-4 border-accent-blue border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-text-secondary animate-pulse">
          正在发送请求...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* 状态栏 */}
      {currentResponse && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-4">
            {/* 状态码 */}
            <div
              className={`px-3 py-1 rounded-md border text-sm font-semibold ${getStatusBgColor(
                currentResponse.status
              )} ${getStatusColor(currentResponse.status)}`}
            >
              {currentResponse.status} {currentResponse.statusText}
            </div>

            {/* 耗时 */}
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              <span>{formatDuration(currentResponse.duration)}</span>
            </div>

            {/* 大小 */}
            <div className="text-sm text-text-secondary">
              {formatBytes(currentResponse.bodySize)}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCurl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary
                         hover:text-text-primary hover:bg-bg-hover rounded-md transition-all"
              title="复制为 cURL"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              <span>cURL</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary
                         hover:text-text-primary hover:bg-bg-hover rounded-md transition-all"
              title="导出 JSON"
            >
              <DownloadIcon size={14} />
              <span>导出</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 内容 */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "body" && currentResponse && (
          <div className="animate-fade-in">
            {currentResponse.error ? (
              <div className="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg">
                <h4 className="text-sm font-medium text-accent-red mb-2">
                  请求错误
                </h4>
                <p className="text-sm text-text-secondary">
                  {currentResponse.error}
                </p>
              </div>
            ) : isJson ? (
              <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-muted uppercase tracking-wider">
                    JSON Response
                  </span>
                  <button
                    onClick={() => handleCopy(formatJson(currentResponse.body))}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    title="复制"
                  >
                    {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
                <JsonHighlight json={currentResponse.body} />
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-muted uppercase tracking-wider">
                    Raw Response
                  </span>
                  <button
                    onClick={() => handleCopy(currentResponse.body)}
                    className="text-text-muted hover:text-text-primary transition-colors"
                    title="复制"
                  >
                    {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
                <pre className="text-sm font-mono whitespace-pre-wrap break-all text-text-primary">
                  {currentResponse.body}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "headers" && currentResponse && (
          <div className="animate-fade-in">
            <div className="bg-bg-secondary rounded-lg border border-border-primary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-primary">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      Header
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(currentResponse.headers).map(([key, value]) => (
                    <tr
                      key={key}
                      className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-2.5 text-accent-purple font-medium">
                        {key}
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary font-mono text-xs">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sse" && (
          <div className="animate-fade-in space-y-2">
            {isSSEConnected && (
              <div className="flex items-center gap-2 px-3 py-2 bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg mb-4">
                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                <span className="text-sm text-accent-cyan">SSE 连接中...</span>
              </div>
            )}
            
            {sseEvents.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <p>暂无 SSE 事件</p>
              </div>
            ) : (
              sseEvents.map((event, index) => (
                <div
                  key={index}
                  className="p-3 bg-bg-secondary rounded-lg border border-border-primary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">
                      Event #{index + 1}
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap">
                    {event.data}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
  tryParseJson,
  formatJson,
  copyToClipboard,
  generateCurl,
} from "../../utils/helpers";

// JSON 语法高亮组件
const JsonHighlight: React.FC<{ json: string }> = ({ json }) => {
  const highlightedJson = useMemo(() => {
    try {
      const formatted = formatJson(json);
      // 简单的语法高亮
      return formatted
        .replace(/"([^"]+)":/g, '<span class="text-accent-purple">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="text-accent-green">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="text-accent-orange">$1</span>')
        .replace(/: (true|false)/g, ': <span class="text-accent-blue">$1</span>')
        .replace(/: (null)/g, ': <span class="text-text-muted">$1</span>');
    } catch {
      return json;
    }
  }, [json]);

  return (
    <pre
      className="text-sm font-mono whitespace-pre-wrap break-all"
      dangerouslySetInnerHTML={{ __html: highlightedJson }}
    />
  );
};

export const ResponseViewer: React.FC = () => {
  const { currentRequest, currentResponse, isLoading, sseEvents, isSSEConnected } =
    useAppStore();
  const [activeTab, setActiveTab] = useState("body");
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers", badge: currentResponse ? Object.keys(currentResponse.headers).length : 0 },
    { id: "cookies", label: "Cookies" },
    { id: "sse", label: "SSE", badge: sseEvents.length },
  ];

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCurl = () => {
    const curl = generateCurl(currentRequest);
    handleCopy(curl);
  };

  const handleExportJson = () => {
    if (!currentResponse) return;
    const exportData = {
      request: currentRequest,
      response: currentResponse,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 空状态
  if (!currentResponse && !isLoading && sseEvents.length === 0) {
    return (
      <div className="flex flex-col h-full bg-bg-secondary items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-bg-tertiary flex items-center justify-center">
            <svg
              className="w-10 h-10 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
              等待响应
            </h3>
            <p className="text-sm text-text-muted">
              输入 URL 并发送请求以查看响应
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading && !isSSEConnected) {
    return (
      <div className="flex flex-col h-full bg-bg-secondary items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-4 border-bg-tertiary" />
            <div className="absolute inset-0 rounded-full border-4 border-accent-blue border-t-transparent animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-text-primary mb-1">
              发送请求中...
            </h3>
            <p className="text-sm text-text-muted">请稍候</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* 状态栏 */}
      {currentResponse && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-bg-primary">
          <div className="flex items-center gap-4">
            {/* 状态码 */}
            <div
              className={`px-3 py-1 rounded-md border font-semibold text-sm ${getStatusBgColor(
                currentResponse.status
              )} ${getStatusColor(currentResponse.status)}`}
            >
              {currentResponse.status} {currentResponse.statusText}
            </div>

            {/* 耗时 */}
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatDuration(currentResponse.duration)}</span>
            </div>

            {/* 大小 */}
            <div className="flex items-center gap-1.5 text-sm text-text-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span>{formatBytes(currentResponse.bodySize)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCurl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary 
                         hover:text-text-primary hover:bg-bg-hover rounded-md transition-all"
              title="复制为 cURL"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              <span>cURL</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary 
                         hover:text-text-primary hover:bg-bg-hover rounded-md transition-all"
              title="导出 JSON"
            >
              <DownloadIcon size={14} />
              <span>导出</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 导航 */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} size="sm" />

      {/* Tab 内容 */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "body" && currentResponse && (
          <div className="animate-fade-in">
            {currentResponse.error ? (
              <div className="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg">
                <h4 className="text-sm font-medium text-accent-red mb-2">请求错误</h4>
                <p className="text-sm text-text-secondary">{currentResponse.error}</p>
              </div>
            ) : tryParseJson(currentResponse.body) ? (
              <div className="bg-bg-primary rounded-lg p-4 border border-border-primary">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-muted uppercase tracking-wider">JSON</span>
                  <button
                    onClick={() => handleCopy(formatJson(currentResponse.body))}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  </button>
                </div>
                <JsonHighlight json={currentResponse.body} />
              </div>
            ) : (
              <div className="bg-bg-primary rounded-lg p-4 border border-border-primary">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all text-text-primary">
                  {currentResponse.body}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "headers" && currentResponse && (
          <div className="animate-fade-in space-y-2">
            {Object.entries(currentResponse.headers).map(([key, value]) => (
              <div
                key={key}
                className="flex items-start gap-4 px-4 py-2 bg-bg-primary rounded-lg border border-border-primary"
              >
                <span className="text-sm font-medium text-accent-purple min-w-[200px]">
                  {key}
                </span>
                <span className="text-sm text-text-secondary break-all">{value}</span>
              </div>
            ))}
            {Object.keys(currentResponse.headers).length === 0 && (
              <div className="text-center py-8 text-text-muted">
                没有响应头
              </div>
            )}
          </div>
        )}

        {activeTab === "cookies" && (
          <div className="animate-fade-in text-center py-12 text-text-muted">
            <p>此响应没有 Cookie</p>
          </div>
        )}

        {activeTab === "sse" && (
          <div className="animate-fade-in space-y-2">
            {isSSEConnected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent-green/10 border border-accent-green/30 rounded-lg mb-4">
                <span className="status-dot success" />
                <span className="text-sm text-accent-green">SSE 连接已建立</span>
              </div>
            )}
            {sseEvents.length > 0 ? (
              sseEvents.map((event, index) => (
                <div
                  key={index}
                  className="px-4 py-3 bg-bg-primary rounded-lg border border-border-primary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">
                      #{index + 1} - {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    {event.event && (
                      <span className="text-xs px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded">
                        {event.event}
                      </span>
                    )}
                  </div>
                  <pre className="text-sm font-mono text-text-primary whitespace-pre-wrap break-all">
                    {event.data}
                  </pre>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-text-muted">
                <p>暂无 SSE 事件</p>
                <p className="text-sm mt-1">开启 SSE 模式并连接以接收事件</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
