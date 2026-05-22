import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Button from '../components/Button';
import './AdminUsers.css';

function UserForm({ initial = {}, events, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'staff',
    accessible_event_ids: [],
    ...initial,
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleEvent = eventId => {
    setForm(prev => {
      const ids = new Set(prev.accessible_event_ids ?? []);
      ids.has(eventId) ? ids.delete(eventId) : ids.add(eventId);
      return { ...prev, accessible_event_ids: [...ids] };
    });
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.error ?? '操作失敗'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label>姓名 *</label><input required value={form.name} onChange={set('name')} /></div>
      <div className="field"><label>Email *</label>
        <input required type="email" value={form.email} onChange={set('email')} disabled={!!initial.user_id} />
      </div>
      <div className="field"><label>角色</label>
        <select value={form.role} onChange={set('role')}>
          <option value="staff">工作人員</option>
          <option value="admin">管理者</option>
        </select>
      </div>
      <div className="field">
        <label>可見活動</label>
        {form.role === 'admin' ? (
          <div className="access-help">管理者預設可查看所有活動，無需另外指派。</div>
        ) : events.length === 0 ? (
          <div className="access-help">目前尚無活動可指派。</div>
        ) : (
          <div className="event-access-list">
            {events.map(event => (
              <label key={event.event_id} className="event-access-item">
                <input
                  type="checkbox"
                  checked={(form.accessible_event_ids ?? []).includes(event.event_id)}
                  onChange={() => toggleEvent(event.event_id)}
                />
                <span>{event.event_name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {!initial.user_id && (
        <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
          建立後系統將自動產生密碼並發送至該 Email。
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>{initial.user_id ? '儲存' : '建立'}</Button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const { user: me } = useAuth();

  const load = async () => {
    const [usersRes, eventsRes] = await Promise.all([
      api.get('/users'),
      api.get('/events'),
    ]);
    setUsers(usersRes.data);
    setEvents(eventsRes.data);
  };

  useEffect(() => {
    const init = async () => {
      await load();
    };
    init();
  }, []);

  const handleAdd = async form => {
    await api.post('/users', form);
    toast.success('使用者已建立，密碼已發送 Email');
    load();
  };

  const handleEdit = async form => {
    await api.put(`/users/${editing.user_id}`, form);
    toast.success('已更新');
    load();
  };

  const handleDelete = async id => {
    if (id === me.user_id) return toast.error('無法刪除自己的帳號');
    if (!confirm('確定刪除此使用者？')) return;
    await api.delete(`/users/${id}`);
    toast.success('已刪除');
    load();
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>使用者管理</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: 4 }}>共 {users.length} 位使用者</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} /> 新增使用者
        </Button>
      </div>

      <div className="users-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>Email</th>
              <th>角色</th>
              <th>可見活動</th>
              <th>建立時間</th>
              <th style={{ width: 80 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar">{u.name?.[0]}</div>
                    {u.name}
                    {u.user_id === me.user_id && <span className="badge gray">我</span>}
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  {u.role === 'admin'
                    ? <span className="badge success"><Shield size={11} /> 管理者</span>
                    : <span className="badge gray"><User size={11} /> 工作人員</span>}
                </td>
                <td>
                  {u.role === 'admin'
                    ? <span className="badge success">全部活動</span>
                    : (
                      <div className="access-badges">
                        {(u.accessible_event_ids ?? []).length === 0
                          ? <span className="badge gray">未指派</span>
                          : events
                            .filter(event => (u.accessible_event_ids ?? []).includes(event.event_id))
                            .map(event => <span key={event.event_id} className="badge gray">{event.event_name}</span>)}
                      </div>
                    )}
                </td>
                <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-TW') : '-'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" onClick={() => setEditing(u)}><Edit2 size={14} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(u.user_id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="新增使用者" onClose={() => setShowAdd(false)}>
          <UserForm events={events} onSave={handleAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="編輯使用者" onClose={() => setEditing(null)}>
          <UserForm initial={editing} events={events} onSave={handleEdit} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </Layout>
  );
}
