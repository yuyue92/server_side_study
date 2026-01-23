import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workflowApi, taskApi, getTypeIcon, getRoleText } from '../utils/api';
import { 
  Send, 
  ChevronRight, 
  FileText,
  Loader2,
  CheckCircle
} from 'lucide-react';

const formFields = {
  leave: [
    { name: '请假类型', key: 'leaveType', type: 'select', options: ['年假', '事假', '病假', '婚假', '产假'] },
    { name: '开始日期', key: 'startDate', type: 'date' },
    { name: '结束日期', key: 'endDate', type: 'date' },
    { name: '请假天数', key: 'days', type: 'number' },
    { name: '请假原因', key: 'reason', type: 'textarea' }
  ],
  expense: [
    { name: '报销类型', key: 'expenseType', type: 'select', options: ['差旅费', '交通费', '餐饮费', '办公用品', '其他'] },
    { name: '报销金额', key: 'amount', type: 'number', prefix: '¥' },
    { name: '发生日期', key: 'date', type: 'date' },
    { name: '费用说明', key: 'description', type: 'textarea' }
  ],
  purchase: [
    { name: '采购物品', key: 'itemName', type: 'text' },
    { name: '数量', key: 'quantity', type: 'number' },
    { name: '预计金额', key: 'amount', type: 'number', prefix: '¥' },
    { name: '供应商', key: 'supplier', type: 'text' },
    { name: '采购理由', key: 'reason', type: 'textarea' }
  ],
  document: [
    { name: '文档标题', key: 'docTitle', type: 'text' },
    { name: '文档类型', key: 'docType', type: 'select', options: ['合同', '报告', '方案', '规范', '其他'] },
    { name: '紧急程度', key: 'urgency', type: 'select', options: ['普通', '紧急', '特急'] },
    { name: '文档说明', key: 'description', type: 'textarea' }
  ]
};

export default function CreateTask() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    const res = await workflowApi.getAll();
    if (res.success) {
      setWorkflows(res.data);
    }
  };

  const handleSelectWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setFormData({});
    setTitle('');
    setDescription('');
    setStep(2);
  };

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请填写标题');
      return;
    }

    setSubmitting(true);
    
    const res = await taskApi.create({
      workflow_id: selectedWorkflow.id,
      title: title.trim(),
      description: description.trim(),
      data: formData,
      created_by: user.id
    });

    if (res.success) {
      setStep(3);
      setTimeout(() => {
        navigate(`/tasks/${res.data.id}`);
      }, 2000);
    } else {
      alert(res.message || '提交失败');
    }
    setSubmitting(false);
  };

  const fields = selectedWorkflow ? formFields[selectedWorkflow.type] || [] : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">发起审批</h1>
        <p className="text-slate-500 mt-1">选择审批类型并填写相关信息</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          {['选择流程', '填写信息', '提交成功'].map((label, idx) => (
            <div key={idx} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-medium
                ${step > idx + 1 ? 'bg-emerald-500 text-white' :
                  step === idx + 1 ? 'bg-primary-500 text-white' :
                  'bg-slate-200 text-slate-500'}
              `}>
                {step > idx + 1 ? <CheckCircle className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                step >= idx + 1 ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {label}
              </span>
              {idx < 2 && (
                <ChevronRight className="w-5 h-5 mx-2 sm:mx-4 text-slate-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          {workflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => handleSelectWorkflow(workflow)}
              className="glass rounded-2xl p-6 text-left card-hover"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-3xl shrink-0">
                  {getTypeIcon(workflow.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-slate-800 mb-1">{workflow.name}</h3>
                  <p className="text-sm text-slate-500 mb-3">{workflow.description}</p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {workflow.steps.map((s, idx) => (
                      <span key={idx} className="flex items-center">
                        <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600">
                          {s.name}
                        </span>
                        {idx < workflow.steps.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && selectedWorkflow && (
        <div className="glass rounded-2xl p-6 space-y-6">
          <button
            onClick={() => setStep(1)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            ← 重新选择流程
          </button>

          <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl">
            <span className="text-3xl">{getTypeIcon(selectedWorkflow.type)}</span>
            <div>
              <h3 className="font-medium text-slate-800">{selectedWorkflow.name}</h3>
              <p className="text-sm text-slate-500">{selectedWorkflow.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                申请标题 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`例如：${selectedWorkflow.type === 'leave' ? '年假申请 - 5天' : 
                  selectedWorkflow.type === 'expense' ? '差旅报销 - 北京出差' :
                  selectedWorkflow.type === 'purchase' ? '办公设备采购申请' : '文档审批'}`}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                申请说明
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述申请原因或其他需要说明的内容..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors resize-none"
              />
            </div>
          </div>

          {fields.length > 0 && (
            <div className="border-t border-slate-100 pt-6">
              <h3 className="font-medium text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                详细信息
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {field.name}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors"
                      >
                        <option value="">请选择...</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors resize-none"
                      />
                    ) : (
                      <div className="relative">
                        {field.prefix && (
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            {field.prefix}
                          </span>
                        )}
                        <input
                          type={field.type}
                          value={formData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-primary-400 transition-colors ${
                            field.prefix ? 'pl-8' : ''
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-medium text-slate-800 mb-4">审批流程</h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {selectedWorkflow.steps.map((s, idx) => (
                <div key={idx} className="flex items-center shrink-0">
                  <div className="px-4 py-2 bg-slate-100 rounded-lg">
                    <p className="text-sm font-medium text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-500">{getRoleText(s.role)}</p>
                  </div>
                  {idx < selectedWorkflow.steps.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-slate-300 mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 text-slate-600 hover:text-slate-800"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              提交审批
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-2">提交成功！</h2>
          <p className="text-slate-500 mb-6">您的审批申请已成功提交，正在跳转到详情页...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mx-auto" />
        </div>
      )}
    </div>
  );
}
