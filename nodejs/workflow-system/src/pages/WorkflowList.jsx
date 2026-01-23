import { useState, useEffect } from 'react';
import { workflowApi, getTypeIcon, getTypeText, getRoleText } from '../utils/api';
import { GitBranch, ChevronRight, Users, Layers } from 'lucide-react';

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    const res = await workflowApi.getAll();
    if (res.success) {
      setWorkflows(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">流程管理</h1>
        <p className="text-slate-500 mt-1">查看和管理系统中的审批流程定义</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 流程列表 */}
          <div className="space-y-4">
            {workflows.map((workflow, index) => (
              <button
                key={workflow.id}
                onClick={() => setSelectedWorkflow(workflow)}
                className={`w-full text-left glass rounded-2xl p-6 card-hover animate-slide-up ${
                  selectedWorkflow?.id === workflow.id ? 'ring-2 ring-primary-500' : ''
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-3xl shrink-0">
                    {getTypeIcon(workflow.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-slate-800 mb-1">{workflow.name}</h3>
                    <p className="text-sm text-slate-500 mb-3">{workflow.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Layers className="w-4 h-4" />
                        {workflow.steps.length} 个步骤
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {getTypeText(workflow.type)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>

          {/* 流程详情 */}
          <div className="lg:sticky lg:top-24">
            {selectedWorkflow ? (
              <div className="glass rounded-2xl p-6 animate-slide-in-right">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-4xl">
                    {getTypeIcon(selectedWorkflow.type)}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-slate-800">{selectedWorkflow.name}</h2>
                    <p className="text-slate-500">{selectedWorkflow.description}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-primary-500" />
                      流程步骤
                    </h3>
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                      <div className="space-y-4">
                        {selectedWorkflow.steps.map((step, idx) => (
                          <div key={idx} className="relative flex items-center gap-4">
                            <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 p-4 bg-white rounded-xl border border-slate-200">
                              <h4 className="font-medium text-slate-800">{step.name}</h4>
                              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                <Users className="w-4 h-4" />
                                <span>审批角色：{getRoleText(step.role)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <GitBranch className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">选择一个流程</h3>
                <p className="text-slate-500">点击左侧的流程查看详细信息</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
