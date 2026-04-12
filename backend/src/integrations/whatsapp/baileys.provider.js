const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const WhatsAppProvider = require('./provider.interface');
const logger = require('../../shared/utils/logger');

const AUTH_DIR = path.join(__dirname, '../../../../baileys_auth');

class BaileysProvider extends WhatsAppProvider {
  constructor() {
    super();
    this._status = 'disconnected';
    this._socket = null;
    this._qr = null;
    this._onMessage = null;
    this._reconnectAttempts = 0;
    this._maxReconnects = 10;
  }

  /** Remove todas as credenciais salvas para forçar novo QR */
  _clearAuth() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        for (const file of fs.readdirSync(AUTH_DIR)) {
          fs.rmSync(path.join(AUTH_DIR, file), { force: true });
        }
        logger.info('[Baileys] Sessão anterior removida');
      }
    } catch (err) {
      logger.error('[Baileys] Erro ao limpar sessão', { error: err.message });
    }
  }

  /** Registra handler para mensagens recebidas */
  onMessage(handler) {
    this._onMessage = handler;
  }

  getQR() {
    return this._qr;
  }

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    this._status = 'connecting';

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      browser: ['Phoenix Automações', 'Chrome', '120.0'],
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 30_000,
    });

    this._socket = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this._qr = qr;
        this._status = 'qr_pending';
        this._reconnectAttempts = 0;
        logger.info('[Baileys] QR gerado — escaneie no WhatsApp');
      }

      if (connection === 'open') {
        this._status = 'connected';
        this._qr = null;
        this._reconnectAttempts = 0;
        logger.info('[Baileys] WhatsApp conectado!');
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;

        logger.warn('[Baileys] Conexão fechada', { code, loggedOut });
        this._status = 'disconnected';
        this._qr = null;

        if (loggedOut) {
          logger.warn('[Baileys] Deslogado — limpando sessão e aguardando novo QR');
          this._clearAuth();
          this._reconnectAttempts = 0;
          setTimeout(() => this.connect(), 3000);
        } else {
          // Reconecta sempre — sem limite (QR expira mas deve gerar novo)
          this._reconnectAttempts++;
          const delay = Math.min(this._reconnectAttempts * 3000, 15000);
          logger.info(`[Baileys] Reconectando em ${delay}ms (tentativa ${this._reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid?.endsWith('@g.us')) continue; // ignora grupos
        if (msg.key.remoteJid?.endsWith('@broadcast')) continue;

        const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');

        // Extrai texto de diferentes tipos de mensagem
        const content =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.buttonsResponseMessage?.selectedDisplayText ||
          msg.message?.listResponseMessage?.title ||
          null;

        if (!content?.trim()) continue;

        logger.info('[Baileys] Mensagem recebida', { phone, preview: content.slice(0, 60) });

        if (this._onMessage) {
          this._onMessage({ phone, content: content.trim(), msgId: msg.key.id }).catch((err) => {
            logger.error('[Baileys] Erro ao processar mensagem', { error: err.message });
          });
        }
      }
    });
  }

  async sendText(to, text) {
    if (!this._socket || this._status !== 'connected') {
      logger.warn('[Baileys] Não conectado — mensagem não enviada', { to });
      return { messageId: null };
    }

    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    try {
      const result = await this._socket.sendMessage(jid, { text });
      return { messageId: result?.key?.id || null };
    } catch (err) {
      logger.error('[Baileys] Erro ao enviar mensagem', { to, error: err.message });
      return { messageId: null };
    }
  }

  async disconnect() {
    if (this._socket) {
      await this._socket.logout().catch(() => {});
      this._status = 'disconnected';
    }
  }

  getStatus() {
    return this._status;
  }
}

module.exports = BaileysProvider;
