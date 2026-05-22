import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getSheetData, appendRow, updateRow, deleteRow } from '../services/sheetsService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sendPasswordEmail } from '../services/emailService.js';
import { getUserEventAccessRows, removeUserEventAccess, replaceUserEventAccess } from '../services/accessService.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  const [users, accessRows] = await Promise.all([
    getSheetData('users'),
    getUserEventAccessRows(),
  ]);
  res.json(users.map(u => ({
    ...u,
    password_hash: undefined,
    accessible_event_ids: accessRows
      .filter(row => row.user_id === u.user_id && row.event_id)
      .map(row => row.event_id),
  })));
});

router.post('/', async (req, res) => {
  const { name, email, role = 'staff', accessible_event_ids = [] } = req.body;
  if (!name || !email) return res.status(400).json({ error: '請提供姓名和 email' });

  const [users, events] = await Promise.all([
    getSheetData('users'),
    getSheetData('events'),
  ]);
  if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email 已存在' });
  const validEventIds = new Set(events.map(event => event.event_id));
  const filteredEventIds = accessible_event_ids.filter(eventId => validEventIds.has(eventId));

  const password = Math.random().toString(36).slice(-10) + 'A1!';
  const hash = await bcrypt.hash(password, 10);
  const user_id = uuidv4();
  const created_at = new Date().toISOString();

  await appendRow('users', [user_id, name, email, hash, role, created_at]);
  await replaceUserEventAccess(user_id, role === 'admin' ? [] : filteredEventIds);

  try {
    await sendPasswordEmail(email, name, password);
  } catch (err) {
    console.error('寄送密碼 Email 失敗:', err.message);
  }

  res.status(201).json({ user_id, name, email, role, created_at, accessible_event_ids: filteredEventIds });
});

router.put('/:id', async (req, res) => {
  const { name, email, role, accessible_event_ids = [] } = req.body;
  const [users, events] = await Promise.all([
    getSheetData('users'),
    getSheetData('events'),
  ]);
  const idx = users.findIndex(u => u.user_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '使用者不存在' });
  const validEventIds = new Set(events.map(event => event.event_id));
  const filteredEventIds = accessible_event_ids.filter(eventId => validEventIds.has(eventId));

  const u = users[idx];
  const nextRole = role ?? u.role;
  const updated = [
    u.user_id,
    name ?? u.name,
    email ?? u.email,
    u.password_hash,
    nextRole,
    u.created_at,
  ];
  await updateRow('users', idx + 1, updated);
  await replaceUserEventAccess(req.params.id, nextRole === 'admin' ? [] : filteredEventIds);
  res.json({ message: '已更新' });
});

router.delete('/:id', async (req, res) => {
  const users = await getSheetData('users');
  const idx = users.findIndex(u => u.user_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '使用者不存在' });

  await deleteRow('users', idx + 1); // +1 because header is row 0
  await removeUserEventAccess(req.params.id);
  res.json({ message: '已刪除' });
});

export default router;
