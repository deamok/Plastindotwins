const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', verifyToken, saleController.getAllSales);
router.post('/', verifyToken, authorizeRoles('ADMIN', 'STAFF'), saleController.createSale);

module.exports = router;
