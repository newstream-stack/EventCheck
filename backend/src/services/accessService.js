import { appendRow, deleteRow, getSheetData } from './sheetsService.js';

const ACCESS_SHEET = 'user_event_access';

export async function getUserEventAccessRows() {
  return getSheetData(ACCESS_SHEET);
}

export async function getUserAccessibleEventIds(userId) {
  const rows = await getUserEventAccessRows();
  return rows
    .filter(row => row.user_id === userId && row.event_id)
    .map(row => row.event_id);
}

export async function canUserAccessEvent(user, eventId) {
  if (!user || !eventId) return false;
  if (user.role === 'admin') return true;

  const allowedEventIds = await getUserAccessibleEventIds(user.user_id);
  return allowedEventIds.includes(eventId);
}

export async function replaceUserEventAccess(userId, eventIds = []) {
  const rows = await getUserEventAccessRows();
  const targetRows = rows
    .map((row, index) => ({ ...row, rowIndex: index + 1 }))
    .filter(row => row.user_id === userId);

  for (const row of targetRows.reverse()) {
    await deleteRow(ACCESS_SHEET, row.rowIndex);
  }

  const uniqueEventIds = [...new Set(eventIds.filter(Boolean))];
  for (const eventId of uniqueEventIds) {
    await appendRow(ACCESS_SHEET, [userId, eventId]);
  }
}

export async function removeUserEventAccess(userId) {
  await replaceUserEventAccess(userId, []);
}
