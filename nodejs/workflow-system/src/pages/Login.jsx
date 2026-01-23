import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../utils/api';
import { GitBranch, User, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    userApi.getAll().then(res => {
      if (res.success) {
        setUsers(res.data);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) {
      setError('请选择用户');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleQuickLogin = async (user) => {
    setUsername(user.username);
    setLoading(true);
    setError('');
    
    const result = await login(user.username, '123456');
    
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-primary-900 to-accent-900 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 shadow-2xl shadow-primary-500/30 mb-4">
            <GitBranch className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-2">WorkFlow</h1>
          <p className="text-slate-400">企业级工作流与审批管理系统</p>
        </div>

        {/* 登录表单 */}
        <div className="glass-dark rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                选择用户
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-xl text-white focus:border-primary-400 transition-colors"
                >
                  <option value="" className="text-slate-900">请选择用户...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.username} className="text-slate-900">
                      {user.avatar} {user.name} - {user.department} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="默认密码：123456"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-primary-400 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  登录系统
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* 快捷登录 */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-sm text-slate-400 mb-4 text-center">快捷登录（演示用）</p>
            <div className="grid grid-cols-2 gap-2">
              {users.slice(0, 6).map(user => (
                <button
                  key={user.id}
                  onClick={() => handleQuickLogin(user)}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
                >
                  <span>{user.avatar}</span>
                  <span className="truncate">{user.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <p className="text-center text-slate-500 text-sm mt-8">
          © 2024 WorkFlow System. 企业内部使用
        </p>
      </div>
    </div>
  );
}
