import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const getSheets = async () => {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
};

export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
