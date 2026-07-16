import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ShieldAlert } from 'lucide-react';
import api from '../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    if (token && role) {
      redirectByRole(role);
    }
  }, []);

  const redirectByRole = (role: string) => {
    if (role === 'consumer') navigate('/consumer');
    else if (role === 'merchant') navigate('/merchant');
    else if (role === 'driver') navigate('/driver');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('請填寫所有欄位');
      return;
    }

    setLoading(true);
    setError('');

    // Backend expects OAuth2 password grant form data (x-www-form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await api.post('/api/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, role } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_role', role);

      redirectByRole(role);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('登入失敗，請檢查您的網路或帳號密碼');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <span style={styles.logoGlow}>🛵</span>
          </div>
          <h2 style={styles.title}>快勢捷外送平台</h2>
          <p style={styles.subtitle}>請登入您的帳戶以繼續</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={18} color="#ef4444" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email">電子信箱</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password">密碼</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                placeholder="請輸入密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-orange"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? (
              <div className="spinner" style={styles.spinner}></div>
            ) : (
              <>
                <LogIn size={18} />
                <span>登入平台</span>
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span>沒有帳號嗎？</span>
          <Link to="/register" style={styles.link}>
            立即註冊
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: 'var(--bg-dark)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.01)',
    border: '1px solid var(--border-color)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoContainer: {
    fontSize: '48px',
    marginBottom: '12px',
    display: 'inline-block',
    animation: 'pulse 2s infinite ease-in-out',
  },
  logoGlow: {
    textShadow: '0 0 20px var(--safety-orange)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  inputWithIcon: {
    paddingLeft: '48px',
  },
  submitBtn: {
    marginTop: '10px',
    width: '100%',
  },
  spinner: {
    width: '20px',
    height: '20px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--safety-orange)',
    fontWeight: 700,
    marginLeft: '6px',
  },
};

export default Login;
