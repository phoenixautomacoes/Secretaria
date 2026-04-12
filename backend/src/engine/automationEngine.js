const prisma = require('../config/prisma');
const { automationQueue } = require('../jobs/queues');
const logger = require('../shared/utils/logger');

/**
 * Dispara automações para um trigger específico.
 * @param {string} trigger - ex: 'PATIENT_QUALIFIED'
 * @param {object} payload - { patientId, ...context }
 */
const fire = async (trigger, payload) => {
  const rules = await prisma.automationRule.findMany({
    where: { trigger, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!rules.length) return;

  const patient = await prisma.patient.findUnique({ where: { id: payload.patientId } });
  if (!patient) return;

  for (const rule of rules) {
    if (!_checkConditions(rule.conditions, patient, payload)) continue;

    const delay = (rule.delayMinutes || 0) * 60 * 1000;

    await automationQueue.add(
      'run_rule',
      { ruleId: rule.id, patientId: patient.id, context: payload },
      { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    logger.info('[AutomationEngine] Regra enfileirada', {
      rule: rule.name,
      patientId: patient.id,
      delayMinutes: rule.delayMinutes,
    });
  }
};

const _checkConditions = (conditions, patient, payload) => {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  if (conditions.pipelineStage && patient.pipelineStage !== conditions.pipelineStage) return false;

  return true;
};

module.exports = { fire };
