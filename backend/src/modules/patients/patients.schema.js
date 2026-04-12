const Joi = require('joi');

const createPatientSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\d{10,15}$/).required(),
  email: Joi.string().email().optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, ''),
  pipelineStage: Joi.string().valid('LEAD', 'QUALIFIED', 'SCHEDULED', 'NO_SHOW', 'ATTENDED', 'POST_CONSULT').optional(),
});

const updatePatientSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, ''),
}).min(1);

module.exports = { createPatientSchema, updatePatientSchema };
