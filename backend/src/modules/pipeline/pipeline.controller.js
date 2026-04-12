const prisma = require('../../config/prisma');
const AppError = require('../../shared/errors/AppError');
const { success } = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

const STAGES = ['LEAD', 'QUALIFIED', 'SCHEDULED', 'NO_SHOW', 'ATTENDED', 'POST_CONSULT'];

const getBoard = asyncHandler(async (req, res) => {
  const patients = await prisma.patient.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      conversations: { select: { mode: true }, take: 1, orderBy: { updatedAt: 'desc' } },
      appointments: {
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        orderBy: { startsAt: 'asc' },
        take: 1,
      },
    },
  });

  const board = {};
  STAGES.forEach((s) => (board[s] = []));
  patients.forEach((p) => board[p.pipelineStage]?.push(p));

  success(res, { stages: STAGES, board });
});

const moveStage = asyncHandler(async (req, res) => {
  const { stage } = req.body;
  if (!STAGES.includes(stage)) {
    throw new AppError('Etapa inválida', 400, 'VALIDATION_ERROR');
  }

  const patient = await prisma.patient.findUnique({ where: { id: req.params.id } });
  if (!patient) throw new AppError('Paciente não encontrado', 404, 'NOT_FOUND');

  const [updated] = await prisma.$transaction([
    prisma.patient.update({
      where: { id: req.params.id },
      data: { pipelineStage: stage },
    }),
    prisma.pipelineHistory.create({
      data: {
        patientId: req.params.id,
        fromStage: patient.pipelineStage,
        toStage: stage,
        movedBy: req.user.id,
      },
    }),
  ]);

  // Emite evento de socket para o board atualizar
  req.io?.emit('pipeline_stage_changed', {
    patientId: req.params.id,
    fromStage: patient.pipelineStage,
    toStage: stage,
  });

  success(res, updated);
});

module.exports = { getBoard, moveStage };
