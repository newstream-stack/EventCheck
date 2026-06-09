import { getSheets, SPREADSHEET_ID } from '../config/googleSheets.js';

// ── In-memory TTL cache ──────────────────────────────────────────────────────

const _cache = new Map();
const SHEET_DATA_TTL = 30_000;   // 30 s — participant / event lists
const SHEET_META_TTL = 300_000;  // 5 min — which sheets exist

function _cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return undefined; }
  return entry.data;
}

function _cacheSet(key, data, ttl) {
  _cache.set(key, { data, expiresAt: Date.now() + ttl });
}

function _invalidate(key) { _cache.delete(key); }

// ── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry(fn, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status ?? err?.code;
      const isTransient = status === 500 || status === 503 || status === 429;
      if (!isTransient || attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      lastErr = err;
    }
  }
  throw lastErr;
}

// ── Generic helpers ──────────────────────────────────────────────────────────

export async function getSheetData(sheetName) {
  const cacheKey = `data:${sheetName}`;
  const cached = _cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const sheets = await getSheets();
  const res = await withRetry(() => sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  }));
  const [headers, ...rows] = res.data.values || [];
  const result = headers
    ? rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
    : [];
  _cacheSet(cacheKey, result, SHEET_DATA_TTL);
  return result;
}

export async function appendRow(sheetName, values) {
  const sheets = await getSheets();
  await withRetry(() => sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  }));
  _invalidate(`data:${sheetName}`);
}

export async function updateRow(sheetName, rowIndex, values) {
  // rowIndex is 1-based data row (header is row 1, first data row is 2)
  const sheets = await getSheets();
  const row = rowIndex + 1;
  await withRetry(() => sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  }));
  _invalidate(`data:${sheetName}`);
}

export async function deleteRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  const sheetId = await _getSheetId(sheets, sheetName);
  if (sheetId === null) throw new Error(`Sheet "${sheetName}" not found`);

  await withRetry(() => sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex, // 0-based, header=0, first data=1
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  }));
  _invalidate(`data:${sheetName}`);
}

// ── Sheet management ─────────────────────────────────────────────────────────

async function _fetchSheetsMeta(sheets) {
  const cached = _cacheGet('meta:sheets');
  if (cached !== undefined) return cached;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const info = meta.data.sheets.map(s => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));
  _cacheSet('meta:sheets', info, SHEET_META_TTL);
  return info;
}

async function _getSheetId(sheets, title) {
  const info = await _fetchSheetsMeta(sheets);
  return info.find(s => s.title === title)?.sheetId ?? null;
}

export async function createSheet(title, headers) {
  const sheets = await getSheets();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${title}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  });
  _invalidate('meta:sheets'); // force re-fetch so new sheet is visible
}

export async function sheetExists(title) {
  const sheets = await getSheets();
  const info = await _fetchSheetsMeta(sheets);
  return info.some(s => s.title === title);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

export async function ensureBaseSheets() {
  const usersExists = await sheetExists('users');
  if (!usersExists) {
    await createSheet('users', [
      'user_id', 'name', 'email', 'password_hash', 'role', 'created_at',
    ]);
  }
  const eventsExists = await sheetExists('events');
  if (!eventsExists) {
    await createSheet('events', [
      'event_id', 'event_name', 'event_date', 'location', 'description', 'created_at',
    ]);
  }
  const templatesExists = await sheetExists('email_templates');
  if (!templatesExists) {
    await createSheet('email_templates', ['event_id', 'subject', 'body_html']);
  }
  const accessExists = await sheetExists('user_event_access');
  if (!accessExists) {
    await createSheet('user_event_access', ['user_id', 'event_id']);
  }
}

export const emailTemplateHeaders = ['event_id', 'subject', 'body_html'];

// ── Participant sheet helpers ─────────────────────────────────────────────────

export const participantHeaders = [
  'reg_id', 'name', 'email', 'phone', 'unit',
  'qr_token', 'checked_in', 'checkin_time', 'email_sent', 'gender',
];

export function eventSheetName(eventId) {
  return `event_${eventId}`;
}

export async function ensureEventSheet(eventId) {
  const name = eventSheetName(eventId);
  if (!(await sheetExists(name))) {
    await createSheet(name, participantHeaders);
  }
}
