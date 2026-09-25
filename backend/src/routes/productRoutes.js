const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Semua user terautentikasi bisa melihat produk
router.get('/', verifyToken, productController.getAllProducts);

// Hanya Staff dan Admin yang bisa mengubah/menyesuaikan stok
router.post('/adjust-stock', verifyToken, authorizeRoles('ADMIN', 'STAFF'), productController.adjustStock);

// Hanya Admin yang bisa mendaftarkan produk baru ke sistem
router.post('/create', verifyToken, authorizeRoles('ADMIN'), productController.createProduct);

// Update dan Hapus produk
router.put('/:id', verifyToken, authorizeRoles('ADMIN'), productController.updateProduct);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN'), productController.deleteProduct);

module.exports = router;
