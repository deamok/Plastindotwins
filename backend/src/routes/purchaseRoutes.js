const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, purchaseController.getAllPurchases);
router.post('/', verifyToken, authorizeRoles('ADMIN', 'STAFF'), purchaseController.createPurchase);

module.exports = router;
