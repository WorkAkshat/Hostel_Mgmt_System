import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, ShieldAlert, Sparkles } from 'lucide-react';

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
      // Redirect based on user role
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else {
        navigate('/staff/visitors');
      }
    } catch (err) {
      // Error handled by AuthContext state
    }
  };

  // Shortcut login helper for evaluation
  const handleQuickLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
  };

  return (
    <div style={styles.container}>
      {/* Decorative Background Elements */}
      <div style={styles.blurBlob1}></div>
      <div style={styles.blurBlob2}></div>

      <div style={styles.card} className="glass-card animate-fade-in">
        <div style={styles.header}>
          <div style={styles.logoWrapper}>
            <Sparkles size={28} color="#6366f1" />
          </div>
          <h1 style={styles.title}>Hostel Hub</h1>
          <p style={styles.subtitle}>Relational Hostel Management System</p>
        </div>

        {/* Display Error Message */}
        {(error || localError) && (
          <div style={styles.errorBanner}>
            <ShieldAlert size={18} />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                className="form-input"
                style={styles.input}
                placeholder="name@hms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputWrapper}>
              <Key size={18} style={styles.inputIcon} />
              <input
                type="password"
                className="form-input"
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins Section */}
        <div style={styles.dividerContainer}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>Demo Quick Login</span>
          <div style={styles.dividerLine}></div>
        </div>

        <div style={styles.quickLoginGrid}>
          <button 
            onClick={() => handleQuickLogin('warden@hms.com')}
            style={styles.quickBtn}
            className="btn-secondary"
            type="button"
          >
            Warden (Admin)
          </button>
          <button 
            onClick={() => handleQuickLogin('pooja@hms.com')}
            style={styles.quickBtn}
            className="btn-secondary"
            type="button"
          >
            Student (Pooja)
          </button>
          <button 
            onClick={() => handleQuickLogin('guard@hms.com')}
            style={styles.quickBtn}
            className="btn-secondary"
            type="button"
          >
            Security (Guard)
          </button>
        </div>
      </div>
    </div>
  );
};

// Vanilla style overrides for Layout positioning
const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
    padding: '1.5rem',
  },
  blurBlob1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    top: '-10%',
    left: '-10%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(236,72,153,0) 70%)',
    filter: 'blur(40px)',
    zIndex: 0,
  },
  blurBlob2: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    bottom: '-15%',
    right: '-10%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 70%)',
    filter: 'blur(50px)',
    zIndex: 0,
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '2.5rem',
    borderRadius: '20px',
    position: 'relative',
    zIndex: 2,
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoWrapper: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    background: 'rgba(236, 72, 153, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem auto',
    border: '1px solid rgba(236, 72, 153, 0.15)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ef4444',
    fontSize: '0.875rem',
    marginBottom: '1.5rem',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    color: '#6b7280',
  },
  input: {
    paddingLeft: '2.75rem',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '1rem',
  },
  dividerContainer: {
    display: 'flex',
    alignItems: 'center',
    margin: '2rem 0 1.5rem 0',
  },
  dividerLine: {
    flexGrow: 1,
    height: '1px',
    background: 'var(--border-color)',
  },
  dividerText: {
    padding: '0 0.75rem',
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  quickLoginGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  quickBtn: {
    padding: '0.6rem 1rem',
    fontSize: '0.85rem',
    justifyContent: 'center',
    width: '100%',
    cursor: 'pointer',
  }
};

export default Login;
