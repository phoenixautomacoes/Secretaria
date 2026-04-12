const prisma = require('../config/prisma');
const logger = require('../shared/utils/logger');

const checkReminders = async () => {
  const engine = require('../engine/automationEngine');
  const now = new Date();

  // Lembrete 24h
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const window24 = { gte: new Date(in24h.getTime() - 30000), lte: new Date(in24h.getTime() + 30000) };

  const appointments24h = await prisma.appointment.findMany({
    where: { startsAt: window24, status: { notIn: ['CANCELLED'] }, reminderSent24h: false },
    include: { patient: true },
  });

  for (const appt of appointments24h) {
    await engine.fire('APPOINTMENT_REMINDER_24H', { patientId: appt.patientId, appointment: appt });
    await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSent24h: true } });
    logger.info('[Scheduler] Lembrete 24h disparado', { apptId: appt.id });
  }

  // Lembrete 1h
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const window1h = { gte: new Date(in1h.getTime() - 30000), lte: new Date(in1h.getTime() + 30000) };

  const appointments1h = await prisma.appointment.findMany({
    where: { startsAt: window1h, status: { notIn: ['CANCELLED'] }, reminderSent1h: false },
    include: { patient: true },
  });

  for (const appt of appointments1h) {
    await engine.fire('APPOINTMENT_REMINDER_1H', { patientId: appt.patientId, appointment: appt });
    await prisma.appointment.update({ where: { id: appt.id }, data: { reminderSent1h: true } });
    logger.info('[Scheduler] Lembrete 1h disparado', { apptId: appt.id });
  }

  // No-response 48h — pacientes LEAD sem atualização nos últimos 2 dias
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const staleLeads = await prisma.patient.findMany({
    where: { pipelineStage: 'LEAD', updatedAt: { lte: cutoff } },
  });

  for (const patient of staleLeads) {
    await engine.fire('NO_RESPONSE_48H', { patientId: patient.id });
    await prisma.patient.update({ where: { id: patient.id }, data: { updatedAt: now } });
    logger.info('[Scheduler] No-response 48h disparado', { patientId: patient.id });
  }
};

module.exports = { checkReminders };
