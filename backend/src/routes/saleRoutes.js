const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all sales (authorized for all authenticated roles: DEVELOPER, ADMIN, SALES, GUDANG)
router.get('/', verifyToken, saleController.getAllSales);

// Create draft offer (SALES, ADMIN, DEVELOPER)
router.post('/', verifyToken, authorizeRoles('ADMIN', 'SALES', 'DEVELOPER'), saleController.createSale);

// Review offer item-by-item (ADMIN, DEVELOPER)
router.put('/:id/review', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER'), saleController.reviewOffer);

// Convert approved offer to invoice & deduct stock (SALES, ADMIN, DEVELOPER)
router.put('/:id/approve-to-invoice', verifyToken, authorizeRoles('ADMIN', 'SALES', 'DEVELOPER'), saleController.approveToInvoice);

// Update shipping status (GUDANG, ADMIN, DEVELOPER)
router.put('/:id/shipping', verifyToken, authorizeRoles('ADMIN', 'GUDANG', 'DEVELOPER'), saleController.updateShippingStatus);

// Update general sale info / Godmode status override (ADMIN, DEVELOPER)
router.put('/:id', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER'), saleController.updateSale);

// Delete sale/offer (ADMIN, DEVELOPER)
router.delete('/:id', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER'), saleController.deleteSale);

module.exports = router;
