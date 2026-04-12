const service = require('./conversations.service');
const { success, created, paginated } = require('../../shared/utils/response');
const AppError = require('../../shared/errors/AppError');
const asyncHandler = require('../../shared/utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { conversations, meta } = await service.list(req.query);
  paginated(res, conversations, meta);
});

const getById = asyncHandler(async (req, res) => {
  const conv = await service.getById(req.params.id);
  success(res, conv);
});

const getMessages = asyncHandler(async (req, res) => {
  const { messages, meta } = await service.getMessages(req.params.id, req.query);
  paginated(res, messages, meta);
});

const sendMessage = asyncHandler(async (req, res) => {
  if (!req.body.content) throw new AppError('Conteúdo obrigatório', 400, 'VALIDATION_ERROR');
  const message = await service.sendMessage(req.params.id, req.body, req.user.id);

  // Emite via socket
  req.io?.to(`conversation:${req.params.id}`).emit('new_message', message);

  created(res, message);
});

const escalate = asyncHandler(async (req, res) => {
  const conv = await service.escalate(req.params.id);
  success(res, conv);
});

const assume = asyncHandler(async (req, res) => {
  const conv = await service.assume(req.params.id, req.user.id);
  success(res, conv);
});

const returnToAI = asyncHandler(async (req, res) => {
  const conv = await service.returnToAI(req.params.id);
  success(res, conv);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  res.status(204).send();
});

module.exports = { list, getById, getMessages, sendMessage, escalate, assume, returnToAI, remove };
