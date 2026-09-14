import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, ShieldAlert, Home, Building2, Users, Shield, Eye, EyeOff, CheckCircle2, Lock, ArrowRight, RefreshCw } from 'lucide-react';
import { auth as authApi } from '../utils/api';
import CustomModal from '../components/CustomModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = request email, 2 = enter token & new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [resetError, setResetError] = useState(null);

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

  const handleOpenForgotModal = () => {
    setResetEmail(email || '');
    setResetStep(1);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage(null);
    setResetError(null);
    setShowForgotModal(true);
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
    if (!resetEmail) {
      setResetError('Please enter your registered email address.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await authApi.forgotPassword(resetEmail);
      setResetMessage(res.message || 'Verification code sent to your email.');
      setResetStep(2);
    } catch (err) {
      setResetError(err.message || 'Failed to request password reset code.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
    if (!resetToken || !newPassword || !confirmPassword) {
      setResetError('Please fill in all required fields.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: resetEmail,
        token: resetToken,
        newPassword
      });
      setResetMessage(res.message || 'Password reset successfully!');
      setEmail(resetEmail); // prefill email in main form
      setTimeout(() => {
        setShowForgotModal(false);
        setResetStep(1);
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setResetMessage(null);
      }, 1800);
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden px-4 py-8"
      style={{
        background: 'radial-gradient(circle at top left, rgba(59,130,246,0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(139,92,246,0.1), transparent 35%), linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 30%, #FDFBFF 60%, #F5F8FF 100%)',
      }}
    >
      {/* Decorative floating orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.07), transparent)', filter: 'blur(60px)' }} />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07), transparent)', filter: 'blur(60px)' }} />

      <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-center gap-12 px-2 sm:px-6 max-w-[1100px] mx-auto">

        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col gap-8 flex-1 max-w-[420px]">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
              <Home size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-800 tracking-tight leading-none">Hari Pushp PG</h2>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5 font-sans">Hostel Management Portal</p>
            </div>
          </div>

          {/* Headline */}
          <div>
            <h1 className="text-[38px] font-bold text-slate-800 tracking-tight leading-tight">
              Manage your hostel<br />
              <span style={{ background: 'linear-gradient(135deg, #2563eb, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>like an enterprise.</span>
            </h1>
            <p className="text-[16px] text-slate-500 font-medium mt-4 leading-relaxed">
              A comprehensive platform for students, wardens, and staff — built for modern hostel living.
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-col gap-3">
            {[
              { icon: <Building2 size={16} />, label: 'Real-time Room & Inventory Directory', color: '#2563eb' },
              { icon: <Users size={16} />, label: 'Student Enrollment & Digital Attendance', color: '#10b981' },
              { icon: <Shield size={16} />, label: 'Automated Leave & WhatsApp Parent Alerts', color: '#8b5cf6' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: f.color }}>
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
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
              <Home size={18} className="text-white" />
            </div>
            <h2 className="text-[18px] font-bold text-slate-800 tracking-tight">Hari Pushp PG</h2>
          </div>

          {/* Card */}
          <div
            className="w-full p-6 sm:p-8 md:p-10 rounded-[28px] flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 20px 60px rgba(15,23,42,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex flex-col mb-6 sm:mb-8 text-center sm:text-left">
              <h2 className="text-[22px] sm:text-[24px] font-bold text-slate-800 tracking-tight">Welcome back</h2>
              <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium mt-1">Sign in to your account to continue</p>
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
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="Enter registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-4 rounded-[14px] border border-slate-200 bg-white/90 text-slate-800 outline-none text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-[12px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer border-none bg-transparent"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Key size={16} className="absolute left-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-11 rounded-[14px] border border-slate-200 bg-white/90 text-slate-800 outline-none text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1 rounded-full cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white rounded-[14px] font-bold flex items-center justify-center gap-2 transition-all text-[14px] cursor-pointer mt-3"
                style={{
                  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
                  color: '#ffffff',
                }}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <LogIn size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 mt-6 text-[13px] font-medium text-slate-500">
              <span>Don't have an account?</span>
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
              >
                Register / Sign Up
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[12px] text-slate-400 font-medium">
            Hari Pushp PG &mdash; Official Hostel Management Portal
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      <CustomModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title={resetStep === 1 ? "Reset Your Password" : "Enter Verification Code & Reset"}
        size="md"
      >
        {resetError && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{resetError}</span>
          </div>
        )}

        {resetMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold mb-4">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{resetMessage}</span>
          </div>
        )}

        {resetStep === 1 ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4 text-left">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Enter your registered email address below. We will send a 6-digit verification code to your email so you can safely reset your password.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Email Address *</label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 font-medium"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                {resetLoading ? (
                  <span>Sending Code...</span>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <span>Code sent to: <strong>{resetEmail}</strong></span>
              <button
                type="button"
                onClick={() => setResetStep(1)}
                className="text-indigo-600 font-bold hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>Change Email</span>
              </button>
            </div>

            {/* 6-Digit Code */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">6-Digit Verification Code *</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter 6-digit code (e.g. 849201)"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 font-mono tracking-wider font-bold"
                  required
                />
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password *</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm New Password *</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 font-medium"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                {resetLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Update Password & Log In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </CustomModal>
    </div>
  );
};

export default Login;


