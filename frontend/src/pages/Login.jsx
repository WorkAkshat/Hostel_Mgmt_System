import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, ShieldAlert, Home, Building2, Users, Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  
  const { login, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setError(null);
    
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else {
        navigate('/staff/visitors');
      }
    } catch (err) {
      // Handled by context
    }
  };

  const handleQuickLogin = async (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
    
    // Auto-login
    setLocalError(null);
    setError(null);
    try {
      const loggedUser = await login(roleEmail, 'password123');
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else {
        navigate('/staff/visitors');
      }
    } catch (err) {
      // Handled by context
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at top left, rgba(59,130,246,0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(139,92,246,0.1), transparent 35%), linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 30%, #FDFBFF 60%, #F5F8FF 100%)',
      }}
    >
      {/* Decorative floating orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(37,99,235,0.07), transparent)', filter: 'blur(60px)'}} />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent)', filter: 'blur(60px)'}} />

      <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-center gap-12 px-6 max-w-[1100px] mx-auto">

        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col gap-8 flex-1 max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-lg" style={{background: 'linear-gradient(135deg, #2563eb, #4f46e5)'}}>
              <Home size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-800 tracking-tight leading-none">GHMS Portal</h2>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">Girls Hostel Management</p>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-[38px] font-bold text-slate-800 tracking-tight leading-tight">
              Manage your hostel<br />
              <span style={{background: 'linear-gradient(135deg, #2563eb, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>like an enterprise.</span>
            </h1>
            <p className="text-[16px] text-slate-500 font-medium mt-4 leading-relaxed">
              A comprehensive platform for wardens, students, and staff — built for modern residential management.
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-col gap-3">
            {[
              { icon: <Building2 size={16} />, label: 'Real-time Room Occupancy Tracking', color: '#2563eb' },
              { icon: <Users size={16} />, label: 'Student Directory & Leave Management', color: '#10b981' },
              { icon: <Shield size={16} />, label: 'Visitor Security & Gate Pass Control', color: '#f59e0b' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur-md border border-white/50 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{background: f.color}}>
                  {f.icon}
                </div>
                <span className="text-[13px] font-semibold text-slate-700">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-2">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-md" style={{background: 'linear-gradient(135deg, #2563eb, #4f46e5)'}}>
              <Home size={18} className="text-white" />
            </div>
            <h2 className="text-[18px] font-bold text-slate-800 tracking-tight">GHMS Portal</h2>
          </div>

          {/* Card */}
          <div
            className="w-full p-8 md:p-10 rounded-[28px] animate-fade-in flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
            }}
          >
            {/* Header */}
            <div className="flex flex-col mb-8">
              <h2 className="text-[24px] font-bold text-slate-800 tracking-tight">Welcome back</h2>
              <p className="text-[14px] text-slate-500 font-medium mt-1.5">Sign in to your GHMS account to continue</p>
            </div>

            {/* Error */}
            {(error || localError) && (
              <div className="flex items-center gap-3 p-4 rounded-[14px] border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold mb-6 animate-fade-in">
                <ShieldAlert size={18} className="shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@ghms.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-4 rounded-[14px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                    style={{boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'}}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <Key size={16} className="absolute left-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-4 rounded-[14px] border border-slate-200 bg-white/80 text-slate-700 outline-none text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                    style={{boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'}}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white rounded-[14px] font-bold flex items-center justify-center gap-2 transition-all text-[14px] cursor-pointer mt-3"
                style={{
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                  transform: loading ? 'none' : undefined,
                  color: '#ffffff',
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <LogIn size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Login Divider */}
            <div className="flex items-center my-6">
              <div className="flex-grow h-[1px] bg-slate-100" />
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Demo Quick Login</span>
              <div className="flex-grow h-[1px] bg-slate-100" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Admin', sublabel: 'Chief Warden', email: 'warden@hms.com', color: '#2563eb', bg: 'rgba(37,99,235,0.06)' },
                { label: 'Student', sublabel: 'Ananya', email: 'ananya@hms.com', color: '#10b981', bg: 'rgba(16,185,129,0.06)' },
                { label: 'Staff', sublabel: 'Security', email: 'guard@hms.com', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
              ].map((d) => (
                <button
                  key={d.email}
                  onClick={() => handleQuickLogin(d.email)}
                  type="button"
                  className="flex flex-col items-center justify-center gap-1 py-3 rounded-[14px] border border-transparent cursor-pointer transition-all"
                  style={{background: d.bg, border: `1px solid ${d.color}20`}}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <span className="text-[13px] font-bold" style={{color: d.color}}>{d.label}</span>
                  <span className="text-[11px] text-slate-500">{d.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[12px] text-slate-400 font-medium">
            GHMS Portal &mdash; Enterprise Hostel Management Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

