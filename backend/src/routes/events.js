import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getSheetData, appendRow, updateRow, deleteRow, ensureEventSheet } from '../services/sheetsService.js';
import { authenticate, requireAdmin, requireEventAccess } from '../middleware/auth.js';
import { DEFAULT_SUBJECT, DEFAULT_BODY } from '../services/emailService.js';
import { getUserAccessibleEventIds } from '../services/accessService.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const events = await getSheetData('events');
  if (req.user.role === 'admin') {
    return res.json(events);
  }

  const eventIds = await getUserAccessibleEventIds(req.user.user_id);
  return res.json(events.filter(event => eventIds.includes(event.event_id)));
});

router.post('/', requireAdmin, async (req, res) => {
  const { event_name, event_date, location, description } = req.body;
  if (!event_name) return res.status(400).json({ error: '請提供活動名稱' });

  const event_id = uuidv4().replace(/-/g, '').slice(0, 12);
  const created_at = new Date().toISOString();

  await appendRow('events', [event_id, event_name, event_date ?? '', location ?? '', description ?? '', created_at]);
  await ensureEventSheet(event_id);

  res.status(201).json({ event_id, event_name, event_date, location, description, created_at });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { event_name, event_date, location, description } = req.body;
  const events = await getSheetData('events');
  const idx = events.findIndex(e => e.event_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '活動不存在' });

  const e = events[idx];
  await updateRow('events', idx + 1, [
    e.event_id,
    event_name ?? e.event_name,
    event_date ?? e.event_date,
    location ?? e.location,
    description ?? e.description,
    e.created_at,
  ]);
  res.json({ message: '已更新' });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const events = await getSheetData('events');
  const idx = events.findIndex(e => e.event_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '活動不存在' });

  await deleteRow('events', idx + 1);
  // Sheet data is retained per requirement
  res.json({ message: '已刪除（參與者資料已保留）' });
});

router.get('/:id/email-template', requireEventAccess('id'), async (req, res) => {
  const templates = await getSheetData('email_templates');
  const tmpl = templates.find(t => t.event_id === req.params.id);
  if (!tmpl) {
    return res.json({ event_id: req.params.id, subject: DEFAULT_SUBJECT, body_html: DEFAULT_BODY, is_default: true });
  }
  res.json({ ...tmpl, is_default: false });
});

router.put('/:id/email-template', requireEventAccess('id'), async (req, res) => {
  const { subject, body_html } = req.body;
  if (!subject || !body_html) return res.status(400).json({ error: '請提供 subject 和 body_html' });

  const templates = await getSheetData('email_templates');
  const idx = templates.findIndex(t => t.event_id === req.params.id);
  const row = [req.params.id, subject, body_html];

  if (idx === -1) {
    await appendRow('email_templates', row);
  } else {
    await updateRow('email_templates', idx + 1, row);
  }
  res.json({ message: '已儲存' });
});

export default router;
