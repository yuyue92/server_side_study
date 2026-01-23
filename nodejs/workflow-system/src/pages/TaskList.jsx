import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { taskApi, workflowApi, formatDate, getStatusText, getTypeText, getTypeIcon } from '../utils/api';
import { Search, Filter, FileCheck, ChevronRight, Calendar, User } from 'lucide-react';

export default function TaskList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    workflow_id: searchParams.get('workflow_id') || '',
    search: ''
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters.status, filters.workflow_id]);

  const loadWorkflows = async () => {
    const res = await workflowApi.getAll();
    if (res.success) setWorkflows(res.data);
  };

  const loadTasks = async () => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.workflow_id) params.workflow_id = filters.workflow_id;
    
    const res = await taskApi.getAll(params);
    if (res.success) setTasks(res.data);
    setLoading(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  const filteredTasks = tasks.filter(task => {
    if (!filters.search) return true;
    return task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
           task.creator_name.toLowerCase().includes(filters.search.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">任务列表</h1>
          <p className="text-slate-500 mt-1">查看和管理所有审批任务</p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all"
        >
          <FileCheck className="w-5 h-5" />
          发起新审批
        </Link>
      </div>

      {/* 筛选栏 */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索任务标题或发起人..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors"
            />
          </div>
          
          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors min-w-[140px]"
            >
              <option value="">全部状态</option>
              <option value="in_progress">审批中</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          {/* 流程类型筛选 */}
          <select
            value={filters.workflow_id}
            onChange={(e) => handleFilterChange('workflow_id', e.target.value)}
            className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors min-w-[140px]"
          >
            <option value="">全部流程</option>
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>{wf.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileCheck className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">暂无任务</h3>
          <p className="text-slate-500">没有找到符合条件的任务</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task, index) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block glass rounded-2xl p-6 card-hover animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* 类型图标 */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-3xl shrink-0">
                  {getTypeIcon(task.workflow_type)}
                </div>

                {/* 任务信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800 truncate">{task.title}</h3>
                      <p className="text-sm text-slate-500">{task.workflow_name}</p>
                    </div>
                    <span className={`status-badge status-${task.status} shrink-0`}>
                      {getStatusText(task.status)}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-slate-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {task.creator_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(task.created_at)}
                    </span>
                    <span className="text-primary-600">
                      当前步骤: {task.workflow_steps[task.current_step]?.name || '已完成'}
                    </span>
                  </div>
                </div>

                {/* 箭头 */}
                <ChevronRight className="w-6 h-6 text-slate-400 shrink-0" />
              </div>

              {/* 进度条 */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {task.workflow_steps.map((step, idx) => (
                    <div key={idx} className="flex-1 flex items-center gap-2">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                        ${idx < task.current_step 
                          ? 'bg-emerald-500 text-white' 
                          : idx === task.current_step && task.status === 'in_progress'
                            ? 'bg-primary-500 text-white pulse-ring'
                            : task.status === 'rejected' && idx === task.current_step
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                        }
                      `}>
                        {idx + 1}
                      </div>
                      {idx < task.workflow_steps.length - 1 && (
                        <div className={`flex-1 h-1 rounded-full ${
                          idx < task.current_step ? 'bg-emerald-500' : 'bg-slate-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  {task.workflow_steps.map((step, idx) => (
                    <span key={idx} className="truncate flex-1 text-center">
                      {step.name}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
