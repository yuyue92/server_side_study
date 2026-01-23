import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskApi, formatDate, getTypeIcon, getRoleText } from '../utils/api';
import { Clock, Calendar, ChevronRight, Inbox } from 'lucide-react';

export default function MyApprovals() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    setLoading(true);
    const res = await taskApi.getAll({ approver_id: user.id });
    if (res.success) {
      setTasks(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">待我审批</h1>
        <p className="text-slate-500 mt-1">
          以下是需要您（{getRoleText(user.role)}）审批的任务
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-medium text-slate-700 mb-2">没有待审批的任务</h3>
          <p className="text-slate-500">当有人提交需要您审批的任务时，会显示在这里</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block glass rounded-2xl p-6 card-hover animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl shrink-0">
                  {getTypeIcon(task.workflow_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800">{task.title}</h3>
                      <p className="text-sm text-slate-500">{task.workflow_name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full shrink-0">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">等待审批</span>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-slate-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="text-lg">{task.creator_avatar}</span>
                      {task.creator_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(task.created_at)}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm">
                      <span className="text-slate-500">当前步骤：</span>
                      <span className="font-medium text-primary-600">
                        {task.workflow_steps[task.current_step]?.name}
                      </span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="text-slate-500">
                        第 {task.current_step + 1}/{task.workflow_steps.length} 步
                      </span>
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-6 h-6 text-slate-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
