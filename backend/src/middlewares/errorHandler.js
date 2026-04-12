const AppError = require('../shared/errors/AppError');
const logger = require('../shared/utils/logger');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Registro duplicado',
      code: 'CONFLICT',
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Registro não encontrado',
      code: 'NOT_FOUND',
    });
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
  });
};

module.exports = errorHandler;
