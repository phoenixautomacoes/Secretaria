const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const AppError = require('../../shared/errors/AppError');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../config/env');

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Credenciais inválidas', 401, 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN || '7d',
  });

  return { token, user: sanitize(user) };
};

const me = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Usuário não encontrado', 404, 'NOT_FOUND');
  return sanitize(user);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Senha atual incorreta', 400, 'INVALID_PASSWORD');

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
};

const resetPassword = async ({ email, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('E-mail não encontrado', 404, 'NOT_FOUND');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
};

const sanitize = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

module.exports = { login, me, changePassword, resetPassword };
