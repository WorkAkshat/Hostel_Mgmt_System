import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, ShieldAlert, House, Eye, EyeOff, CheckCircle2, Lock, ArrowRight, RefreshCw, ShieldCheck, BedDouble, BellRing } from 'lucide-react';
import { auth as authApi } from '../utils/api';
import CustomModal from '../components/CustomModal';
import HostelIllustration from '../components/ui/HostelIllustration';

const inputClass =
  'w-full h-12 rounded-xl border border-[var(--border-color)] bg-white text-[var(--text-primary)] outline-none text-[15px] transition-[border-color,box-shadow] focus:border-brand-400 focus:shadow-[0_0_0_3px_var(--color-brand-100)] placeholder:text-[var(--text-tertiary)] disabled:bg-[var(--bg-primary)]';

const labelClass = 'text-[13px] font-semibold text-[var(--text-secondary)]';

const Leaf = ({ className, rotate = 0 }) => (
  <svg viewBox="0 0 60 100" className={className} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
    <path d="M30 98C30 70 6 58 6 32 6 14 18 2 30 2s24 12 24 30c0 26-24 38-24 66Z" fill="currentColor" />
    <path d="M30 96V14" stroke="#ffffff" strokeOpacity=".55" strokeWidth="2" fill="none" />
  </svg>
);

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: 'Safe & secure stay' },
  { icon: BedDouble, label: 'Rooms, mess & fees in one place' },
  { icon: BellRing, label: 'Instant leave & parent alerts' },
];

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
    <div className="min-h-screen w-full flex bg-[var(--bg-primary)]">
      {/* Left — brand panel (desktop) */}
      <aside className="hidden lg:flex relative w-[46%] max-w-[640px] bg-[var(--sidebar-bg)] overflow-hidden flex-col justify-between p-12 xl:p-14">
        <Leaf className="absolute -top-6 left-10 w-16 text-brand-200" rotate={-30} />
        <Leaf className="absolute top-10 left-2 w-10 text-brand-300/70" rotate={-70} />
        <Leaf className="absolute -top-4 right-16 w-12 text-brand-200" rotate={25} />
        <Leaf className="absolute bottom-24 -right-4 w-20 text-mint-300" rotate={-20} />

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-600 shadow-[var(--shadow-sm)]">
            <House size={24} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[18px] font-bold text-[var(--text-primary)] leading-tight m-0">Hari Pushp Tower</p>
            <p className="text-[13px] text-brand-700 m-0">Girls hostel management system</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-[34px] xl:text-[38px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)] m-0">
            A safe, comfortable <br />& home away from home.
          </h1>
          <p className="text-[16px] text-[var(--text-secondary)] mt-3 mb-0">Better care. Better living. Together.</p>

          <ul className="list-none p-0 mt-8 mb-0 flex flex-col gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[14px] font-medium text-[var(--text-primary)]">
                <span className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center text-brand-600">
                  <Icon size={16} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex justify-center">
          <HostelIllustration />
        </div>
      </aside>

      {/* Right — sign-in form */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--sidebar-bg)] flex items-center justify-center text-brand-600 mb-3">
              <House size={26} strokeWidth={2.2} />
            </div>
            <p className="text-[20px] font-bold text-[var(--text-primary)] m-0">Hari Pushp Tower</p>
            <p className="text-[13px] text-brand-700 m-0">Girls hostel management system</p>
          </div>

          <div className="bg-white rounded-[var(--border-radius-modal)] border border-[var(--border-color)] shadow-[var(--shadow-md)] p-6 sm:p-9">
            <h2 className="text-[24px] font-bold tracking-tight m-0">Welcome back</h2>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1 mb-7">Sign in with your registered email to continue.</p>

            {(error || localError) && (
              <div role="alert" className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-5 animate-fade-in">
                <ShieldAlert size={18} className="shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className={labelClass}>Email address</label>
                <div className="relative flex items-center">
                  <Mail size={17} className="absolute left-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={`${inputClass} pl-11 pr-4`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className={labelClass}>Password</label>
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-[13px] font-semibold text-brand-700 hover:text-brand-900 hover:underline cursor-pointer border-none bg-transparent p-0"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Key size={17} className="absolute left-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={`${inputClass} pl-11 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer border-none bg-transparent"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-[15px] mt-1">
                {loading ? 'Signing in…' : (
                  <>
                    Sign in
                    <LogIn size={17} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-6 mb-0 text-[14px] text-[var(--text-secondary)]">
              New to Hari Pushp?{' '}
              <Link to="/register" className="text-brand-700 hover:text-brand-900 font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </div>

          <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-6 mb-0">
            © {new Date().getFullYear()} Hari Pushp Tower. All rights reserved.
          </p>
        </div>
      </main>

      {/* FORGOT PASSWORD MODAL */}
      <CustomModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title={resetStep === 1 ? 'Reset your password' : 'Enter code & new password'}
        size="md"
      >
        {resetError && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] text-[13px] font-medium mb-4">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{resetError}</span>
          </div>
        )}

        {resetMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--success-bg)] text-[var(--success)] text-[13px] font-medium mb-4">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {resetStep === 1 ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4 text-left">
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed m-0">
              Enter your registered email address. We will send a 6-digit verification code so you can reset your password.
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-email" className={labelClass}>Registered email address</label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={`${inputClass} h-11 pl-10 pr-3.5`}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
              <button type="button" onClick={() => setShowForgotModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={resetLoading} className="btn-primary">
                {resetLoading ? 'Sending code…' : (
                  <>
                    Send code
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4 text-left">
            <div className="p-3.5 rounded-xl bg-mint-50 border border-[var(--border-color)] flex items-center justify-between gap-3 text-[13px] text-[var(--text-secondary)]">
              <span className="truncate">Code sent to <strong className="text-[var(--text-primary)]">{resetEmail}</strong></span>
              <button
                type="button"
                onClick={() => setResetStep(1)}
                className="text-brand-700 font-semibold hover:underline cursor-pointer border-none bg-transparent flex items-center gap-1 shrink-0"
              >
                <RefreshCw size={12} />
                Change
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-code" className={labelClass}>6-digit verification code</label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="e.g. 849201"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} h-11 pl-10 pr-3.5 font-mono tracking-widest`}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-new" className={labelClass}>New password</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  id="reset-new"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputClass} h-11 pl-10 pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 w-8 h-8 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer border-none bg-transparent"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reset-confirm" className={labelClass}>Confirm new password</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                <input
                  id="reset-confirm"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass} h-11 pl-10 pr-3.5`}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
              <button type="button" onClick={() => setShowForgotModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={resetLoading} className="btn-primary">
                {resetLoading ? 'Updating…' : (
                  <>
                    <CheckCircle2 size={16} />
                    Update password
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
