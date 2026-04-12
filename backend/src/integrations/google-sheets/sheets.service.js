const { google } = require('googleapis');
const path = require('path');
const logger = require('../../shared/utils/logger');

const SPREADSHEET_ID = '1Rymjf1uGC0AJjEWp7hq79rWvCXv1Sjg0cZHycAk0Fq4';
const SHEET_NAME = 'Pipeline';
const KEY_FILE = path.resolve(__dirname, '../../../credentials/google-service-account.json');

const HEADERS = ['ID', 'Nome', 'Telefone', 'Etapa', 'Email', 'Notas', 'Criado em', 'Atualizado em'];

const STAGE_LABELS = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualificado',
  SCHEDULED: 'Agendado',
  ATTENDED: 'Compareceu',
  NO_SHOW: 'No-show',
  POST_CONSULT: 'Pós-consulta',
};

let _sheets = null;

const getClient = () => {
  if (_sheets) return _sheets;
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheets = google.sheets({ version: 'v4', auth });
  return _sheets;
};

// Garante que a aba "Pipeline" existe com cabeçalho
const ensureSheet = async () => {
  const sheets = getClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === SHEET_NAME);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
    logger.info('[Sheets] Aba Pipeline criada com cabeçalho');
  }
};

// Lê todas as linhas e retorna como array de objetos { rowIndex, id }
const getRows = async () => {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:H`,
  });
  return (res.data.values || []).map((row, i) => ({ rowIndex: i + 2, id: row[0] }));
};

const patientToRow = (p) => [
  p.id,
  p.name || '',
  p.phone || '',
  STAGE_LABELS[p.pipelineStage] || p.pipelineStage || '',
  p.email || '',
  p.notes || '',
  p.createdAt ? new Date(p.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
  p.updatedAt ? new Date(p.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
];

// Sincroniza um único paciente (upsert por ID)
const syncPatient = async (patient) => {
  try {
    await ensureSheet();
    const sheets = getClient();
    const rows = await getRows();
    const existing = rows.find(r => r.id === patient.id);

    const values = [patientToRow(patient)];

    if (existing) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A${existing.rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      logger.info(`[Sheets] Paciente atualizado na linha ${existing.rowIndex}`, { id: patient.id });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values },
      });
      logger.info('[Sheets] Paciente adicionado', { id: patient.id });
    }
  } catch (err) {
    logger.error('[Sheets] Erro ao sincronizar paciente', { error: err.message, id: patient.id });
  }
};

// Sincroniza TODOS os pacientes (usado na rota admin /api/sheets/sync)
const syncAll = async (patients) => {
  try {
    await ensureSheet();
    const sheets = getClient();

    const rows = [HEADERS, ...patients.map(patientToRow)];
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:H`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
    logger.info(`[Sheets] Sync completo: ${patients.length} pacientes`);
    return patients.length;
  } catch (err) {
    logger.error('[Sheets] Erro no sync completo', { error: err.message });
    throw err;
  }
};

module.exports = { syncPatient, syncAll };
