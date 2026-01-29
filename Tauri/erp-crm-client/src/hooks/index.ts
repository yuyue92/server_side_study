import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore, useInventoryStore } from '@/store';
import { scannerService, syncService } from '@/services/tauri';
import { debounce } from '@/utils';
import type { ScanResult } from '@/types';

/**
 * 本地存储 Hook
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

/**
 * 防抖 Hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 搜索 Hook
 */
export function useSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  delay = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  const filteredItems = items.filter((item) => {
    if (!debouncedSearchTerm) return true;
    
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return searchFields.some((field) => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearch);
      }
      if (typeof value === 'number') {
        return value.toString().includes(lowerSearch);
      }
      return false;
    });
  });

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
  };
}

/**
 * 分页 Hook
 */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // 重置到第一页当数据变化时
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [items.length, totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    pageSize,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    totalItems: items.length,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, items.length),
  };
}

/**
 * Modal Hook
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}

/**
 * 表单 Hook
 */
export function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    setValues,
    setErrors,
    setFieldError,
    reset,
  };
}

/**
 * 网络状态 Hook
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const setIsOffline = useAppStore((state) => state.setIsOffline);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOffline(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOffline]);

  return isOnline;
}

/**
 * 扫码枪 Hook
 */
export function useScanner() {
  const { lastScanResult, scannerConnected, setLastScanResult, setScannerConnected } = useInventoryStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const addNotification = useAppStore((state) => state.addNotification);

  // 监听扫码事件
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<ScanResult>('scanner:scan', (event) => {
          setLastScanResult(event.payload);
        });
      } catch (error) {
        console.error('Failed to setup scanner listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [setLastScanResult]);

  // 检查扫码枪状态
  const checkStatus = useCallback(async () => {
    try {
      const result = await scannerService.getStatus();
      if (result.success && result.data) {
        setScannerConnected(result.data.connected);
      }
    } catch (error) {
      console.error('Failed to check scanner status:', error);
    }
  }, [setScannerConnected]);

  // 连接扫码枪
  const connect = useCallback(async (port: string) => {
    setIsConnecting(true);
    try {
      const result = await scannerService.connect({
        enabled: true,
        port,
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      if (result.success) {
        setScannerConnected(true);
        addNotification({
          type: 'success',
          title: '扫码枪已连接',
          message: `已成功连接到端口 ${port}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '连接失败',
        message: error instanceof Error ? error.message : '无法连接扫码枪',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [setScannerConnected, addNotification]);

  // 断开扫码枪
  const disconnect = useCallback(async () => {
    try {
      const result = await scannerService.disconnect();
      if (result.success) {
        setScannerConnected(false);
        setLastScanResult(null);
        addNotification({
          type: 'info',
          title: '扫码枪已断开',
          message: '扫码枪连接已断开',
        });
      }
    } catch (error) {
      console.error('Failed to disconnect scanner:', error);
    }
  }, [setScannerConnected, setLastScanResult, addNotification]);

  // 清除最后扫码结果
  const clearLastScan = useCallback(() => {
    setLastScanResult(null);
  }, [setLastScanResult]);

  return {
    isConnected: scannerConnected,
    isConnecting,
    lastScanResult,
    connect,
    disconnect,
    checkStatus,
    clearLastScan,
  };
}

/**
 * 数据同步 Hook
 */
export function useSync() {
  const { syncStatus, setSyncStatus } = useAppStore();
  const addNotification = useAppStore((state) => state.addNotification);

  // 监听同步事件
  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenComplete: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenProgress = await listen<{ progress: number; message: string }>('sync:progress', (event) => {
          setSyncStatus({ isSyncing: true });
          console.log('Sync progress:', event.payload);
        });

        unlistenComplete = await listen('sync:complete', () => {
          setSyncStatus({
            isSyncing: false,
            lastSyncAt: new Date().toISOString(),
            pendingChanges: 0,
          });
          addNotification({
            type: 'success',
            title: '同步完成',
            message: '数据已成功同步到服务器',
          });
        });

        unlistenError = await listen<{ error: string }>('sync:error', (event) => {
          setSyncStatus({ isSyncing: false });
          addNotification({
            type: 'error',
            title: '同步失败',
            message: event.payload.error,
          });
        });
      } catch (error) {
        console.error('Failed to setup sync listeners:', error);
      }
    };

    setupListeners();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenComplete) unlistenComplete();
      if (unlistenError) unlistenError();
    };
  }, [setSyncStatus, addNotification]);

  // 开始同步
  const startSync = useCallback(async () => {
    try {
      setSyncStatus({ isSyncing: true });
      await syncService.startSync();
    } catch (error) {
      setSyncStatus({ isSyncing: false });
      addNotification({
        type: 'error',
        title: '同步失败',
        message: error instanceof Error ? error.message : '无法开始同步',
      });
    }
  }, [setSyncStatus, addNotification]);

  // 强制全量同步
  const forceFullSync = useCallback(async () => {
    try {
      setSyncStatus({ isSyncing: true });
      await syncService.forceFullSync();
    } catch (error) {
      setSyncStatus({ isSyncing: false });
      addNotification({
        type: 'error',
        title: '同步失败',
        message: error instanceof Error ? error.message : '无法执行全量同步',
      });
    }
  }, [setSyncStatus, addNotification]);

  return {
    syncStatus,
    startSync,
    forceFullSync,
  };
}

/**
 * 键盘快捷键 Hook
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { ctrl = false, shift = false, alt = false } = modifiers;
      
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt
      ) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, modifiers]);
}

/**
 * 点击外部关闭 Hook
 */
export function useClickOutside<T extends HTMLElement>(
  callback: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);

  return ref;
}

/**
 * 窗口大小 Hook
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = debounce(() => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
