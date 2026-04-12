const { GOOGLE_ENABLED } = require('../../config/env');

const noop = async () => null;

const getCalendarService = () => {
  if (!GOOGLE_ENABLED) {
    return { createEvent: noop, deleteEvent: noop };
  }
  return require('./calendar.service');
};

module.exports = { getCalendarService };
