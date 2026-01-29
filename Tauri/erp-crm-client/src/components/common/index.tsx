import React, { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { cn, getStatusColor, getStatusText, stringToColor, getInitials } from '@/utils';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

// ==================== Button ====================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      success: 'btn-success',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ==================== Input ====================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-surface-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'input-error',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-danger-500">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-xs text-surface-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ==================== SearchInput ====================

interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        value={value}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={onClear}
              className="hover:text-surface-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// ==================== Select ====================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function Select({ label, options, value, onChange, placeholder, error, className }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-surface-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('input appearance-none cursor-pointer', error && 'input-error', className)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger-500">{error}</p>}
    </div>
  );
}

// ==================== Textarea ====================

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-surface-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn('input min-h-[100px] resize-y', error && 'input-error', className)}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-danger-500">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ==================== Badge ====================

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    gray: 'badge-gray',
  };

  return <span className={cn(variants[variant], className)}>{children}</span>;
}

// ==================== StatusBadge ====================

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = getStatusColor(status) as BadgeProps['variant'];
  const text = getStatusText(status);

  return (
    <Badge variant={color} className={className}>
      {text}
    </Badge>
  );
}

// ==================== Avatar ====================

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white',
        sizes[size],
        className
      )}
      style={{ backgroundColor: stringToColor(name) }}
    >
      {getInitials(name)}
    </div>
  );
}

// ==================== Card ====================

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({ children, className, hover = false, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        hover ? 'card-hover' : 'card',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

// ==================== Modal ====================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        <div
          className={cn(
            'relative bg-white rounded-2xl shadow-elevated w-full animate-scale-in',
            sizes[size]
          )}
        >
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-surface-100">
              {title && <h3 className="text-lg font-semibold text-surface-900">{title}</h3>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
                >
                  <X className="h-5 w-5 text-surface-500" />
                </button>
              )}
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ==================== Alert ====================

interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Alert({ type, title, message, onClose, className }: AlertProps) {
  const styles = {
    info: 'bg-primary-50 border-primary-200 text-primary-800',
    success: 'bg-success-50 border-success-500/20 text-success-600',
    warning: 'bg-warning-50 border-warning-500/20 text-warning-600',
    error: 'bg-danger-50 border-danger-500/20 text-danger-600',
  };

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
  };

  const Icon = icons[type];

  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border', styles[type], className)}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h4 className="font-medium mb-1">{title}</h4>}
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0">
          <X className="h-4 w-4 opacity-60 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

// ==================== Loading ====================

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Loading({ size = 'md', className }: LoadingProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('animate-spin text-primary-600', sizes[size])} />
    </div>
  );
}

// ==================== EmptyState ====================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="text-surface-300 mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-surface-900 mb-2">{title}</h3>
      {description && <p className="text-sm text-surface-500 mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ==================== Pagination ====================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | 'ellipsis')[] = [];
  const showEllipsis = totalPages > 7;

  if (!showEllipsis) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('ellipsis');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }
    
    pages.push(totalPages);
  }

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      {pages.map((page, index) => (
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-3 py-2 text-surface-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              currentPage === page
                ? 'bg-primary-600 text-white'
                : 'hover:bg-surface-100 text-surface-600'
            )}
          >
            {page}
          </button>
        )
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

// ==================== Tabs ====================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 p-1 bg-surface-100 rounded-xl', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'bg-white text-surface-900 shadow-sm'
              : 'text-surface-600 hover:text-surface-900'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ==================== StatCard ====================

interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, icon, className }: StatCardProps) {
  return (
    <Card className={cn('stat-card', className)}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && <div className="text-surface-400">{icon}</div>}
      </div>
      <div className="flex items-end justify-between mt-2">
        <span className="stat-value">{value}</span>
        {change && (
          <span
            className={cn(
              change.type === 'increase' ? 'stat-change-up' : 'stat-change-down'
            )}
          >
            {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
          </span>
        )}
      </div>
    </Card>
  );
}

// ==================== Table ====================

interface Column<T> {
  key: string;
  title: string;
  width?: string;
  render?: (item: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((item: T) => string);
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyText?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  isLoading,
  emptyText = '暂无数据',
  className,
}: TableProps<T>) {
  const getRowKey = (item: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(item);
    }
    return String(item[rowKey]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading />
      </div>
    );
  }

  return (
    <div className={cn('table-container', className)}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-surface-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={getRowKey(item)}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(item, index)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ==================== ConfirmDialog ====================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'primary',
  isLoading,
}: ConfirmDialogProps) {
  const buttonVariants = {
    danger: 'danger',
    warning: 'primary',
    primary: 'primary',
  } as const;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-surface-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={buttonVariants[variant]}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
