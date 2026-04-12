const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('./app');
const { PORT, FRONTEND_URL, WHATSAPP_PROVIDER } = require('./config/env');
const redis = require('./config/redis');
const prisma = require('./config/prisma');
const { setIO } = require('./config/socket');
const { startWorker } = require('./jobs/workers/automation.worker');
const { getProvider } = require('./integrations/whatsapp');
const { handleIncomingMessage } = require('./integrations/whatsapp/messageHandler');
const logger = require('./shared/utils/logger');
const cron = require('node-cron');
const { checkReminders } = require('./jobs/scheduler');

const start = async () => {
  // Conexões
  await prisma.$connect();
  logger.info('PostgreSQL conectado');

  await redis.ping().then(() => logger.info('Redis conectado')).catch((e) => logger.warn('Redis:', e.message));

  // Socket.io
  const io = new Server(null, {
    cors: { origin: FRONTEND_URL || '*', credentials: true },
  });
  setIO(io); // torna acessível em qualquer módulo

  const app = createApp(io);
  const server = http.createServer(app);
  io.attach(server);

  io.on('connection', (socket) => {
    logger.debug('[Socket] Cliente conectado', { id: socket.id });

    socket.on('join_conversation', (id) => socket.join(`conversation:${id}`));
    socket.on('leave_conversation', (id) => socket.leave(`conversation:${id}`));
    socket.on('disconnect', () => logger.debug('[Socket] Desconectado', { id: socket.id }));
  });

  // BullMQ worker
  startWorker();

  // WhatsApp
  const whatsapp = getProvider();

  if (WHATSAPP_PROVIDER === 'baileys') {
    // Registra handler ANTES de conectar
    whatsapp.onMessage(handleIncomingMessage);
  }

  await whatsapp.connect();
  logger.info(`[WhatsApp] Provider "${WHATSAPP_PROVIDER}" iniciado`);

  // Cron: lembretes a cada minuto
  cron.schedule('* * * * *', async () => {
    try { await checkReminders(); }
    catch (err) { logger.error('[Cron] Erro', { error: err.message }); }
  });

  server.listen(PORT, () => logger.info(`Servidor rodando na porta ${PORT}`));

  const shutdown = async () => {
    logger.info('Encerrando...');
    await whatsapp.disconnect().catch(() => {});
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((err) => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});
