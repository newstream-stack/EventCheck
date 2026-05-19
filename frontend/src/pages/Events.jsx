import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Calendar, MapPin, Edit2, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Button from '../components/Button';
import './Events.css';

function EventForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({ event_name: '', event_date: '', location: '', description: '', ...initial });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async ev => {
    ev.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.error ?? '操作失敗'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label>活動名稱 *</label>
        <input required value={form.event_name} onChange={set('event_name')} placeholder="2024 年度大會" /></div>
      <div className="field"><label>活動日期</label>
        <input type="date" value={form.event_date} onChange={set('event_date')} /></div>
      <div className="field"><label>地點</label>
        <input value={form.location} onChange={set('location')} placeholder="台北市信義區..." /></div>
      <div className="field"><label>說明</label>
        <textarea value={form.description} onChange={set('description')} rows={3} placeholder="活動說明..." style={{ resize: 'vertical', padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)' }} /></div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>儲存</Button>
      </div>
    </form>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (err) {
      toast.error('載入活動失敗：' + (err.response?.data?.error ?? err.message));
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async form => {
    await api.post('/events', form);
    toast.success('活動已建立');
    load();
  };

  const handleEdit = async form => {
    await api.put(`/events/${editing.event_id}`, form);
    toast.success('已更新');
    load();
  };

  const handleDelete = async id => {
    if (!confirm('確定刪除此活動？參與者資料將保留。')) return;
    await api.delete(`/events/${id}`);
    toast.success('已刪除');
    load();
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>活動管理</h2>
          <p style={{ color: 'var(--gray-500)', marginTop: 4 }}>共 {events.length} 個活動</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} /> 新增活動
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <p>尚無活動，請新增第一個活動</p>
        </div>
      ) : (
        <div className="event-grid">
          {events.map(e => (
            <div key={e.event_id} className="event-card">
              <div className="event-card-header">
                <h3>{e.event_name}</h3>
                {isAdmin && (
                  <div className="card-actions">
                    <button onClick={() => setEditing(e)} className="icon-btn"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(e.event_id)} className="icon-btn danger"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
              {e.event_date && <p className="event-meta"><Calendar size={14} />{e.event_date}</p>}
              {e.location && <p className="event-meta"><MapPin size={14} />{e.location}</p>}
              {e.description && <p className="event-desc">{e.description}</p>}
              <div className="event-card-footer">
                <Button size="sm" onClick={() => navigate(`/events/${e.event_id}`)}>
                  管理參與者
                </Button>
                <Button size="sm" variant="success" onClick={() => navigate(`/events/${e.event_id}/checkin`)}>
                  <ScanLine size={14} /> 開始報到
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="新增活動" onClose={() => setShowAdd(false)}>
          <EventForm onSave={handleAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="編輯活動" onClose={() => setEditing(null)}>
          <EventForm initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </Layout>
  );
}
