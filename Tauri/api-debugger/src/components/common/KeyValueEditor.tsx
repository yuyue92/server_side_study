import React from "react";
import type { KeyValuePair } from "../../types";
import { useAppStore, createEmptyKeyValue } from "../../stores/appStore";
import { TrashIcon, PlusIcon } from "./Icons";

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
  items,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  showDescription = false,
}) => {
  const handleItemChange = (
    id: string,
    field: keyof KeyValuePair,
    value: string | boolean
  ) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange(newItems);
  };

  const handleAddItem = () => {
    onChange([...items, createEmptyKeyValue()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      onChange([createEmptyKeyValue()]);
    } else {
      onChange(items.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="group flex items-center gap-2 animate-fade-in"
        >
          {/* 启用/禁用复选框 */}
          <label className="flex items-center justify-center w-5 h-5 cursor-pointer">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) =>
                handleItemChange(item.id, "enabled", e.target.checked)
              }
              className="w-4 h-4 rounded border-border-primary bg-bg-secondary 
                         checked:bg-accent-blue checked:border-accent-blue
                         focus:ring-accent-blue focus:ring-offset-0
                         cursor-pointer transition-colors"
            />
          </label>

          {/* Key 输入 */}
          <input
            type="text"
            value={item.key}
            onChange={(e) => handleItemChange(item.id, "key", e.target.value)}
            placeholder={keyPlaceholder}
            className={`flex-1 min-w-0 px-3 py-2 text-sm bg-bg-secondary border border-border-primary 
                       rounded-md focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
                       placeholder:text-text-muted transition-all
                       ${!item.enabled ? "opacity-50" : ""}`}
          />

          {/* Value 输入 */}
          <input
            type="text"
            value={item.value}
            onChange={(e) => handleItemChange(item.id, "value", e.target.value)}
            placeholder={valuePlaceholder}
            className={`flex-[2] min-w-0 px-3 py-2 text-sm bg-bg-secondary border border-border-primary 
                       rounded-md focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
                       placeholder:text-text-muted transition-all
                       ${!item.enabled ? "opacity-50" : ""}`}
          />

          {/* 描述输入（可选） */}
          {showDescription && (
            <input
              type="text"
              value={item.description || ""}
              onChange={(e) =>
                handleItemChange(item.id, "description", e.target.value)
              }
              placeholder="Description"
              className={`flex-1 min-w-0 px-3 py-2 text-sm bg-bg-secondary border border-border-primary 
                         rounded-md focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
                         placeholder:text-text-muted transition-all
                         ${!item.enabled ? "opacity-50" : ""}`}
            />
          )}

          {/* 删除按钮 */}
          <button
            onClick={() => handleRemoveItem(item.id)}
            className="p-2 text-text-muted hover:text-accent-red hover:bg-accent-red/10 
                       rounded-md transition-all opacity-0 group-hover:opacity-100"
            title="删除"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      ))}

      {/* 添加按钮 */}
      <button
        onClick={handleAddItem}
        className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary 
                   hover:text-accent-blue hover:bg-bg-hover rounded-md transition-all w-full"
      >
        <PlusIcon size={16} />
        <span>添加参数</span>
      </button>
    </div>
  );
};
