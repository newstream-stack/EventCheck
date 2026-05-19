import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Button from '../components/Button';

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async ev => {
    ev.preventDefault();
    if (form.newPassword !== form.confirm) return toast.error('新密碼不一致');
    if (form.newPassword.length < 8) return toast.error('新密碼至少 8 個字元');
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('密碼已更新');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error ?? '更新失敗');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 480 }}>
        <div className="page-header">
          <h2>個人設定</h2>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow)' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 600 }}>{user?.name}</p>
            <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>{user?.email}</p>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', marginBottom: 20 }} />
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>修改密碼</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field"><label>目前密碼</label>
              <input type="password" required value={form.currentPassword} onChange={set('currentPassword')} /></div>
            <div className="field"><label>新密碼</label>
              <input type="password" required value={form.newPassword} onChange={set('newPassword')} placeholder="至少 8 個字元" /></div>
            <div className="field"><label>確認新密碼</label>
              <input type="password" required value={form.confirm} onChange={set('confirm')} /></div>
            <Button type="submit" loading={loading} style={{ alignSelf: 'flex-start' }}>更新密碼</Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
