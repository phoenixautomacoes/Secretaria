const Joi = require('joi');

const createSchema = Joi.object({
  patientId: Joi.string().required(),
  startsAt: Joi.date().iso().required(),
  duration: Joi.number().integer().min(15).max(240).default(60),
  title: Joi.string().max(100).optional().default('Consulta'),
  notes: Joi.string().max(1000).optional().allow(null, ''),
});

const updateSchema = Joi.object({
  startsAt: Joi.date().iso().optional(),
  duration: Joi.number().integer().min(15).max(240).optional(),
  title: Joi.string().max(100).optional(),
  notes: Joi.string().max(1000).optional().allow(null, ''),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW').optional(),
}).min(1);

module.exports = { createSchema, updateSchema };
