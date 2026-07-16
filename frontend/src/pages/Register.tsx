import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, ShieldCheck, User, Store, Truck, ShieldAlert } from 'lucide-react';
import api from '../utils/api';

type UserRole = 'consumer' | 'merchant' | 'driver';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('consumer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('請填寫所有欄位');
      return;
    }

    if (password.length < 6) {
      setError('密碼長度最少需為 6 個字元');
      return;
    }

    if (password !== confirmPassword) {
      setError('密碼與確認密碼不一致');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/register', {
        email,
        password,
        role,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('註冊失敗，請重試或更換電子信箱');
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
          <h2 style={styles.title}>加入快勢捷</h2>
          <p style={styles.subtitle}>建立您的帳戶以開始使用外送服務</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <ShieldAlert size={18} color="#ef4444" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <ShieldCheck size={18} color="#10b981" />
            <span>註冊成功！正在導向登入頁面...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Role selection using glowing HSL option cards */}
          <div style={styles.inputGroup}>
            <label>選擇註冊身份</label>
            <div style={styles.roleGrid}>
              <div
                style={{
                  ...styles.roleOption,
                  ...(role === 'consumer' ? styles.roleActiveConsumer : {}),
                }}
                onClick={() => setRole('consumer')}
              >
                <User size={20} color={role === 'consumer' ? 'var(--safety-orange)' : 'var(--text-secondary)'} />
                <span style={styles.roleLabel}>消費者</span>
              </div>

              <div
                style={{
                  ...styles.roleOption,
                  ...(role === 'merchant' ? styles.roleActiveMerchant : {}),
                }}
                onClick={() => setRole('merchant')}
              >
                <Store size={20} color={role === 'merchant' ? 'var(--safety-orange)' : 'var(--text-secondary)'} />
                <span style={styles.roleLabel}>合作店家</span>
              </div>

              <div
                style={{
                  ...styles.roleOption,
                  ...(role === 'driver' ? styles.roleActiveDriver : {}),
                }}
                onClick={() => setRole('driver')}
              >
                <Truck size={20} color={role === 'driver' ? 'var(--safety-green)' : 'var(--text-secondary)'} />
                <span style={styles.roleLabel}>外送人員</span>
              </div>
            </div>
          </div>

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
                placeholder="最少 6 個字元"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="confirmPassword">確認密碼</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="confirmPassword"
                type="password"
                placeholder="請再次輸入密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <button
            type="submit"
            className={role === 'driver' ? 'btn btn-green' : 'btn btn-orange'}
            disabled={loading || success}
            style={styles.submitBtn}
          >
            {loading ? (
              <div className="spinner" style={styles.spinner}></div>
            ) : (
              <>
                <UserPlus size={18} />
                <span>註冊帳戶</span>
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <span>已經有帳號了？</span>
          <Link to="/login" style={styles.link}>
            立即登入
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
    maxWidth: '460px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.01)',
    border: '1px solid var(--border-color)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoContainer: {
    fontSize: '48px',
    marginBottom: '12px',
    display: 'inline-block',
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
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    color: '#10b981',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  roleOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 6px',
    backgroundColor: 'var(--bg-dark)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all var(--transition-normal)',
  },
  roleActiveConsumer: {
    borderColor: 'var(--safety-orange)',
    backgroundColor: 'var(--safety-orange-glow)',
    boxShadow: '0 0 10px 0 var(--safety-orange-glow)',
  },
  roleActiveMerchant: {
    borderColor: 'var(--safety-orange)',
    backgroundColor: 'var(--safety-orange-glow)',
    boxShadow: '0 0 10px 0 var(--safety-orange-glow)',
  },
  roleActiveDriver: {
    borderColor: 'var(--safety-green)',
    backgroundColor: 'var(--safety-green-glow)',
    boxShadow: '0 0 10px 0 var(--safety-green-glow)',
  },
  roleLabel: {
    fontSize: '13px',
    fontWeight: 700,
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

export default Register;
