import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import {
  getSheetData, appendRow, updateRow, deleteRow,
  ensureEventSheet, eventSheetName, participantHeaders,
} from '../services/sheetsService.js';
import { sendQRCodeEmail } from '../services/emailService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage() });

// ── helpers ──────────────────────────────────────────────────────────────────

function generateRegId(eventId, seq) {
  return `${eventId.slice(0, 6).toUpperCase()}-${String(seq).padStart(4, '0')}`;
}

function buildParticipantRow(p, regId, qrToken) {
  return [
    regId,
    p.name,
    p.email,
    p.phone ?? '',
    p.unit ?? '',
    qrToken,
    'FALSE',
    '',
    'FALSE',
    p.gender ?? '',
  ];
}

async function getEventTemplate(eid) {
  const templates = await getSheetData('email_templates');
  return templates.find(t => t.event_id === eid) ?? null;
}

async function sendParticipantQR(participant, eventName, template) {
  await sendQRCodeEmail(participant.email, participant.name, participant.reg_id, eventName, participant.qr_token, template);
}

// ── routes ───────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { eid } = req.params;
  await ensureEventSheet(eid);
  const participants = await getSheetData(eventSheetName(eid));
  res.json(participants);
});

// Single add
router.post('/', async (req, res) => {
  const { eid } = req.params;
  const { name, email, phone, unit, gender } = req.body;
  if (!name) return res.status(400).json({ error: '請提供姓名' });

  await ensureEventSheet(eid);
  const existing = await getSheetData(eventSheetName(eid));
  const seq = existing.length + 1;
  const regId = generateRegId(eid, seq);
  const qrToken = uuidv4();

  await appendRow(eventSheetName(eid), buildParticipantRow({ name, email, phone, unit, gender }, regId, qrToken));
  res.status(201).json({ reg_id: regId, name, email, phone, unit, gender, qr_token: qrToken });
});

// Bulk import via Excel
router.post('/import', upload.single('file'), async (req, res) => {
  const { eid } = req.params;
  if (!req.file) return res.status(400).json({ error: '請上傳 Excel 檔案' });

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) return res.status(400).json({ error: 'Excel 無資料' });

  await ensureEventSheet(eid);
  const existing = await getSheetData(eventSheetName(eid));
  let seq = existing.length + 1;

  // Build a case/space-insensitive lookup for each row
  const col = (row, ...keys) => {
    const normalizedRow = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
    );
    for (const k of keys) {
      const v = normalizedRow[k.trim().toLowerCase()];
      if (v !== undefined && v !== '') return String(v).trim();
    }
    return '';
  };

  const added = [];
  for (const row of rows) {
    const name = col(row, '姓名', 'name');
    if (!name) continue;

    const regId = generateRegId(eid, seq++);
    const qrToken = uuidv4();
    const p = {
      name,
      email: col(row, 'email', 'Email', 'e-mail'),
      phone: col(row, '電話', 'phone', '手機', '電話號碼'),
      unit: col(row, '單位', 'unit', '公司', '機關'),
      gender: col(row, '性別', 'gender', 'sex'),
    };
    await appendRow(eventSheetName(eid), buildParticipantRow(p, regId, qrToken));
    added.push({ reg_id: regId, ...p, qr_token: qrToken });
  }

  res.status(201).json({ imported: added.length, participants: added });
});

// Edit participant
router.put('/:regId', async (req, res) => {
  const { eid, regId } = req.params;
  const { name, email, phone, unit, gender } = req.body;
  if (!name) return res.status(400).json({ error: '請提供姓名' });

  const participants = await getSheetData(eventSheetName(eid));
  const idx = participants.findIndex(p => p.reg_id === regId);
  if (idx === -1) return res.status(404).json({ error: '參與者不存在' });

  const p = participants[idx];
  const row = participantHeaders.map(h => p[h] ?? '');
  row[participantHeaders.indexOf('name')] = name;
  row[participantHeaders.indexOf('email')] = email ?? '';
  row[participantHeaders.indexOf('phone')] = phone ?? '';
  row[participantHeaders.indexOf('unit')] = unit ?? '';
  row[participantHeaders.indexOf('gender')] = gender ?? '';
  await updateRow(eventSheetName(eid), idx + 1, row);

  res.json({ reg_id: regId, name, email, phone, unit, gender });
});

// Delete participant
router.delete('/:regId', async (req, res) => {
  const { eid, regId } = req.params;
  const participants = await getSheetData(eventSheetName(eid));
  const idx = participants.findIndex(p => p.reg_id === regId);
  if (idx === -1) return res.status(404).json({ error: '參與者不存在' });

  await deleteRow(eventSheetName(eid), idx + 1);
  res.json({ message: '已刪除' });
});

// Send QR to single participant
router.post('/:regId/send-email', async (req, res) => {
  const { eid, regId } = req.params;
  const participants = await getSheetData(eventSheetName(eid));
  const idx = participants.findIndex(p => p.reg_id === regId);
  if (idx === -1) return res.status(404).json({ error: '參與者不存在' });

  const p = participants[idx];
  const [events, template] = await Promise.all([
    getSheetData('events'),
    getEventTemplate(eid),
  ]);
  const event = events.find(e => e.event_id === eid);

  await sendParticipantQR(p, event?.event_name ?? '活動', template);

  // Mark email_sent = TRUE
  const row = participantHeaders.map(h => p[h] ?? '');
  row[participantHeaders.indexOf('email_sent')] = 'TRUE';
  await updateRow(eventSheetName(eid), idx + 1, row);

  res.json({ message: `已發送 QR Code 給 ${p.name}` });
});

// Send QR to multiple participants (body: { regIds: [...] } or send to all if omitted)
router.post('/send-emails', async (req, res) => {
  const { eid } = req.params;
  const { regIds } = req.body; // undefined = send all

  const [participants, events, template] = await Promise.all([
    getSheetData(eventSheetName(eid)),
    getSheetData('events'),
    getEventTemplate(eid),
  ]);
  const event = events.find(e => e.event_id === eid);
  const eventName = event?.event_name ?? '活動';

  const targets = regIds
    ? participants.filter(p => regIds.includes(p.reg_id))
    : participants;

  const results = { success: [], failed: [] };

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    if (!targets.find(t => t.reg_id === p.reg_id)) continue;

    try {
      await sendParticipantQR(p, eventName, template);
      const row = participantHeaders.map(h => p[h] ?? '');
      row[participantHeaders.indexOf('email_sent')] = 'TRUE';
      await updateRow(eventSheetName(eid), i + 1, row);
      results.success.push(p.reg_id);
    } catch {
      results.failed.push(p.reg_id);
    }
  }

  res.json(results);
});

// Check-in stats
router.get('/stats', async (req, res) => {
  const { eid } = req.params;
  const participants = await getSheetData(eventSheetName(eid));
  const total = participants.length;
  const checkedIn = participants.filter(p => p.checked_in === 'TRUE').length;
  res.json({ total, checked_in: checkedIn, pending: total - checkedIn });
});

// QR scan check-in
router.post('/checkin', async (req, res) => {
  const { eid } = req.params;
  const { qr_token } = req.body;
  if (!qr_token) return res.status(400).json({ error: '請提供 QR token' });

  const participants = await getSheetData(eventSheetName(eid));
  const idx = participants.findIndex(p => p.qr_token === qr_token);
  if (idx === -1) return res.status(404).json({ error: '無效的 QR Code' });

  const p = participants[idx];
  if (p.checked_in === 'TRUE') {
    return res.status(409).json({
      error: '已報到',
      participant: { name: p.name, reg_id: p.reg_id, checkin_time: p.checkin_time },
    });
  }

  const checkin_time = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const row = participantHeaders.map(h => p[h] ?? '');
  row[participantHeaders.indexOf('checked_in')] = 'TRUE';
  row[participantHeaders.indexOf('checkin_time')] = checkin_time;
  await updateRow(eventSheetName(eid), idx + 1, row);

  res.json({
    success: true,
    participant: { name: p.name, reg_id: p.reg_id, unit: p.unit, checkin_time },
  });
});

// Manual check-in by reg_id
router.post('/:regId/checkin', async (req, res) => {
  const { eid, regId } = req.params;
  const participants = await getSheetData(eventSheetName(eid));
  const idx = participants.findIndex(p => p.reg_id === regId);
  if (idx === -1) return res.status(404).json({ error: '參與者不存在' });

  const p = participants[idx];
  if (p.checked_in === 'TRUE') {
    return res.status(409).json({ error: '已報到', participant: p });
  }

  const checkin_time = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const row = participantHeaders.map(h => p[h] ?? '');
  row[participantHeaders.indexOf('checked_in')] = 'TRUE';
  row[participantHeaders.indexOf('checkin_time')] = checkin_time;
  await updateRow(eventSheetName(eid), idx + 1, row);

  res.json({ success: true, participant: { name: p.name, reg_id: p.reg_id, unit: p.unit, checkin_time } });
});

export default router;
