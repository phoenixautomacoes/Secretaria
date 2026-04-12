const service = require('./automations.service');
const { createSchema, updateSchema } = require('./automations.schema');
const { success, created, noContent, paginated } = require('../../shared/utils/response');
const AppError = require('../../shared/errors/AppError');
const asyncHandler = require('../../shared/utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { rules, meta } = await service.list(req.query);
  paginated(res, rules, meta);
});

const getById = asyncHandler(async (req, res) => {
  const rule = await service.getById(req.params.id);
  success(res, rule);
});

const create = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
  const rule = await service.create(value);
  created(res, rule);
});

const update = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
  const rule = await service.update(req.params.id, value);
  success(res, rule);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  noContent(res);
});

const getExecutions = asyncHandler(async (req, res) => {
  const { executions, meta } = await service.getExecutions(req.query);
  paginated(res, executions, meta);
});

module.exports = { list, getById, create, update, remove, getExecutions };
