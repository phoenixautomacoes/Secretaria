const { WHATSAPP_PROVIDER } = require('../../config/env');
const logger = require('../../shared/utils/logger');

let provider;

const getProvider = () => {
  if (provider) return provider;

  if (WHATSAPP_PROVIDER === 'baileys') {
    const BaileysProvider = require('./baileys.provider');
    provider = new BaileysProvider();
    logger.info('[WhatsApp] Provider: Baileys');
  } else {
    const MockProvider = require('./mock.provider');
    provider = new MockProvider();
    logger.info('[WhatsApp] Provider: Mock');
  }

  return provider;
};

module.exports = { getProvider };
