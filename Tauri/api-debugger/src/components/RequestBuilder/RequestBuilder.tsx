import React, { useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { useMockRequest } from "../../hooks/useRequest";
import type { HttpMethod, BodyType } from "../../types";
import { methodColors, methodBgColors } from "../../utils/helpers";
import { KeyValueEditor } from "../common/KeyValueEditor";
import { Tabs } from "../common/Tabs";
import {
  SendIcon,
  LoadingIcon,
  ChevronDownIcon,
  ZapIcon,
  PlayIcon,
  StopIcon,
} from "../common/Icons";

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
];

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "json", label: "JSON" },
  { value: "form-data", label: "Form Data" },
  { value: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
  { value: "raw", label: "Raw" },
];

export const RequestBuilder: React.FC = () => {
  const {
    currentRequest,
    setCurrentRequest,
    isLoading,
    isSSEConnected,
  } = useAppStore();

  const { sendRequest, startSSE, stopSSE } = useMockRequest();
  
  const [activeTab, setActiveTab] = useState("params");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [sseMode, setSseMode] = useState(false);

  const handleMethodChange = (method: HttpMethod) => {
    setCurrentRequest({ method });
    setShowMethodDropdown(false);
  };

  const handleSend = () => {
    if (sseMode) {
      if (isSSEConnected) {
        stopSSE();
      } else {
        startSSE();
      }
    } else {
      sendRequest();
    }
  };

  const tabs = [
    { id: "params", label: "Params", badge: currentRequest.queryParams.filter(p => p.key).length },
    { id: "headers", label: "Headers", badge: currentRequest.headers.filter(h => h.key).length },
    { id: "body", label: "Body" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* URL 栏 */}
      <div className="p-4 border-b border-border-primary">
        <div className="flex gap-2">
          {/* 方法选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowMethodDropdown(!showMethodDropdown)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm
                transition-all ${methodBgColors[currentRequest.method]} ${methodColors[currentRequest.method]}
              `}
            >
              <span>{currentRequest.method}</span>
              <ChevronDownIcon size={14} />
            </button>

            {showMethodDropdown && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-bg-secondary border border-border-primary rounded-lg shadow-lg z-10 overflow-hidden animate-slide-down">
                {HTTP_METHODS.map((method) => (
                  <button
                    key={method}
                    onClick={() => handleMethodChange(method)}
                    className={`
                      w-full px-4 py-2 text-left text-sm font-medium
                      transition-colors hover:bg-bg-hover
                      ${methodColors[method]}
                      ${currentRequest.method === method ? "bg-bg-tertiary" : ""}
                    `}
                  >
                    {method}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* URL 输入 */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={currentRequest.url}
              onChange={(e) => setCurrentRequest({ url: e.target.value })}
              placeholder="输入请求 URL，例如: https://api.example.com/users"
              className="w-full px-4 py-2.5 bg-bg-secondary border border-border-primary rounded-lg
                         text-text-primary placeholder:text-text-muted text-sm
                         focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20
                         transition-all"
            />
            {currentRequest.url.includes("{{") && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent-purple">
                含变量
              </span>
            )}
          </div>

          {/* SSE 模式切换 */}
          <button
            onClick={() => setSseMode(!sseMode)}
            className={`
              px-3 py-2.5 rounded-lg border transition-all
              ${sseMode 
                ? "bg-accent-cyan/20 border-accent-cyan/40 text-accent-cyan" 
                : "bg-bg-secondary border-border-primary text-text-secondary hover:text-text-primary"}
            `}
            title="SSE 模式"
          >
            <ZapIcon size={18} />
          </button>

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={isLoading && !sseMode}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm
              transition-all
              ${isSSEConnected
                ? "bg-accent-red hover:bg-accent-red/90 text-white"
                : "bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-90 text-bg-primary"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading && !sseMode ? (
              <>
                <LoadingIcon size={16} />
                <span>发送中...</span>
              </>
            ) : sseMode ? (
              isSSEConnected ? (
                <>
                  <StopIcon size={16} />
                  <span>停止</span>
                </>
              ) : (
                <>
                  <PlayIcon size={16} />
                  <span>连接</span>
                </>
              )
            ) : (
              <>
                <SendIcon size={16} />
                <span>发送</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab 导航 */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 内容 */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "params" && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              Query 参数
            </h3>
            <KeyValueEditor
              items={currentRequest.queryParams}
              onChange={(queryParams) => setCurrentRequest({ queryParams })}
              keyPlaceholder="参数名"
              valuePlaceholder="参数值"
            />
          </div>
        )}

        {activeTab === "headers" && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-medium text-text-secondary mb-3">
              请求头
            </h3>
            <KeyValueEditor
              items={currentRequest.headers}
              onChange={(headers) => setCurrentRequest({ headers })}
              keyPlaceholder="Header Name"
              valuePlaceholder="Header Value"
            />
          </div>
        )}

        {activeTab === "body" && (
          <div className="animate-fade-in space-y-4">
            {/* Body 类型选择 */}
            <div className="flex items-center gap-4">
              {BODY_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="bodyType"
                    value={type.value}
                    checked={currentRequest.bodyType === type.value}
                    onChange={() => setCurrentRequest({ bodyType: type.value })}
                    className="w-4 h-4 text-accent-blue bg-bg-secondary border-border-primary
                               focus:ring-accent-blue focus:ring-offset-0"
                  />
                  <span className="text-sm text-text-secondary">{type.label}</span>
                </label>
              ))}
            </div>

            {/* Body 内容编辑 */}
            {currentRequest.bodyType === "json" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  JSON Body
                </label>
                <textarea
                  value={currentRequest.body}
                  onChange={(e) => setCurrentRequest({ body: e.target.value })}
                  placeholder='{\n  "key": "value"\n}'
                  className="w-full h-64 px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg
                             text-text-primary placeholder:text-text-muted text-sm font-mono
                             focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20
                             resize-none"
                />
              </div>
            )}

            {currentRequest.bodyType === "x-www-form-urlencoded" && (
              <KeyValueEditor
                items={currentRequest.formData}
                onChange={(formData) => setCurrentRequest({ formData })}
                keyPlaceholder="字段名"
                valuePlaceholder="字段值"
              />
            )}

            {currentRequest.bodyType === "raw" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Raw Body
                </label>
                <textarea
                  value={currentRequest.body}
                  onChange={(e) => setCurrentRequest({ body: e.target.value })}
                  placeholder="输入原始请求体内容..."
                  className="w-full h-64 px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg
                             text-text-primary placeholder:text-text-muted text-sm
                             focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20
                             resize-none"
                />
              </div>
            )}

            {currentRequest.bodyType === "none" && (
              <div className="text-center py-12 text-text-muted">
                <p>此请求没有请求体</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="animate-fade-in space-y-6">
            {/* 超时设置 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">
                请求超时（毫秒）
              </label>
              <input
                type="number"
                value={currentRequest.timeout}
                onChange={(e) =>
                  setCurrentRequest({ timeout: parseInt(e.target.value) || 30000 })
                }
                className="w-48 px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg
                           text-text-primary text-sm
                           focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
            </div>

            {/* 其他设置 */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentRequest.followRedirects}
                  onChange={(e) =>
                    setCurrentRequest({ followRedirects: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-accent-blue bg-bg-secondary border-border-primary
                             focus:ring-accent-blue focus:ring-offset-0"
                />
                <span className="text-sm text-text-secondary">自动跟随重定向</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentRequest.verifySsl}
                  onChange={(e) =>
                    setCurrentRequest({ verifySsl: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-accent-blue bg-bg-secondary border-border-primary
                             focus:ring-accent-blue focus:ring-offset-0"
                />
                <span className="text-sm text-text-secondary">验证 SSL 证书</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
