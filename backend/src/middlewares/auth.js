const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const prisma = require('../config/prisma');
const AppError = require('../shared/errors/AppError');
const asyncHandler = require('../shared/utils/asyncHandler');

const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Token não fornecido', 401, 'UNAUTHORIZED');
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new AppError('Token inválido ou expirado', 401, 'INVALID_TOKEN');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError('Usuário não encontrado ou inativo', 401, 'UNAUTHORIZED');
  }

  req.user = user;
  next();
});

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    throw new AppError('Acesso restrito a administradores', 403, 'FORBIDDEN');
  }
  next();
};

module.exports = { auth, requireAdmin };
