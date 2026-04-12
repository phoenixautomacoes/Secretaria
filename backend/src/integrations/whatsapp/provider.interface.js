/**
 * Interface do provider de WhatsApp.
 * Qualquer provider concreto deve implementar estes métodos.
 */
class WhatsAppProvider {
  /**
   * @param {string} to  - número destino (ex: "5551999999999")
   * @param {string} text - conteúdo da mensagem
   * @returns {Promise<{ messageId: string }>}
   */
  async sendText(to, text) {
    throw new Error('sendText() não implementado');
  }

  /**
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() não implementado');
  }

  /**
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() não implementado');
  }

  /**
   * @returns {'connected' | 'disconnected' | 'connecting'}
   */
  getStatus() {
    throw new Error('getStatus() não implementado');
  }
}

module.exports = WhatsAppProvider;
