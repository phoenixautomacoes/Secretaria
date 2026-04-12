const { Router } = require('express');
const ctrl = require('./conversations.controller');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/messages', ctrl.getMessages);
router.post('/:id/messages', ctrl.sendMessage);
router.post('/:id/escalate', ctrl.escalate);
router.post('/:id/assume', ctrl.assume);
router.post('/:id/return-to-ai', ctrl.returnToAI);
router.delete('/:id', ctrl.remove);

module.exports = router;
