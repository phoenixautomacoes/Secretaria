const service = require('./patients.service');
const { createPatientSchema, updatePatientSchema } = require('./patients.schema');
const { success, created, noContent, paginated } = require('../../shared/utils/response');
const AppError = require('../../shared/errors/AppError');
const asyncHandler = require('../../shared/utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { patients, meta } = await service.list(req.query);
  paginated(res, patients, meta);
});

const getById = asyncHandler(async (req, res) => {
  const patient = await service.getById(req.params.id);
  success(res, patient);
});

const create = asyncHandler(async (req, res) => {
  const { error, value } = createPatientSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
  const patient = await service.create(value);
  created(res, patient);
});

const update = asyncHandler(async (req, res) => {
  const { error, value } = updatePatientSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
  const patient = await service.update(req.params.id, value);
  success(res, patient);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  noContent(res);
});

module.exports = { list, getById, create, update, remove };
