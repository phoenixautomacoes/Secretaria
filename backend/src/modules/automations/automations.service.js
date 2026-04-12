const prisma = require('../../config/prisma');
const AppError = require('../../shared/errors/AppError');
const { parsePagination, buildMeta } = require('../../shared/utils/pagination');

const list = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};
  if (query.trigger) where.trigger = query.trigger;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [rules, total] = await Promise.all([
    prisma.automationRule.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.automationRule.count({ where }),
  ]);

  return { rules, meta: buildMeta(total, page, limit) };
};

const getById = async (id) => {
  const rule = await prisma.automationRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('Automação não encontrada', 404, 'NOT_FOUND');
  return rule;
};

const create = async (data) => {
  return prisma.automationRule.create({ data });
};

const update = async (id, data) => {
  await getById(id);
  return prisma.automationRule.update({ where: { id }, data });
};

const remove = async (id) => {
  await getById(id);
  await prisma.automationRule.delete({ where: { id } });
};

const getExecutions = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};
  if (query.ruleId) where.ruleId = query.ruleId;
  if (query.patientId) where.patientId = query.patientId;
  if (query.status) where.status = query.status;

  const [executions, total] = await Promise.all([
    prisma.automationExecution.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        rule: { select: { id: true, name: true, trigger: true } },
        patient: { select: { id: true, name: true } },
      },
    }),
    prisma.automationExecution.count({ where }),
  ]);

  return { executions, meta: buildMeta(total, page, limit) };
};

module.exports = { list, getById, create, update, remove, getExecutions };
