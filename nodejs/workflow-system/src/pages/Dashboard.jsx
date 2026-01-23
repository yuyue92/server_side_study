import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { statsApi, taskApi, formatDate, getStatusText, getTypeText, getTypeIcon } from '../utils/api';
import { 
  FileCheck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  ArrowRight,
  CalendarDays,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        statsApi.get(user.id),
        taskApi.getAll({ created_by: user.id })
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (tasksRes.success) setRecentTasks(tasksRes.data.slice(0, 5));
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: '总任务数', value: stats?.totalTasks || 0, icon: FileCheck, color: 'from-primary-500 to-primary-600', bg: 'bg-primary-50' },
    { label: '审批中', value: stats?.pendingTasks || 0, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
    { label: '已通过', value: stats?.approvedTasks || 0, icon: CheckCircle, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50' },
    { label: '已拒绝', value: stats?.rejectedTasks || 0, icon: XCircle, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-indigo-600 to-accent-600 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <CalendarDays className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">
            {getGreeting()}，{user?.name}！
          </h1>
          <p className="text-white/80 max-w-xl">
            您有 <span className="font-semibold text-white">{stats?.myPendingApprovals || 0}</span> 条待审批任务，
            已发起 <span className="font-semibold text-white">{stats?.myTasks || 0}</span> 条任务。
          </p>
          {stats?.myPendingApprovals > 0 && (
            <Link 
              to="/approvals"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              去处理待审批任务
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div 
            key={card.label}
            className="glass rounded-2xl p-6 card-hover"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
              <card.icon className={`w-6 h-6 bg-gradient-to-r ${card.color} bg-clip-text`} style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text' }} />
            </div>
            <p className="text-sm text-slate-500 mb-1">{card.label}</p>
            <p className="text-3xl font-display font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 我的任务 */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-slate-800">我发起的任务</h2>
            <Link 
              to="/tasks"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无任务</p>
              <Link 
                to="/create"
                className="inline-flex items-center gap-1 mt-2 text-primary-600 hover:text-primary-700"
              >
                发起新审批 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map(task => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="block p-4 rounded-xl bg-white/50 hover:bg-white transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getTypeIcon(task.workflow_type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-slate-800 truncate">{task.title}</h3>
                        <span className={`status-badge status-${task.status}`}>
                          {getStatusText(task.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {getTypeText(task.workflow_type)} · {formatDate(task.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 任务类型分布 */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-slate-800 mb-6">任务类型分布</h2>
          
          {stats?.tasksByType?.length > 0 ? (
            <div className="space-y-4">
              {stats.tasksByType.map(item => {
                const total = stats.tasksByType.reduce((sum, i) => sum + i.count, 0);
                const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <span>{getTypeIcon(item.type)}</span>
                        {getTypeText(item.type)}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{item.count} 条</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无统计数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 17) return '下午好';
  if (hour < 19) return '傍晚好';
  return '晚上好';
}
