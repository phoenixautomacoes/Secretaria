const prisma = require('../../config/prisma');
const AppError = require('../../shared/errors/AppError');
const { parsePagination, buildMeta } = require('../../shared/utils/pagination');
const { syncPatient } = require('../../integrations/google-sheets/sheets.service');

const list = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search } },
    ];
  }
  if (query.stage) where.pipelineStage = query.stage;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.patient.count({ where }),
  ]);

  return { patients, meta: buildMeta(total, page, limit) };
};

const getById = async (id) => {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      conversations: { orderBy: { createdAt: 'desc' }, take: 1 },
      appointments: { orderBy: { startsAt: 'desc' }, take: 3 },
      stageHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!patient) throw new AppError('Paciente não encontrado', 404, 'NOT_FOUND');
  return patient;
};

const create = async (data) => {
  const patient = await prisma.patient.create({ data });
  syncPatient(patient).catch(() => {});
  return patient;
};

const update = async (id, data) => {
  await getById(id);
  const patient = await prisma.patient.update({ where: { id }, data });
  syncPatient(patient).catch(() => {});
  return patient;
};

const remove = async (id) => {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw new AppError('Paciente não encontrado', 404, 'NOT_FOUND');

  // Remove dependências antes de deletar o paciente
  const conversations = await prisma.conversation.findMany({ where: { patientId: id }, select: { id: true } });
  const convIds = conversations.map((c) => c.id);

  await prisma.$transaction([
    prisma.message.deleteMany({ where: { conversationId: { in: convIds } } }),
    prisma.conversation.deleteMany({ where: { patientId: id } }),
    prisma.appointment.deleteMany({ where: { patientId: id } }),
    prisma.pipelineHistory.deleteMany({ where: { patientId: id } }),
    prisma.automationExecution.deleteMany({ where: { patientId: id } }),
    prisma.patient.delete({ where: { id } }),
  ]);
};

module.exports = { list, getById, create, update, remove };
