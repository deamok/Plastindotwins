const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// Semua endpoint kontak memerlukan autentikasi login
router.use(verifyToken);

// 1. Ambil daftar kontak (support filter ?type=CUSTOMER / SUPPLIER / BOTH & ?search=...)
router.get('/', contactController.getAllContacts);

// 2. Ambil detail kontak
router.get('/:id', contactController.getContactById);

// 3. Tambah kontak baru (Admin & Staff)
router.post('/', contactController.createContact);

// 4. Update data kontak (Admin & Staff)
router.put('/:id', contactController.updateContact);

// 5. Setujui Pendaftaran Karyawan (HANYA Super Admin / DEVELOPER)
router.put('/:id/approve', authorizeRoles('DEVELOPER'), contactController.approveEmployee);

// 6. Tolak Pendaftaran Karyawan (HANYA Super Admin / DEVELOPER)
router.put('/:id/reject', authorizeRoles('DEVELOPER'), contactController.rejectEmployee);

// 7. Hapus kontak (Admin & Developer)
router.delete('/:id', authorizeRoles('ADMIN', 'DEVELOPER'), contactController.deleteContact);

module.exports = router;
