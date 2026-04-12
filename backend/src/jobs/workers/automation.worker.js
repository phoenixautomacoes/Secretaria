const { Worker } = require('bullmq');
const redisConnection = require('../../config/redis');
const prisma = require('../../config/prisma');
const { execute } = require('../../engine/actionExecutor');
const logger = require('../../shared/utils/logger');

const startWorker = () => {
  const worker = new Worker(
    'automations',
    async (job) => {
      const { ruleId, patientId, context } = job.data;

      const [rule, patient] = await Promise.all([
        prisma.automationRule.findUnique({ where: { id: ruleId } }),
        prisma.patient.findUnique({ where: { id: patientId } }),
      ]);

      if (!rule || !patient) {
        logger.warn('[AutomationWorker] Regra ou paciente não encontrado', { ruleId, patientId });
        return;
      }

      const execution = await prisma.automationExecution.create({
        data: { ruleId, patientId, status: 'RUNNING', scheduledAt: new Date() },
      });

      try {
        const actions = Array.isArray(rule.actions) ? rule.actions : [];
        for (const action of actions) {
          await execute(action, patient, context);
        }

        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: { status: 'COMPLETED', executedAt: new Date() },
        });

        logger.info('[AutomationWorker] Execução concluída', { ruleId, patientId });
      } catch (err) {
        await prisma.automationExecution.update({
          where: { id: execution.id },
          data: { status: 'FAILED', error: err.message, executedAt: new Date() },
        });
        logger.error('[AutomationWorker] Falha na execução', { ruleId, patientId, error: err.message });
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on('failed', (job, err) => {
    logger.error('[AutomationWorker] Job falhou definitivamente', { jobId: job?.id, error: err.message });
  });

  logger.info('[AutomationWorker] Worker iniciado');
  return worker;
};

module.exports = { startWorker };
