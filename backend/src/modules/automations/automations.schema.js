const Joi = require('joi');

const TRIGGERS = [
  'PATIENT_QUALIFIED', 'PATIENT_SCHEDULED', 'APPOINTMENT_REMINDER_24H',
  'APPOINTMENT_REMINDER_1H', 'NO_RESPONSE_48H', 'APPOINTMENT_NO_SHOW',
  'APPOINTMENT_COMPLETED', 'MESSAGE_RECEIVED', 'PIPELINE_STAGE_CHANGED',
];

const createSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  trigger: Joi.string().valid(...TRIGGERS).required(),
  conditions: Joi.array().items(Joi.object()).optional().default([]),
  actions: Joi.array().items(Joi.object()).min(1).required(),
  delayMinutes: Joi.number().integer().min(0).optional().default(0),
  isActive: Joi.boolean().optional().default(true),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  conditions: Joi.array().items(Joi.object()).optional(),
  actions: Joi.array().items(Joi.object()).min(1).optional(),
  delayMinutes: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

module.exports = { createSchema, updateSchema };
