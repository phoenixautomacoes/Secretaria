const { Router } = require('express');
const ctrl = require('./automations.controller');
const { requireAdmin } = require('../../middlewares/auth');

const router = Router();

router.get('/executions', ctrl.getExecutions);
router.get('/', ctrl.list);
router.post('/', requireAdmin, ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
