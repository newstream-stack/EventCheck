import { getSheets, SPREADSHEET_ID } from '../config/googleSheets.js';

// ── Generic helpers ──────────────────────────────────────────────────────────

export async function getSheetData(sheetName) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  const [headers, ...rows] = res.data.values || [];
  if (!headers) return [];
  return rows.map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
  );
}

export async function appendRow(sheetName, values) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function updateRow(sheetName, rowIndex, values) {
  // rowIndex is 1-based data row (header is row 1, first data row is 2)
  const sheets = await getSheets();
  const row = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

export async function deleteRow(sheetName, rowIndex) {
  const sheets = await getSheets();
  // Get sheet id first
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
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
  });
}

// ── Sheet management ─────────────────────────────────────────────────────────

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
}

export async function sheetExists(title) {
  const sheets = await getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return meta.data.sheets.some(s => s.properties.title === title);
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
