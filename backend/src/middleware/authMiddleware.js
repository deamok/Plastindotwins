const jwt = require('jsonwebtoken');

// Verifikasi Token Akses
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_jwt_key_plastindo_12345');
    req.user = decoded; // Menyimpan data user (id, email, role) ke request object
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
  }
};

// Otorisasi Berdasarkan Peran (Role RBAC)
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ 
        message: 'Hak akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' 
      });
    }

    // DEVELOPER memiliki hak akses tertinggi ke semua aksi / modul
    if (req.user.role === 'DEVELOPER' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Hak akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' 
    });
  };
};
