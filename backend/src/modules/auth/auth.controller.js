const authService = require('./auth.service');
const { loginSchema, changePasswordSchema, resetPasswordSchema } = require('./auth.schema');
const { success } = require('../../shared/utils/response');
const AppError = require('../../shared/errors/AppError');
const asyncHandler = require('../../shared/utils/asyncHandler');

const login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

  const result = await authService.login(value);
  success(res, result);
});

const logout = asyncHandler(async (req, res) => {
  success(res, { message: 'Logout realizado com sucesso' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  success(res, user);
});

const changePassword = asyncHandler(async (req, res) => {
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

  await authService.changePassword(req.user.id, value);
  success(res, { message: 'Senha alterada com sucesso' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');

  await authService.resetPassword(value);
  success(res, { message: 'Senha redefinida com sucesso' });
});

module.exports = { login, logout, me, changePassword, resetPassword };
