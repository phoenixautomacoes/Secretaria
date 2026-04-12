const WhatsAppProvider = require('./provider.interface');
const logger = require('../../shared/utils/logger');

class MockWhatsAppProvider extends WhatsAppProvider {
  constructor() {
    super();
    this._status = 'disconnected';
  }

  async connect() {
    this._status = 'connected';
    logger.info('[MockWhatsApp] Conectado (modo mock)');
  }

  async disconnect() {
    this._status = 'disconnected';
    logger.info('[MockWhatsApp] Desconectado');
  }

  getStatus() {
    return this._status;
  }

  async sendText(to, text) {
    const messageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logger.info('[MockWhatsApp] Mensagem enviada (simulada)', { to, text: text.slice(0, 80), messageId });
    return { messageId };
  }
}

module.exports = MockWhatsAppProvider;
