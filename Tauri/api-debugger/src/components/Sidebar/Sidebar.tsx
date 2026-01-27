import React, { useState } from "react";
import { useAppStore, createEmptyKeyValue } from "../../stores/appStore";
import type { HistoryItem, Collection, Environment } from "../../types";
import {
  methodColors,
  methodBgColors,
  formatTimestamp,
  getStatusColor,
} from "../../utils/helpers";
import {
  HistoryIcon,
  FolderIcon,
  GlobeIcon,
  TrashIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
} from "../common/Icons";

// 历史记录列表
const HistoryList: React.FC = () => {
  const { history, loadFromHistory, deleteHistoryItem, clearHistory } =
    useAppStore();

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        暂无历史记录
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs text-text-muted">
          共 {history.length} 条记录
        </span>
        <button
          onClick={clearHistory}
          className="text-xs text-text-muted hover:text-accent-red transition-colors"
        >
          清空
        </button>
      </div>
      {history.map((item) => (
        <HistoryItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
};

const HistoryItemComponent: React.FC<{ item: HistoryItem }> = ({ item }) => {
  const { loadFromHistory, deleteHistoryItem } = useAppStore();
  const [showActions, setShowActions] = useState(false);

  let pathname = item.request.url;
  try {
    const url = new URL(
      item.request.url.startsWith("http")
        ? item.request.url
        : `http://${item.request.url}`
    );
    pathname = url.pathname;
  } catch {
    // 保持原始 URL
  }

  return (
    <div
      className="group relative p-2 rounded-lg hover:bg-bg-hover cursor-pointer transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => loadFromHistory(item)}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${methodBgColors[item.request.method]} ${methodColors[item.request.method]}`}
        >
          {item.request.method.slice(0, 3)}
        </span>
        <span
          className={`text-xs font-medium ${getStatusColor(item.response.status)}`}
        >
          {item.response.status}
        </span>
      </div>
      <div className="mt-1 text-xs text-text-secondary truncate">
        {pathname}
      </div>
      <div className="mt-0.5 text-xs text-text-muted">
        {formatTimestamp(item.timestamp)}
      </div>

      {showActions && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteHistoryItem(item.id);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 
                     text-text-muted hover:text-accent-red hover:bg-accent-red/10 
                     rounded transition-all"
        >
          <TrashIcon size={14} />
        </button>
      )}
    </div>
  );
};

// 集合列表
const CollectionList: React.FC = () => {
  const { collections, addCollection } = useAppStore();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCollection = () => {
    if (newCollectionName.trim()) {
      addCollection(newCollectionName.trim());
      setNewCollectionName("");
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-text-secondary 
                   hover:text-accent-blue hover:bg-bg-hover rounded-lg transition-all"
      >
        <PlusIcon size={14} />
        <span>新建集合</span>
      </button>

      {showAddForm && (
        <div className="flex gap-2 p-2 bg-bg-tertiary rounded-lg animate-fade-in">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="集合名称"
            className="flex-1 px-2 py-1 text-sm bg-bg-secondary border border-border-primary 
                       rounded focus:border-accent-blue"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAddCollection()}
          />
          <button
            onClick={handleAddCollection}
            className="px-3 py-1 text-sm bg-accent-blue text-bg-primary rounded 
                       hover:bg-accent-blue/90 transition-colors"
          >
            创建
          </button>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          暂无集合
        </div>
      ) : (
        collections.map((collection) => (
          <CollectionItemComponent key={collection.id} collection={collection} />
        ))
      )}
    </div>
  );
};

const CollectionItemComponent: React.FC<{ collection: Collection }> = ({ collection }) => {
  const {
    deleteCollection,
    currentRequest,
    addRequestToCollection,
    setCurrentRequest,
  } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  const handleSaveToCollection = () => {
    addRequestToCollection(collection.id, currentRequest);
  };

  return (
    <div className="rounded-lg border border-border-primary overflow-hidden">
      <div
        className="flex items-center justify-between p-2 bg-bg-tertiary cursor-pointer 
                   hover:bg-bg-hover transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDownIcon size={14} className="text-text-muted" />
          ) : (
            <ChevronRightIcon size={14} className="text-text-muted" />
          )}
          <FolderIcon size={14} className="text-accent-orange" />
          <span className="text-sm text-text-primary">{collection.name}</span>
          <span className="text-xs text-text-muted">
            ({collection.requests.length})
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteCollection(collection.id);
          }}
          className="p-1 text-text-muted hover:text-accent-red rounded transition-colors"
        >
          <TrashIcon size={12} />
        </button>
      </div>

      {expanded && (
        <div className="p-2 space-y-1 animate-slide-down">
          <button
            onClick={handleSaveToCollection}
            className="flex items-center gap-2 w-full px-2 py-1 text-xs text-text-secondary 
                       hover:text-accent-blue hover:bg-bg-hover rounded transition-all"
          >
            <PlusIcon size={12} />
            <span>保存当前请求</span>
          </button>

          {collection.requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-hover 
                         cursor-pointer transition-colors"
              onClick={() =>
                setCurrentRequest({
                  ...request,
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                })
              }
            >
              <span
                className={`text-xs font-semibold ${methodColors[request.method]}`}
              >
                {request.method.slice(0, 3)}
              </span>
              <span className="text-xs text-text-secondary truncate flex-1">
                {request.name || request.url}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 环境变量列表
const EnvironmentList: React.FC = () => {
  const {
    environments,
    addEnvironment,
    deleteEnvironment,
    updateEnvironment,
    activeEnvironmentId,
    setActiveEnvironment,
  } = useAppStore();
  const [newEnvName, setNewEnvName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddEnvironment = () => {
    if (newEnvName.trim()) {
      addEnvironment(newEnvName.trim());
      setNewEnvName("");
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-text-secondary 
                   hover:text-accent-blue hover:bg-bg-hover rounded-lg transition-all"
      >
        <PlusIcon size={14} />
        <span>新建环境</span>
      </button>

      {showAddForm && (
        <div className="flex gap-2 p-2 bg-bg-tertiary rounded-lg animate-fade-in">
          <input
            type="text"
            value={newEnvName}
            onChange={(e) => setNewEnvName(e.target.value)}
            placeholder="环境名称"
            className="flex-1 px-2 py-1 text-sm bg-bg-secondary border border-border-primary 
                       rounded focus:border-accent-blue"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAddEnvironment()}
          />
          <button
            onClick={handleAddEnvironment}
            className="px-3 py-1 text-sm bg-accent-blue text-bg-primary rounded 
                       hover:bg-accent-blue/90 transition-colors"
          >
            创建
          </button>
        </div>
      )}

      {environments.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">
          暂无环境
        </div>
      ) : (
        environments.map((env) => (
          <div
            key={env.id}
            className={`rounded-lg border overflow-hidden transition-all ${
              env.id === activeEnvironmentId
                ? "border-accent-green/50 bg-accent-green/5"
                : "border-border-primary"
            }`}
          >
            <div className="flex items-center justify-between p-2 bg-bg-tertiary">
              <div
                className="flex items-center gap-2 flex-1 cursor-pointer"
                onClick={() => setEditingId(editingId === env.id ? null : env.id)}
              >
                <GlobeIcon size={14} className="text-accent-cyan" />
                <span className="text-sm text-text-primary">{env.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setActiveEnvironment(
                      activeEnvironmentId === env.id ? null : env.id
                    )
                  }
                  className={`p-1 rounded transition-colors ${
                    env.id === activeEnvironmentId
                      ? "text-accent-green"
                      : "text-text-muted hover:text-accent-green"
                  }`}
                  title={env.id === activeEnvironmentId ? "取消激活" : "激活"}
                >
                  <CheckIcon size={14} />
                </button>
                <button
                  onClick={() => deleteEnvironment(env.id)}
                  className="p-1 text-text-muted hover:text-accent-red rounded transition-colors"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            </div>

            {editingId === env.id && (
              <div className="p-2 space-y-2 animate-slide-down">
                <div className="text-xs text-text-muted mb-2">
                  使用 {"{{变量名}}"} 在请求中引用
                </div>
                {env.variables.map((variable, index) => (
                  <div key={variable.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={variable.key}
                      onChange={(e) => {
                        const newVars = [...env.variables];
                        newVars[index] = { ...variable, key: e.target.value };
                        updateEnvironment(env.id, { variables: newVars });
                      }}
                      placeholder="变量名"
                      className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border-primary 
                                 rounded focus:border-accent-blue"
                    />
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => {
                        const newVars = [...env.variables];
                        newVars[index] = { ...variable, value: e.target.value };
                        updateEnvironment(env.id, { variables: newVars });
                      }}
                      placeholder="值"
                      className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border-primary 
                                 rounded focus:border-accent-blue"
                    />
                    <button
                      onClick={() => {
                        const newVars = env.variables.filter(
                          (_, i) => i !== index
                        );
                        updateEnvironment(env.id, {
                          variables:
                            newVars.length === 0
                              ? [createEmptyKeyValue()]
                              : newVars,
                        });
                      }}
                      className="p-1 text-text-muted hover:text-accent-red rounded transition-colors"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    updateEnvironment(env.id, {
                      variables: [...env.variables, createEmptyKeyValue()],
                    });
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary 
                             hover:text-accent-blue transition-colors"
                >
                  <PlusIcon size={12} />
                  <span>添加变量</span>
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

// 主侧边栏组件
export const Sidebar: React.FC = () => {
  const { sidebarTab, setSidebarTab, sidebarOpen } = useAppStore();

  if (!sidebarOpen) {
    return null;
  }

  const tabs = [
    { id: "history", icon: HistoryIcon, label: "历史" },
    { id: "collections", icon: FolderIcon, label: "集合" },
    { id: "environments", icon: GlobeIcon, label: "环境" },
  ] as const;

  return (
    <div className="w-72 bg-bg-secondary border-r border-border-primary flex flex-col h-full">
      {/* Tab 导航 */}
      <div className="flex border-b border-border-primary">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-all
                        ${
                          sidebarTab === tab.id
                            ? "text-accent-blue border-b-2 border-accent-blue -mb-px"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
          >
            <tab.icon size={16} />
            <span className="hidden lg:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-2">
        {sidebarTab === "history" && <HistoryList />}
        {sidebarTab === "collections" && <CollectionList />}
        {sidebarTab === "environments" && <EnvironmentList />}
      </div>
    </div>
  );
};
