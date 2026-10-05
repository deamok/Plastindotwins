const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Hanya Developer yang dapat melihat dan mengelola log audit
router.get('/', verifyToken, authorizeRoles('DEVELOPER'), auditController.getAuditLogs);
router.get('/stats', verifyToken, authorizeRoles('DEVELOPER'), auditController.getAuditStats);
router.post('/cleanup', verifyToken, authorizeRoles('DEVELOPER'), auditController.cleanupAuditLogs);

module.exports = router;
