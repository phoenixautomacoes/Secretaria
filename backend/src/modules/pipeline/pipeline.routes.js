const { Router } = require('express');
const { getBoard, moveStage } = require('./pipeline.controller');

const router = Router();

router.get('/', getBoard);
router.patch('/patients/:id/stage', moveStage);

module.exports = router;
