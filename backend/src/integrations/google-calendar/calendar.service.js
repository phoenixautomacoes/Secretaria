const { google } = require('googleapis');
const { GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_CALENDAR_ID } = require('../../config/env');
const logger = require('../../shared/utils/logger');

let calendarClient = null;

const getClient = () => {
  if (calendarClient) return calendarClient;

  if (!GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_FILE não configurado');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  calendarClient = google.calendar({ version: 'v3', auth });
  return calendarClient;
};

const createEvent = async ({ patientName, patientPhone, startsAt, duration = 60, notes = '' }) => {
  const calendar = getClient();
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + duration * 60000);

  const event = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID || 'primary',
    requestBody: {
      summary: `Consulta — ${patientName}`,
      description: `Tel: ${patientPhone}\n${notes}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  logger.info('[GoogleCalendar] Evento criado', { eventId: event.data.id });
  return event.data.id;
};

const deleteEvent = async (eventId) => {
  const calendar = getClient();
  await calendar.events.delete({
    calendarId: GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });
  logger.info('[GoogleCalendar] Evento removido', { eventId });
};

module.exports = { createEvent, deleteEvent };
