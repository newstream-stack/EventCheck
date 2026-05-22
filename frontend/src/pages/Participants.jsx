import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Upload, Trash2, Mail, Send, CheckCircle,
  Clock, ScanLine, ArrowLeft, Search, Settings, QrCode, Printer, UserCheck, ChevronDown, Pencil,
  Bold, Italic, Underline, Link, Link2Off, AlignLeft, AlignCenter,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Button from '../components/Button';
import './Participants.css';

function UnitDropdown({ units, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const options = [{ val: '', label: '所有單位' }, ...units.map(u => ({ val: u, label: u }))];
  const current = options.find(o => o.val === value)?.label ?? '所有單位';

  return (
    <div className="custom-select" ref={ref}>
      <button className="custom-select-btn" onClick={() => setOpen(o => !o)}>
        <span>{current}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="custom-select-menu">
          {options.map(o => (
            <button
              key={o.val}
              className={`custom-select-item${value === o.val ? ' active' : ''}`}
              onClick={() => { onChange(o.val); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', unit: '', gender: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async ev => {
    ev.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.error ?? '新增失敗'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label>姓名 *</label><input required value={form.name} onChange={set('name')} /></div>
      <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="無則留空" /></div>
      <div className="field"><label>電話</label><input value={form.phone} onChange={set('phone')} /></div>
      <div className="field"><label>單位</label><input value={form.unit} onChange={set('unit')} /></div>
      <div className="field">
        <label>性別</label>
        <select value={form.gender} onChange={set('gender')}>
          <option value="">不填寫</option>
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>新增</Button>
      </div>
    </form>
  );
}

function EditForm({ participant, onSave, onClose }) {
  const [form, setForm] = useState({
    name: participant.name ?? '',
    email: participant.email ?? '',
    phone: participant.phone ?? '',
    unit: participant.unit ?? '',
    gender: participant.gender ?? '',
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async ev => {
    ev.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.error ?? '儲存失敗'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label>姓名 *</label><input required value={form.name} onChange={set('name')} /></div>
      <div className="field"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="無則留空" /></div>
      <div className="field"><label>電話</label><input value={form.phone} onChange={set('phone')} /></div>
      <div className="field"><label>單位</label><input value={form.unit} onChange={set('unit')} /></div>
      <div className="field">
        <label>性別</label>
        <select value={form.gender} onChange={set('gender')}>
          <option value="">不填寫</option>
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>儲存</Button>
      </div>
    </form>
  );
}

function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const lastHtmlRef = useRef(value);
  const [htmlMode, setHtmlMode] = useState(false);

  // Set innerHTML on mount
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync back when switching HTML → visual mode
  useEffect(() => {
    if (!htmlMode && editorRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, [htmlMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const savedRange = useRef(null);

  const exec = cmd => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, null);
    handleInput();
  };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    const sel = window.getSelection();
    if (savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const insertLink = () => {
    const url = prompt('輸入連結網址（例如：https://example.com）：');
    if (!url) return;
    editorRef.current?.focus();
    restoreRange();
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    if (range && !range.collapsed) {
      // 有選取文字：把選取內容包進 <a>
      a.appendChild(range.extractContents());
      range.insertNode(a);
    } else {
      // 無選取：插入網址文字作為連結
      a.textContent = url;
      if (range) {
        range.insertNode(a);
      } else {
        editorRef.current.appendChild(a);
      }
    }

    // 移動游標到連結後面
    const after = document.createRange();
    after.setStartAfter(a);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    handleInput();
  };

  const insertVar = key => {
    if (htmlMode) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(key));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    handleInput();
  };

  const handleInput = () => {
    const html = editorRef.current?.innerHTML ?? '';
    lastHtmlRef.current = html;
    onChange(html);
  };

  const toggleMode = () => {
    if (!htmlMode) {
      // visual → HTML: value already up to date
      setHtmlMode(true);
    } else {
      // HTML → visual: push textarea value into editor
      if (editorRef.current) editorRef.current.innerHTML = value;
      lastHtmlRef.current = value;
      setHtmlMode(false);
    }
  };

  const VARS = [
    { key: '{{name}}', desc: '姓名' },
    { key: '{{reg_id}}', desc: '報名編號' },
    { key: '{{event_name}}', desc: '活動名稱' },
    { key: '{{qr_code}}', desc: 'QR Code（必須）' },
  ];

  return (
    <div className="rich-editor">
      {/* Var chips */}
      <div className="rich-editor-vars">
        <span className="rich-editor-vars-label">插入變數：</span>
        {VARS.map(v => (
          <button key={v.key} type="button" className="var-chip" title={v.desc}
            onClick={() => insertVar(v.key)}>{v.key}</button>
        ))}
      </div>

      {!htmlMode && (
        <div className="rich-editor-toolbar">
          <button type="button" className="toolbar-btn" title="粗體" onMouseDown={e => { e.preventDefault(); exec('bold'); }}><Bold size={14} /></button>
          <button type="button" className="toolbar-btn" title="斜體" onMouseDown={e => { e.preventDefault(); exec('italic'); }}><Italic size={14} /></button>
          <button type="button" className="toolbar-btn" title="底線" onMouseDown={e => { e.preventDefault(); exec('underline'); }}><Underline size={14} /></button>
          <span className="toolbar-sep" />
          <button type="button" className="toolbar-btn" title="加入超連結" onMouseDown={e => { e.preventDefault(); saveRange(); }} onClick={insertLink}><Link size={14} /></button>
          <button type="button" className="toolbar-btn" title="移除超連結" onMouseDown={e => { e.preventDefault(); exec('unlink'); }}><Link2Off size={14} /></button>
          <span className="toolbar-sep" />
          <button type="button" className="toolbar-btn" title="靠左" onMouseDown={e => { e.preventDefault(); exec('justifyLeft'); }}><AlignLeft size={14} /></button>
          <button type="button" className="toolbar-btn" title="置中" onMouseDown={e => { e.preventDefault(); exec('justifyCenter'); }}><AlignCenter size={14} /></button>
        </div>
      )}

      {htmlMode ? (
        <textarea
          className="rich-editor-html"
          rows={12}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          className="rich-editor-body"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
        />
      )}

      <div className="rich-editor-footer">
        <button type="button" className="html-toggle-btn" onClick={toggleMode}>
          {htmlMode ? '切換回視覺編輯' : '切換到 HTML 模式'}
        </button>
      </div>
    </div>
  );
}

function EmailTemplateForm({ eid, onClose }) {
  const [form, setForm] = useState({ subject: '', body_html: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get(`/events/${eid}/email-template`)
      .then(({ data }) => setForm({ subject: data.subject, body_html: data.body_html }))
      .catch(() => toast.error('載入模板失敗'))
      .finally(() => setFetching(false));
  }, [eid]);

  const sanitizeLinks = html => {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('a').forEach(a => {
      if (!a.getAttribute('href')) a.setAttribute('href', a.textContent.trim());
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    return div.innerHTML;
  };

  const handleSubmit = async ev => {
    ev.preventDefault();
    setLoading(true);
    try {
      await api.put(`/events/${eid}/email-template`, { ...form, body_html: sanitizeLinks(form.body_html) });
      toast.success('Email 模板已儲存');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error ?? '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p style={{ color: 'var(--gray-500)' }}>載入中…</p>;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="field">
        <label>主旨</label>
        <input required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="【{{event_name}}】您的報到 QR Code" />
      </div>
      <div className="field">
        <label>Email 內文</label>
        <RichEditor value={form.body_html} onChange={v => setForm(p => ({ ...p, body_html: v }))} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>儲存模板</Button>
      </div>
    </form>
  );
}

function QRModal({ participant, eventName, onClose }) {
  const seq = participant.reg_id?.split('-')[1] ?? participant.reg_id;

  const handlePrint = () => {
    const svg = document.getElementById('qr-print-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Code — ${participant.name}</title>
      <style>
        body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
        .card { text-align: center; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px; }
        .name { font-size: 24px; font-weight: 700; margin: 16px 0 4px; }
        .meta { font-size: 14px; color: #6b7280; }
      </style></head><body>
      <div class="card">
        ${svgData}
        <div class="name">${participant.name}</div>
        <div class="meta">#${seq}${participant.unit ? ' · ' + participant.unit : ''}</div>
        <div class="meta" style="margin-top:4px">${eventName ?? ''}</div>
      </div>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <QRCodeSVG
        id="qr-print-svg"
        value={participant.qr_token}
        size={220}
        level="M"
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{participant.name}</div>
        <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4 }}>
          #{seq}{participant.unit ? ` · ${participant.unit}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="ghost" onClick={handlePrint}><Printer size={14} /> 列印</Button>
        <Button variant="ghost" onClick={onClose}>關閉</Button>
      </div>
    </div>
  );
}

/* Mobile card for one participant row */
function ParticipantCard({ p, selected, onToggle, onSendOne, onDelete, onShowQR, onCheckin, onEdit }) {
  return (
    <div className={`p-card${p.checked_in === 'TRUE' ? ' p-card-checked' : ''}`}>
      <div className="p-card-top">
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <div className="p-card-name">{p.name}</div>
        <div className="p-card-actions">
          {p.checked_in !== 'TRUE' && (
            <button className="icon-btn success" title="手動報到" onClick={onCheckin}><UserCheck size={15} /></button>
          )}
          <button className="icon-btn" title="顯示 QR Code" onClick={onShowQR}><QrCode size={15} /></button>
          {p.email && (
            <button className="icon-btn" title="發送 QR Code" onClick={onSendOne}><Mail size={15} /></button>
          )}
          <button className="icon-btn" title="編輯" onClick={onEdit}><Pencil size={15} /></button>
          <button className="icon-btn danger" title="刪除" onClick={onDelete}><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="p-card-meta">
        <span className="mono">{p.reg_id.split('-').pop()}</span>
        {p.gender && <span>{p.gender}</span>}
        {p.unit && <span>{p.unit}</span>}
        {p.phone && <span>{p.phone}</span>}
      </div>
      {p.email && <div className="p-card-email">{p.email}</div>}
      <div className="p-card-badges">
        {p.checked_in === 'TRUE'
          ? <span className="badge success"><CheckCircle size={11} /> 已報到</span>
          : <span className="badge pending"><Clock size={11} /> 未報到</span>}
        {p.email
          ? (p.email_sent === 'TRUE'
            ? <span className="badge success">QR 已發</span>
            : <span className="badge gray">QR 未發</span>)
          : <span className="badge gray">無 Email</span>}
      </div>
    </div>
  );
}

export default function Participants() {
  const { eid } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [qrTarget, setQrTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterCheckin, setFilterCheckin] = useState('');
  const [filterQR, setFilterQR] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const fileRef = useRef();

  const load = async () => {
    try {
      const [pRes, eRes, sRes] = await Promise.all([
        api.get(`/events/${eid}/participants`),
        api.get('/events'),
        api.get(`/events/${eid}/participants/stats`),
      ]);
      setParticipants(pRes.data);
      setEvent(eRes.data.find(e => e.event_id === eid));
      setStats(sRes.data);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('您沒有權限查看此活動');
        navigate('/events', { replace: true });
        return;
      }
      toast.error('載入資料失敗：' + (err.response?.data?.error ?? err.message));
    }
  };

  useEffect(() => {
    const refresh = async () => {
      await load();
    };

    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [eid, navigate]);

  const units = [...new Set(participants.map(p => p.unit).filter(Boolean))].sort();

  const filtered = participants.filter(p => {
    if (search && ![p.name, p.email, p.phone, p.unit, p.reg_id].some(v => v?.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterUnit && p.unit !== filterUnit) return false;
    if (filterCheckin === 'checked' && p.checked_in !== 'TRUE') return false;
    if (filterCheckin === 'pending' && p.checked_in === 'TRUE') return false;
    if (filterQR === 'sent' && p.email_sent !== 'TRUE') return false;
    if (filterQR === 'unsent' && p.email_sent === 'TRUE') return false;
    if (filterGender && p.gender !== filterGender) return false;
    return true;
  });

  const handleEdit = async (regId, form) => {
    await api.put(`/events/${eid}/participants/${regId}`, form);
    toast.success('已儲存');
    load();
  };

  const handleAdd = async form => {
    await api.post(`/events/${eid}/participants`, form);
    toast.success('已新增');
    load();
  };

  const handleDelete = async regId => {
    if (!confirm('確定刪除此參與者？')) return;
    await api.delete(`/events/${eid}/participants/${regId}`);
    toast.success('已刪除');
    load();
  };

  const handleImport = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post(`/events/${eid}/participants/import`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`匯入 ${data.imported} 筆成功`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error ?? '匯入失敗');
    }
    e.target.value = '';
  };

  const sendSelected = async () => {
    setSending(true);
    try {
      const regIds = selected.size > 0 ? [...selected] : undefined;
      const { data } = await api.post(`/events/${eid}/participants/send-emails`, { regIds });
      toast.success(`成功發送 ${data.success.length} 封，失敗 ${data.failed.length} 封`);
      setSelected(new Set());
      load();
    } catch { toast.error('發送失敗'); }
    finally { setSending(false); }
  };

  const handleCheckin = async regId => {
    if (!confirm('確定手動報到？')) return;
    try {
      await api.post(`/events/${eid}/participants/${regId}/checkin`);
      toast.success('報到成功');
      load();
    } catch (err) { toast.error(err.response?.data?.error ?? '報到失敗'); }
  };

  const sendOne = async regId => {
    try {
      await api.post(`/events/${eid}/participants/${regId}/send-email`);
      toast.success('QR Code 已發送');
      load();
    } catch (err) { toast.error(err.response?.data?.error ?? '發送失敗'); }
  };

  const toggleSelect = regId => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(regId) ? n.delete(regId) : n.add(regId);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.reg_id)));
  };

  return (
    <Layout>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <button className="icon-btn" onClick={() => navigate('/events')}><ArrowLeft size={18} /></button>
          <div>
            <h2>{event?.event_name ?? '活動'}</h2>
            {stats && (
              <div className="stats-row">
                <span className="stat-chip total">總計 {stats.total}</span>
                <span className="stat-chip checked">已報到 {stats.checked_in}</span>
                <span className="stat-chip pending">未報到 {stats.pending}</span>
              </div>
            )}
          </div>
        </div>
        <div className="page-header-actions">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eid}/checkin`)}>
            <ScanLine size={14} /> <span className="btn-label">掃碼報到</span>
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setShowEmailTemplate(true)}>
              <Settings size={14} /> <span className="btn-label">Email 設定</span>
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => fileRef.current.click()}>
            <Upload size={14} /> <span className="btn-label">匯入</span>
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> <span className="btn-label">新增</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input placeholder="搜尋姓名、Email、單位…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-actions">
          {selected.size > 0 && (
            <Button size="sm" variant="success" loading={sending} onClick={sendSelected}>
              <Send size={14} /> 發送選取 ({selected.size})
            </Button>
          )}
          <Button size="sm" variant="success" loading={sending} onClick={sendSelected}>
            <Mail size={14} /> 全部發送
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="filter-row">
        {units.length > 0 && (
          <UnitDropdown units={units} value={filterUnit} onChange={setFilterUnit} />
        )}
        <div className="filter-group">
          {[['', '全部'], ['checked', '已報到'], ['pending', '未報到']].map(([val, label]) => (
            <button key={val} className={`filter-btn${filterCheckin === val ? ' active' : ''}`} onClick={() => setFilterCheckin(val)}>{label}</button>
          ))}
        </div>
        <div className="filter-group">
          {[['', '全部'], ['sent', 'QR 已發'], ['unsent', 'QR 未發']].map(([val, label]) => (
            <button key={val} className={`filter-btn${filterQR === val ? ' active' : ''}`} onClick={() => setFilterQR(val)}>{label}</button>
          ))}
        </div>
        <div className="filter-group">
          {[['', '全部性別'], ['男', '男'], ['女', '女'], ['其他', '其他']].map(([val, label]) => (
            <button key={val} className={`filter-btn${filterGender === val ? ' active' : ''}`} onClick={() => setFilterGender(val)}>{label}</button>
          ))}
        </div>
        <span className="filter-count">{filtered.length} 筆</span>
      </div>

      {/* Desktop table */}
      <div className="table-wrap desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
              </th>
              <th>報名編號</th>
              <th>姓名</th>
              <th>性別</th>
              <th>Email</th>
              <th>電話</th>
              <th>單位</th>
              <th>報到</th>
              <th>QR 已發</th>
              <th style={{ width: 100 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.reg_id} className={p.checked_in === 'TRUE' ? 'row-checked' : ''}>
                <td><input type="checkbox" checked={selected.has(p.reg_id)} onChange={() => toggleSelect(p.reg_id)} /></td>
                <td className="mono">{p.reg_id.split('-').pop()}</td>
                <td>{p.name}</td>
                <td>{p.gender}</td>
                <td>{p.email}</td>
                <td>{p.phone}</td>
                <td>{p.unit}</td>
                <td>
                  {p.checked_in === 'TRUE'
                    ? <span className="badge success"><CheckCircle size={12} /> 已報到</span>
                    : <span className="badge pending"><Clock size={12} /> 未報到</span>}
                </td>
                <td>
                  {p.email
                    ? (p.email_sent === 'TRUE'
                      ? <span className="badge success">已發送</span>
                      : <span className="badge gray">未發送</span>)
                    : <span className="badge gray">無 Email</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {p.checked_in !== 'TRUE' && (
                      <button className="icon-btn success" title="手動報到" onClick={() => handleCheckin(p.reg_id)}><UserCheck size={14} /></button>
                    )}
                    <button className="icon-btn" title="顯示 QR Code" onClick={() => setQrTarget(p)}><QrCode size={14} /></button>
                    {p.email && (
                      <button className="icon-btn" title="發送 QR Code" onClick={() => sendOne(p.reg_id)}><Mail size={14} /></button>
                    )}
                    <button className="icon-btn" title="編輯" onClick={() => setEditTarget(p)}><Pencil size={14} /></button>
                    <button className="icon-btn danger" title="刪除" onClick={() => handleDelete(p.reg_id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '40px 0' }}>
                {search ? '無符合結果' : '尚無參與者'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="p-card-list mobile-only">
        <div className="p-card-select-all">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-600)' }}>
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
            全選（{filtered.length} 筆）
          </label>
        </div>
        {filtered.map(p => (
          <ParticipantCard
            key={p.reg_id}
            p={p}
            selected={selected.has(p.reg_id)}
            onToggle={() => toggleSelect(p.reg_id)}
            onSendOne={() => sendOne(p.reg_id)}
            onDelete={() => handleDelete(p.reg_id)}
            onShowQR={() => setQrTarget(p)}
            onCheckin={() => handleCheckin(p.reg_id)}
            onEdit={() => setEditTarget(p)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '40px 0' }}>
            {search ? '無符合結果' : '尚無參與者'}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="新增參與者" onClose={() => setShowAdd(false)}>
          <AddForm onSave={handleAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}

      {showEmailTemplate && (
        <Modal title="Email 模板設定" onClose={() => setShowEmailTemplate(false)}>
          <EmailTemplateForm eid={eid} onClose={() => setShowEmailTemplate(false)} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="編輯參與者" onClose={() => setEditTarget(null)}>
          <EditForm
            participant={editTarget}
            onSave={form => handleEdit(editTarget.reg_id, form)}
            onClose={() => setEditTarget(null)}
          />
        </Modal>
      )}

      {qrTarget && (
        <Modal title="QR Code" onClose={() => setQrTarget(null)}>
          <QRModal participant={qrTarget} eventName={event?.event_name} onClose={() => setQrTarget(null)} />
        </Modal>
      )}
    </Layout>
  );
}
