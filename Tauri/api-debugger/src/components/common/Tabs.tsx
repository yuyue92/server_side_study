import React from "react";

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: "sm" | "md";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  size = "md",
}) => {
  return (
    <div className="flex border-b border-border-primary">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative flex items-center gap-2 px-4 transition-all
            ${size === "sm" ? "py-2 text-xs" : "py-3 text-sm"}
            ${
              activeTab === tab.id
                ? "text-accent-blue"
                : "text-text-secondary hover:text-text-primary"
            }
          `}
        >
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span
              className={`
                px-1.5 py-0.5 text-xs rounded-full
                ${
                  activeTab === tab.id
                    ? "bg-accent-blue/20 text-accent-blue"
                    : "bg-bg-tertiary text-text-muted"
                }
              `}
            >
              {tab.badge}
            </span>
          )}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-blue to-accent-cyan" />
          )}
        </button>
      ))}
    </div>
  );
};
