const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Pembelian supplier (harga beli modal) hanya bisa diakses oleh GUDANG, ADMIN, dan DEVELOPER
router.get('/', verifyToken, authorizeRoles('ADMIN', 'GUDANG', 'DEVELOPER'), purchaseController.getAllPurchases);
router.post('/', verifyToken, authorizeRoles('ADMIN', 'GUDANG', 'DEVELOPER'), purchaseController.createPurchase);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER'), purchaseController.deletePurchase);

module.exports = router;
