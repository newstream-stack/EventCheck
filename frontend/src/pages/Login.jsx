import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({
    email: localStorage.getItem('remembered_email') ?? '',
    password: localStorage.getItem('remembered_password') ?? '',
  });
  const [remember, setRemember] = useState(!!localStorage.getItem('remembered_email'));
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (remember) {
        localStorage.setItem('remembered_email', form.email);
        localStorage.setItem('remembered_password', form.password);
      } else {
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_password');
      }
      await login(form.email, form.password);
      navigate('/events');
    } catch (err) {
      toast.error(err.response?.data?.error ?? '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <ScanLine size={36} />
        </div>
        <h1 className="login-title">EventCheck</h1>
        <p className="login-subtitle">活動報到系統</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="field">
            <label>密碼</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
            />
            記住帳號密碼
          </label>
          <Button type="submit" size="lg" loading={loading} style={{ width: '100%', marginTop: 8 }}>
            登入
          </Button>
        </form>
      </div>
    </div>
  );
}
