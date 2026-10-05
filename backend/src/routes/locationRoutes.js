const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Semua user login bisa melihat daftar lokasi dan riwayat mutasi
router.get('/', verifyToken, locationController.getAllLocations);
router.get('/transfers', verifyToken, locationController.getTransferHistory);

// Admin, Gudang, dan Developer bisa melakukan mutasi/transfer stok antar gudang
router.post('/transfer', verifyToken, authorizeRoles('ADMIN', 'GUDANG', 'DEVELOPER'), locationController.transferStock);

module.exports = router;
