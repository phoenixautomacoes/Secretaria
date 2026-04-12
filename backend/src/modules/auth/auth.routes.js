const { Router } = require('express');
const { login, logout, me, changePassword, resetPassword } = require('./auth.controller');
const { auth } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimiter');

const router = Router();

router.post('/login', authLimiter, login);
router.post('/logout', auth, logout);
router.get('/me', auth, me);
router.put('/change-password', auth, changePassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
