const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Semua user terautentikasi bisa melihat produk & kategori
router.get('/categories', verifyToken, productController.getCategories);
router.get('/next-sku', verifyToken, productController.getNextSku);
router.get('/', verifyToken, productController.getAllProducts);

// Gudang, Admin, dan Developer bisa mengubah/menyesuaikan stok fisik
router.post('/adjust-stock', verifyToken, authorizeRoles('ADMIN', 'GUDANG', 'DEVELOPER'), productController.adjustStock);

// Admin dan Developer bisa mendaftarkan produk baru ke sistem
router.post('/create', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER'), productController.createProduct);

// Update produk & stok (Admin, Developer & Gudang)
router.put('/:id', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER', 'GUDANG'), productController.updateProduct);
router.delete('/:id', verifyToken, authorizeRoles('ADMIN', 'DEVELOPER'), productController.deleteProduct);

module.exports = router;
