const service = require('./appointments.service');
const { createSchema, updateSchema } = require('./appointments.schema');
const { success, created, noContent, paginated } = require('../../shared/utils/response');
const AppError = require('../../shared/errors/AppError');
const asyncHandler = require('../../shared/utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { appointments, meta } = await service.list(req.query);
  paginated(res, appointments, meta);
});

const getById = asyncHandler(async (req, res) => {
  const a = await service.getById(req.params.id);
  success(res, a);
});

const create = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
  const a = await service.create(value);
  created(res, a);
});

const update = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
  const a = await service.update(req.params.id, value);
  success(res, a);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  noContent(res);
});

const getSlots = asyncHandler(async (req, res) => {
  if (!req.query.date) throw new AppError('Parâmetro date obrigatório', 400, 'VALIDATION_ERROR');
  const slots = await service.getSlots(req.query.date);
  success(res, slots);
});

module.exports = { list, getById, create, update, remove, getSlots };
