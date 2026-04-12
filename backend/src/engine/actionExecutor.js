const prisma = require('../config/prisma');
const { getProvider } = require('../integrations/whatsapp');
const followUpAgent = require('../ai/agents/followUp.agent');
const reminderAgent = require('../ai/agents/reminder.agent');
const postConsultAgent = require('../ai/agents/postConsult.agent');
const logger = require('../shared/utils/logger');

const execute = async (action, patient, context = {}) => {
  const { type, params = {} } = action;

  switch (type) {
    case 'send_message': {
      const provider = getProvider();
      const text = params.message || '';
      if (!text) { logger.warn('[ActionExecutor] send_message sem texto'); return; }
      await provider.sendText(patient.phone, text);
      await _saveOutMessage(patient, text, 'BOT');
      break;
    }

    case 'send_ai_message': {
      const provider = getProvider();
      let text;

      if (params.agent === 'reminder') {
        text = await reminderAgent.generate(patient, context.appointment, params.window);
      } else if (params.agent === 'postConsult') {
        text = await postConsultAgent.generate(patient, context.situation);
      } else {
        const history = context.history || [];
        text = await followUpAgent.generate(patient);
      }

      await provider.sendText(patient.phone, text);
      await _saveOutMessage(patient, text, 'AI');
      break;
    }

    case 'move_pipeline': {
      const { stage } = params;
      if (!stage) break;
      await prisma.patient.update({ where: { id: patient.id }, data: { pipelineStage: stage } });
      await prisma.pipelineHistory.create({
        data: { patientId: patient.id, fromStage: patient.pipelineStage, toStage: stage },
      });
      logger.info('[ActionExecutor] Pipeline movido', { patientId: patient.id, stage });
      break;
    }

    case 'escalate_human': {
      const conversation = await prisma.conversation.findFirst({
        where: { patientId: patient.id },
        orderBy: { updatedAt: 'desc' },
      });
      if (conversation) {
        await prisma.conversation.update({ where: { id: conversation.id }, data: { mode: 'HUMAN' } });
        logger.info('[ActionExecutor] Escalonado para humano', { patientId: patient.id });
      }
      break;
    }

    default:
      logger.warn('[ActionExecutor] Ação desconhecida', { type });
  }
};

const _saveOutMessage = async (patient, content, senderType) => {
  const conversation = await prisma.conversation.findFirst({
    where: { patientId: patient.id },
    orderBy: { updatedAt: 'desc' },
  });
  if (!conversation) return;

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content,
      direction: 'OUT',
      senderType,
    },
  });
};

module.exports = { execute };
