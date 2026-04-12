const prisma = require('../../config/prisma');
const AppError = require('../../shared/errors/AppError');
const { parsePagination, buildMeta } = require('../../shared/utils/pagination');

const list = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.mode) where.mode = query.mode;
  if (query.patientId) where.patientId = query.patientId;

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return { conversations, meta: buildMeta(total, page, limit) };
};

const getById = async (id) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conversation) throw new AppError('Conversa não encontrada', 404, 'NOT_FOUND');
  return conversation;
};

const getMessages = async (conversationId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.message.count({ where: { conversationId } }),
  ]);
  return { messages, meta: buildMeta(total, page, limit) };
};

const sendMessage = async (conversationId, { content }, userId) => {
  await getById(conversationId);
  return prisma.message.create({
    data: {
      conversationId,
      content,
      direction: 'OUT',
      senderType: 'HUMAN',
    },
  });
};

const escalate = async (conversationId) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { mode: 'HUMAN' },
  });
};

const assume = async (conversationId, userId) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { mode: 'HUMAN', assignedToId: userId },
  });
};

const returnToAI = async (conversationId) => {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { mode: 'AI', assignedToId: null },
  });
};

const remove = async (id) => {
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) throw new AppError('Conversa não encontrada', 404, 'NOT_FOUND');
  await prisma.message.deleteMany({ where: { conversationId: id } });
  await prisma.conversation.delete({ where: { id } });
};

module.exports = { list, getById, getMessages, sendMessage, escalate, assume, returnToAI, remove };
