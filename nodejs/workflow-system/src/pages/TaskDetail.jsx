import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskApi, formatDate, getStatusText, getTypeIcon, getRoleText } from '../utils/api';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  MessageSquare,
  FileText,
  Loader2,
  AlertTriangle,
  Ban
} from 'lucide-react';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    setLoading(true);
    const res = await taskApi.getById(id);
    if (res.success) {
      setTask(res.data);
    }
    setLoading(false);
  };

  const canApprove = () => {
    if (!task || task.status !== 'in_progress') return false;
    const currentStep = task.workflow_steps[task.current_step];
    return currentStep && currentStep.role === user.role;
  };

  const canCancel = () => {
    return task && task.created_by === user.id && 
           (task.status === 'pending' || task.status === 'in_progress');
  };

  const handleApprove = async (action) => {
    setSubmitting(true);
    const res = await taskApi.approve(id, {
      approver_id: user.id,
      action,
      comment
    });
    
    if (res.success) {
      setShowConfirm(null);
      setComment('');
      loadTask();
    } else {
      alert(res.message);
    }
    setSubmitting(false);
  };

  const handleCancel = async () => {
    if (!confirm('确定要取消此任务吗？')) return;
    
    setSubmitting(true);
    const res = await taskApi.cancel(id, user.id);
    if (res.success) {
      loadTask();
    } else {
      alert(res.message);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-medium text-slate-700">任务不存在</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 hover:text-primary-700">
          返回上一页
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        返回
      </button>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-4xl">
            {getTypeIcon(task.workflow_type)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="font-display text-2xl font-bold text-slate-800">{task.title}</h1>
              <span className={`status-badge status-${task.status} text-sm`}>
                {getStatusText(task.status)}
              </span>
            </div>
            <p className="text-slate-500 mb-4">{task.workflow_name}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                发起人：{task.creator_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(task.created_at)}
              </span>
            </div>
          </div>
        </div>

        {task.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-slate-600">{task.description}</p>
          </div>
        )}

        {task.data && Object.keys(task.data).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              申请详情
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(task.data).map(([key, value]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{key}</p>
                  <p className="text-slate-800 font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold text-slate-800 mb-6">审批进度</h2>
        
        <div className="relative">
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-200" />
          
          <div className="space-y-6">
            {task.workflow_steps.map((step, idx) => {
              const approval = task.approvals?.find(a => a.step_index === idx);
              const isCompleted = idx < task.current_step || (task.status === 'approved' && idx === task.current_step);
              const isCurrent = idx === task.current_step && task.status === 'in_progress';
              const isRejected = task.status === 'rejected' && idx === task.current_step;
              
              return (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className={`
                    relative z-10 w-14 h-14 rounded-full flex items-center justify-center shrink-0
                    ${isCompleted ? 'bg-emerald-500' : 
                      isCurrent ? 'bg-primary-500 pulse-ring' : 
                      isRejected ? 'bg-rose-500' : 
                      'bg-slate-200'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-7 h-7 text-white" />
                    ) : isRejected ? (
                      <XCircle className="w-7 h-7 text-white" />
                    ) : isCurrent ? (
                      <Clock className="w-7 h-7 text-white" />
                    ) : (
                      <span className="text-lg font-medium text-slate-500">{idx + 1}</span>
                    )}
                  </div>

                  <div className={`flex-1 pb-6 ${idx === task.workflow_steps.length - 1 ? 'pb-0' : ''}`}>
                    <div className={`
                      p-4 rounded-xl
                      ${isCurrent ? 'bg-primary-50 border-2 border-primary-200' : 
                        isRejected ? 'bg-rose-50 border-2 border-rose-200' : 
                        'bg-white border border-slate-200'}
                    `}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-slate-800">{step.name}</h3>
                        <span className="text-xs text-slate-500">
                          需要角色: {getRoleText(step.role)}
                        </span>
                      </div>
                      
                      {approval && approval.action !== 'pending' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-2xl">{approval.approver_avatar || '👤'}</span>
                            <span className="text-slate-600">{approval.approver_name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              approval.action === 'approved' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700'
                            }`}>
                              {approval.action === 'approved' ? '已批准' : '已拒绝'}
                            </span>
                            <span className="text-slate-400 text-xs ml-auto">
                              {formatDate(approval.created_at)}
                            </span>
                          </div>
                          {approval.comment && (
                            <p className="mt-2 text-sm text-slate-600 bg-slate-50 rounded p-2">
                              <MessageSquare className="w-4 h-4 inline mr-1" />
                              {approval.comment}
                            </p>
                          )}
                        </div>
                      )}

                      {isCurrent && (
                        <p className="mt-2 text-sm text-primary-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          等待 {getRoleText(step.role)} 审批中...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {canApprove() && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">审批操作</h2>
          
          {showConfirm ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${
                showConfirm === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'
              }`}>
                <p className="font-medium mb-3">
                  {showConfirm === 'approved' ? '确认批准此任务？' : '确认拒绝此任务？'}
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={showConfirm === 'approved' ? '添加批注（可选）' : '请填写拒绝原因'}
                  className="w-full p-3 border border-slate-200 rounded-lg resize-none h-24 focus:border-primary-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  disabled={submitting}
                >
                  取消
                </button>
                <button
                  onClick={() => handleApprove(showConfirm)}
                  disabled={submitting || (showConfirm === 'rejected' && !comment)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium ${
                    showConfirm === 'approved' 
                      ? 'bg-emerald-500 hover:bg-emerald-600' 
                      : 'bg-rose-500 hover:bg-rose-600'
                  } disabled:opacity-50`}
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  确认{showConfirm === 'approved' ? '批准' : '拒绝'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowConfirm('approved')}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                批准
              </button>
              <button
                onClick={() => setShowConfirm('rejected')}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5" />
                拒绝
              </button>
            </div>
          )}
        </div>
      )}

      {canCancel() && (
        <div className="glass rounded-2xl p-6">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            <Ban className="w-5 h-5" />
            取消此任务
          </button>
        </div>
      )}

      {task.logs && task.logs.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg font-semibold text-slate-800 mb-4">操作日志</h2>
          <div className="space-y-3">
            {task.logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm flex-wrap">
                <span className="text-slate-400 whitespace-nowrap">{formatDate(log.created_at)}</span>
                <span className="text-slate-600">{log.user_name}</span>
                <span className="text-slate-800">{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
