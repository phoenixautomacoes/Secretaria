const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { defaultLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');
const { auth } = require('./middlewares/auth');

const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const patientsRoutes = require('./modules/patients/patients.routes');
const conversationsRoutes = require('./modules/conversations/conversations.routes');
const appointmentsRoutes = require('./modules/appointments/appointments.routes');
const pipelineRoutes = require('./modules/pipeline/pipeline.routes');
const automationsRoutes = require('./modules/automations/automations.routes');
const whatsappRoutes = require('./modules/whatsapp/whatsapp.routes');
const sheetsRoutes = require('./modules/sheets/sheets.routes');

const createApp = (io) => {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
  app.use(express.json());
  app.use(defaultLimiter);

  // Injeta io nas requests para emitir eventos
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/patients', auth, patientsRoutes);
  app.use('/api/conversations', auth, conversationsRoutes);
  app.use('/api/appointments', auth, appointmentsRoutes);
  app.use('/api/pipeline', auth, pipelineRoutes);
  app.use('/api/automations', auth, automationsRoutes);
  app.use('/api/whatsapp', auth, whatsappRoutes);
  app.use('/api/sheets', auth, sheetsRoutes);

  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
