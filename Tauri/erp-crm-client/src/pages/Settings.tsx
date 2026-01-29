import { useState } from 'react';
import { Card, Button, Input, Select } from '@/components/common';
import { useAppStore } from '@/store';
import { useSync } from '@/hooks';
import { formatRelativeTime } from '@/utils';
import { Save, RefreshCw, Shield, Wifi, WifiOff, Globe, Building2 } from 'lucide-react';

const tabs = [
  { id: 'general', label: '基本设置', icon: <Building2 className="h-4 w-4" /> },
  { id: 'sync', label: '数据同步', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'security', label: '安全设置', icon: <Shield className="h-4 w-4" /> },
  { id: 'about', label: '关于系统', icon: <Globe className="h-4 w-4" /> },
];

const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
];

const themeOptions = [
  { value: 'light', label: '浅色模式' },
  { value: 'dark', label: '深色模式' },
  { value: 'system', label: '跟随系统' },
];

const syncIntervalOptions = [
  { value: '5', label: '每 5 分钟' },
  { value: '15', label: '每 15 分钟' },
  { value: '30', label: '每 30 分钟' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { config, setConfig, isOffline, syncStatus } = useAppStore();
  const { startSync, forceFullSync } = useSync();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">系统设置</h1>
        <p className="text-surface-500 mt-1">配置系统参数和偏好设置</p>
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <Card padding={false}>
            <nav className="p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.id ? 'bg-primary-50 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        <div className="flex-1">
          {activeTab === 'general' && (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-6">基本设置</h3>
              <div className="space-y-6">
                <Input label="企业名称" value={config.companyName} onChange={(e) => setConfig({ companyName: e.target.value })} />
                <Input label="API 地址" value={config.apiBaseUrl} onChange={(e) => setConfig({ apiBaseUrl: e.target.value })} />
                <Select label="界面语言" options={languageOptions} value={config.language} onChange={(v) => setConfig({ language: v as 'zh-CN' | 'en-US' })} />
                <Select label="主题模式" options={themeOptions} value={config.theme} onChange={(v) => setConfig({ theme: v as 'light' | 'dark' | 'system' })} />
                <div className="pt-4 border-t border-surface-100">
                  <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>保存设置</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'sync' && (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-6">数据同步</h3>
              <div className="space-y-6">
                <div className={`p-4 rounded-xl flex items-center gap-4 ${isOffline ? 'bg-warning-50' : 'bg-success-50'}`}>
                  {isOffline ? <WifiOff className="h-6 w-6 text-warning-600" /> : <Wifi className="h-6 w-6 text-success-600" />}
                  <div>
                    <p className={`font-medium ${isOffline ? 'text-warning-800' : 'text-success-800'}`}>{isOffline ? '离线模式' : '在线'}</p>
                    <p className={`text-sm ${isOffline ? 'text-warning-600' : 'text-success-600'}`}>{isOffline ? '数据将在恢复连接后同步' : '网络连接正常'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-surface-500">上次同步</p>
                    <p className="font-medium mt-1">{syncStatus.lastSyncAt ? formatRelativeTime(syncStatus.lastSyncAt) : '从未'}</p>
                  </div>
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-surface-500">待同步</p>
                    <p className="font-medium mt-1">{syncStatus.pendingChanges} 条</p>
                  </div>
                  <div className="p-4 bg-surface-50 rounded-xl">
                    <p className="text-surface-500">错误</p>
                    <p className="font-medium mt-1">{syncStatus.syncErrors.length} 条</p>
                  </div>
                </div>
                <Select label="同步间隔" options={syncIntervalOptions} value={String(config.syncInterval)} onChange={(v) => setConfig({ syncInterval: Number(v) })} />
                <div className="flex gap-3">
                  <Button onClick={startSync} isLoading={syncStatus.isSyncing} leftIcon={<RefreshCw className="h-4 w-4" />}>立即同步</Button>
                  <Button variant="outline" onClick={forceFullSync} disabled={syncStatus.isSyncing}>全量同步</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-6">安全设置</h3>
              <div className="space-y-6">
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="font-medium">数据加密</p>
                  <p className="text-sm text-surface-500 mt-1">本地数据使用 AES-256-GCM 加密存储</p>
                </div>
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="font-medium">密钥派生</p>
                  <p className="text-sm text-surface-500 mt-1">使用 Argon2 算法派生加密密钥</p>
                </div>
                <Input label="当前密码" type="password" placeholder="请输入当前密码" />
                <Input label="新密码" type="password" placeholder="请输入新密码" />
                <Input label="确认密码" type="password" placeholder="请再次输入新密码" />
                <Button>修改密码</Button>
              </div>
            </Card>
          )}

          {activeTab === 'about' && (
            <Card>
              <h3 className="font-semibold text-surface-900 mb-6">关于系统</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-3 border-b border-surface-100">
                  <span className="text-surface-500">系统名称</span>
                  <span className="font-medium">ERP/CRM 企业管理系统</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-100">
                  <span className="text-surface-500">版本号</span>
                  <span className="font-medium">v1.0.0</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-100">
                  <span className="text-surface-500">技术栈</span>
                  <span className="font-medium">Tauri v2 + React + Tailwind</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-100">
                  <span className="text-surface-500">运行环境</span>
                  <span className="font-medium">Desktop (Windows/macOS/Linux)</span>
                </div>
                <div className="pt-4">
                  <Button variant="outline">检查更新</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
