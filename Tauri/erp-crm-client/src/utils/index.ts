import { clsx, type ClassValue } from 'clsx';

/**
 * 合并 className
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * 格式化金额
 */
export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN').format(num);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format: 'date' | 'datetime' | 'time' = 'date'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {};
  
  switch (format) {
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      break;
    default:
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
  }
  
  return new Intl.DateTimeFormat('zh-CN', options).format(d);
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDate(d);
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 生成订单号
 */
export function generateOrderCode(prefix = 'SO'): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${year}${month}${day}${random}`;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 安全解析 JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * 截断文本
 */
export function truncate(text: string, length: number, suffix = '...'): string {
  if (text.length <= length) return text;
  return text.slice(0, length - suffix.length) + suffix;
}

/**
 * 首字母大写
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * 下载文件
 */
export function downloadFile(data: Blob | string, filename: string): void {
  const blob = typeof data === 'string' ? new Blob([data]) : data;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    // 客户状态
    active: 'success',
    inactive: 'gray',
    blocked: 'danger',
    
    // 订单状态
    draft: 'gray',
    pending: 'warning',
    confirmed: 'primary',
    shipped: 'primary',
    completed: 'success',
    cancelled: 'danger',
    
    // 产品状态
    discontinued: 'gray',
    out_of_stock: 'danger',
    
    // 客户类别
    vip: 'warning',
    regular: 'primary',
    potential: 'success',
  };
  
  return colorMap[status] || 'gray';
}

/**
 * 获取状态文本
 */
export function getStatusText(status: string): string {
  const textMap: Record<string, string> = {
    // 客户状态
    active: '活跃',
    inactive: '停用',
    blocked: '黑名单',
    
    // 订单状态
    draft: '草稿',
    pending: '待确认',
    confirmed: '已确认',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消',
    
    // 产品状态
    discontinued: '已停产',
    out_of_stock: '缺货',
    
    // 客户类别
    vip: 'VIP客户',
    regular: '普通客户',
    potential: '潜在客户',
    
    // 订单类型
    sale: '销售订单',
    purchase: '采购订单',
    return: '退货订单',
    
    // 库存操作类型
    in: '入库',
    out: '出库',
    adjust: '调整',
    transfer: '调拨',
  };
  
  return textMap[status] || status;
}

/**
 * 验证手机号
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证邮箱
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 计算分页
 */
export function calculatePagination(total: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNext,
    hasPrev,
    startIndex: (page - 1) * pageSize,
    endIndex: Math.min(page * pageSize, total),
  };
}

/**
 * 生成颜色 (基于字符串)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1',
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * 获取首字母
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
