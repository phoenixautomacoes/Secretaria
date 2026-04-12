const prisma = require('../../config/prisma');
const logger = require('../../shared/utils/logger');

/**
 * Processa mensagem recebida do WhatsApp.
 * Cria paciente/conversa se não existir, salva a mensagem e dispara IA.
 */
const handleIncomingMessage = async ({ phone, content, msgId }) => {
  // 1. Encontrar ou criar paciente pelo número
  let patient = await prisma.patient.findUnique({ where: { phone } });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        name: `Contato ${phone.slice(-4)}`, // nome provisório até se apresentar
        phone,
        source: 'WHATSAPP',
        pipelineStage: 'LEAD',
      },
    });
    logger.info('[MessageHandler] Novo paciente criado', { phone, id: patient.id });
  }

  // 2. Encontrar ou criar conversa ativa
  let conversation = await prisma.conversation.findFirst({
    where: { patientId: patient.id, status: { in: ['OPEN', 'PENDING_HUMAN', 'WITH_HUMAN'] } },
    orderBy: { updatedAt: 'desc' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { patientId: patient.id, mode: 'AI', status: 'OPEN' },
    });
  }

  // 3. Salvar mensagem recebida
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content,
      direction: 'IN',
      senderType: 'PATIENT',
      externalId: msgId || '',
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessage: content,
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  // Emite para o frontend em tempo real
  const { getIO } = require('../../config/socket');
  getIO()?.emit('new_message', { conversationId: conversation.id, patientId: patient.id });
  getIO()?.emit('conversation_updated', { conversationId: conversation.id });

  // 4. Se modo HUMAN, apenas notifica — não responde automaticamente
  if (conversation.mode === 'HUMAN' || conversation.status === 'PENDING_HUMAN') {
    logger.info('[MessageHandler] Conversa com humano — não responde automaticamente', {
      conversationId: conversation.id,
    });
    getIO()?.emit('human_message_received', { conversationId: conversation.id, patientName: patient.name });
    return;
  }

  // 5. Modo AI — gera resposta
  try {
    const secretaryAgent = require('../../ai/secretary.agent');
    const response = await secretaryAgent.respond({ patient, conversation, message: content });

    if (!response) return;

    const { getProvider } = require('./index');
    const io = getIO();

    // Suporta resposta única (string) ou múltiplas partes (array)
    const partes = Array.isArray(response) ? response : [response];
    const DELAY_ENTRE_MSGS = 1200; // ms entre cada parte

    for (let i = 0; i < partes.length; i++) {
      const texto = partes[i];
      if (!texto) continue;

      if (i > 0) await new Promise((r) => setTimeout(r, DELAY_ENTRE_MSGS));

      // Envia via WhatsApp
      await getProvider().sendText(phone, texto);

      // Salva cada parte como mensagem separada
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: texto,
          direction: 'OUT',
          senderType: 'AI',
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessage: texto, lastMessageAt: new Date() },
      });

      io?.emit('new_message', { conversationId: conversation.id, patientId: patient.id });
    }
  } catch (err) {
    logger.error('[MessageHandler] Erro ao gerar resposta IA', { error: err.message });

    // Fallback: informa paciente de falha temporária
    const fallback = 'Estamos com uma instabilidade momentânea. Por favor, tente novamente em instantes.';
    const { getProvider } = require('./index');
    await getProvider().sendText(phone, fallback).catch(() => {});
  }
};

module.exports = { handleIncomingMessage };
