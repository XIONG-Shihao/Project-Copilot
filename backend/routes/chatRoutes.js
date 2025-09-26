const express = require('express');
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/:projectId/message', verifyToken, chatController.sendMessage);
router.get('/:projectId/context', verifyToken, chatController.getProjectContext);

module.exports = router;
