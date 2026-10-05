const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/auditLogger');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_plastindo_12345';

// 1. Google OAuth / Sign In with Google
// Alur:
// - Jika akun Developer (deamok@gmail.com) atau Super Admin -> langsung masuk dengan hak akses Developer/Super Admin
// - Jika karyawan sudah disetujui (status === 'APPROVED') -> langsung masuk sesuai rule (ADMIN/SALES/GUDANG)
// - Jika karyawan status === 'PENDING' -> tampilkan status sedang diproses
// - Jika belum terdaftar -> kembalikan status NEED_REGISTRATION agar user mengisi nama, nomor hp, alamat (multiline)
exports.googleLogin = async (req, res) => {
  try {
    const { credential, email: directEmail, name: directName, avatarUrl: directAvatar, googleId: directGoogleId } = req.body;

    let email = directEmail;
    let name = directName;
    let avatarUrl = directAvatar;
    let googleId = directGoogleId;

    // Jika credential JWT dikirim oleh Google Identity Services (GIS)
    if (credential) {
      try {
        const parts = credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          email = payload.email || email;
          name = payload.name || name;
          avatarUrl = payload.picture || avatarUrl;
          googleId = payload.sub || googleId;
        }
      } catch (err) {
        console.error('Gagal mendecode Google credential token:', err);
      }
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email akun Google tidak valid atau tidak disediakan.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Cek apakah ini akun Developer / Super Admin di tabel User (misal deamok@gmail.com)
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    });

    if (existingUser && (existingUser.role === 'DEVELOPER' || existingUser.role === 'ADMIN')) {
      // Update data avatar dan googleId jika ada
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          avatarUrl: avatarUrl || existingUser.avatarUrl,
          googleId: googleId || existingUser.googleId
        }
      });

      const token = jwt.sign(
        { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name, avatarUrl: updatedUser.avatarUrl },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      logActivity({
        req,
        user: updatedUser,
        action: 'LOGIN',
        entity: 'AUTH',
        targetName: updatedUser.name,
        details: `Login via Google sebagai ${updatedUser.role}`
      });

      return res.status(200).json({
        success: true,
        status: 'LOGGED_IN',
        message: `Login Google berhasil! Selamat datang, ${updatedUser.name} (${updatedUser.role}).`,
        token,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl
        }
      });
    }

    // 2. Cek apakah email terdaftar di modul Kontak sebagai Karyawan (EMPLOYEE)
    const employeeContact = await prisma.contact.findFirst({
      where: {
        type: 'EMPLOYEE',
        email: { equals: normalizedEmail, mode: 'insensitive' }
      }
    });

    // 3. Jika belum ada di list karyawan sama sekali -> Minta registrasi profil karyawan
    if (!employeeContact) {
      return res.status(200).json({
        success: false,
        status: 'NEED_REGISTRATION',
        message: 'Akun Google Anda belum terdaftar sebagai Karyawan. Silakan lengkapi formulir pendaftaran berikut.',
        profile: {
          email: normalizedEmail,
          name: name || '',
          avatarUrl: avatarUrl || '',
          googleId: googleId || ''
        }
      });
    }

    // 4. Jika terdaftar tapi status PENDING (belum disetujui oleh Developer / Admin)
    if (employeeContact.status === 'PENDING') {
      return res.status(200).json({
        success: false,
        status: 'PENDING',
        message: 'Pendaftaran akun Anda sedang dalam proses peninjauan oleh Developer / Administrator. Mohon tunggu hingga akun Anda disetujui dan diberikan hak akses (rule).',
        contact: {
          name: employeeContact.name,
          email: employeeContact.email,
          phone: employeeContact.phone
        }
      });
    }

    // 5. Jika status REJECTED (ditolak)
    if (employeeContact.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        status: 'REJECTED',
        message: 'Pendaftaran akun Anda tidak disetujui oleh Administrator / Developer. Silakan hubungi pengelola sistem.'
      });
    }

    // 6. Jika status APPROVED -> Login dan berikan hak akses sesuai rule yang telah disetujui
    const targetRole = employeeContact.employeeRole || 'GUDANG';
    const targetName = employeeContact.name || name || 'Karyawan';

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: targetName,
        role: targetRole,
        avatarUrl: avatarUrl || undefined,
        googleId: googleId || undefined,
        contactId: employeeContact.id
      },
      create: {
        email: normalizedEmail,
        name: targetName,
        role: targetRole,
        avatarUrl: avatarUrl || null,
        googleId: googleId || null,
        contactId: employeeContact.id,
        password: null
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, avatarUrl: user.avatarUrl },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logActivity({
      req,
      user,
      action: 'LOGIN',
      entity: 'AUTH',
      targetName: user.name,
      details: `Login via Google sebagai ${user.role}`
    });

    res.status(200).json({
      success: true,
      status: 'LOGGED_IN',
      message: `Login Google berhasil! Selamat datang, ${user.name} (${user.role}).`,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan saat memproses login Google.', error: error.message });
  }
};

// 2. Registrasi Mandiri Karyawan Baru (Google Onboarding)
// Menyimpan nama lengkap, no hp, alamat lengkap (multi-line) dengan status PENDING
exports.registerEmployee = async (req, res) => {
  try {
    const { email, name, phone, address, notes, avatarUrl, googleId } = req.body;

    if (!email || !name || !phone || !address) {
      return res.status(400).json({ message: 'Nama lengkap, email Google, nomor HP, dan alamat lengkap wajib diisi.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Jangan izinkan mendaftar ulang jika sudah super admin / developer
    const existingDev = await prisma.user.findFirst({
      where: { email: normalizedEmail, role: { in: ['DEVELOPER', 'ADMIN'] } }
    });
    if (existingDev) {
      return res.status(400).json({ message: 'Akun ini sudah memiliki hak akses Administrator/Developer.' });
    }

    // Cek apakah sudah ada kontak dengan email ini
    let contact = await prisma.contact.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
    });

    if (contact) {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          type: 'EMPLOYEE',
          status: 'PENDING',
          notes: notes ? notes.trim() : contact.notes
        }
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          address: address.trim(),
          type: 'EMPLOYEE',
          status: 'PENDING',
          employeeRole: null, // Menunggu persetujuan Developer/Admin
          notes: notes ? notes.trim() : null
        }
      });
    }

    res.status(201).json({
      success: true,
      status: 'PENDING',
      message: 'Pendaftaran karyawan berhasil dikirim! Akun Anda sedang dalam proses peninjauan oleh Developer / Administrator. Silakan tunggu hingga akun disetujui dan diberikan hak akses.',
      data: contact
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengirim formulir pendaftaran karyawan.', error: error.message });
  }
};

// 3. Daftar Karyawan Disetujui (Untuk Quick Selection / Helper)
// TIDAK memasukkan developer (deamok@gmail.com) atau super admin
exports.getRegisteredGoogleEmployees = async (req, res) => {
  try {
    const employees = await prisma.contact.findMany({
      where: { 
        type: 'EMPLOYEE',
        status: 'APPROVED',
        email: { not: 'deamok@gmail.com' } // Jangan masukkan akun developer ke list karyawan
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeRole: true,
        phone: true,
        status: true
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data karyawan.', error: error.message });
  }
};

// 4. Registrasi User Manual
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const validRoles = ['ADMIN', 'SALES', 'GUDANG'];
    const userRole = validRoles.includes(role) ? role : 'GUDANG';

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal melakukan registrasi.', error: error.message });
  }
};

// 5. Login User Manual (Email & Password)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ message: 'Kredensial tidak valid.' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Akun ini terdaftar via Google. Silakan masuk menggunakan tombol "Masuk dengan Google".' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Kredensial tidak valid.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, avatarUrl: user.avatarUrl },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logActivity({
      req,
      user,
      action: 'LOGIN',
      entity: 'AUTH',
      targetName: user.name,
      details: `Login manual via Email sebagai ${user.role}`
    });

    res.status(200).json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl }
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal melakukan login.', error: error.message });
  }
};

// 6. Cek Pengguna Aktif (Profile)
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user.', error: error.message });
  }
};
