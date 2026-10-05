const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/auditLogger');
const prisma = new PrismaClient();

// 1. Ambil Semua Daftar Kontak (dengan filter tipe dan pencarian)
// Akun developer (deamok@gmail.com) tidak dimasukkan ke list karyawan
exports.getAllContacts = async (req, res) => {
  try {
    const { type, role, status, search } = req.query;

    const isSuperAdmin = req.user?.role === 'DEVELOPER';

    const where = {
      // Jangan pernah masukkan akun developer ke dalam list Kontak Karyawan
      email: { not: 'deamok@gmail.com' }
    };

    // Filter berdasarkan tipe: CUSTOMER, SUPPLIER, atau EMPLOYEE
    if (type) {
      if (type === 'CUSTOMER') {
        where.type = { in: ['CUSTOMER', 'BOTH'] };
      } else if (type === 'SUPPLIER') {
        where.type = { in: ['SUPPLIER', 'BOTH'] };
      } else {
        where.type = type;
      }
    }

    if (role) {
      where.employeeRole = role;
    }

    // Jika bukan Super Admin (DEVELOPER) dan melihat Karyawan, hanya tampilkan yang sudah Disetujui (APPROVED)
    if (!isSuperAdmin && (type === 'EMPLOYEE' || where.type === 'EMPLOYEE')) {
      where.status = 'APPROVED';
    } else if (status) {
      where.status = status;
    }

    // Filter pencarian
    if (search) {
      where.AND = [
        { email: { not: 'deamok@gmail.com' } },
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { npwp: { contains: search, mode: 'insensitive' } },
            { bankName: { contains: search, mode: 'insensitive' } },
            { bankAccountNo: { contains: search, mode: 'insensitive' } },
            { bankAccountHolder: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
      delete where.email;
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: {
            sales: true,
            purchases: true
          }
        },
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data kontak.', error: error.message });
  }
};

// 2. Ambil Detail Kontak Beserta Riwayat Transaksinya
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, invoiceNo: true, totalAmount: true, paymentMethod: true, createdAt: true }
        },
        purchases: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, purchaseNo: true, totalAmount: true, paymentStatus: true, createdAt: true }
        },
        users: {
          select: { id: true, email: true, role: true, avatarUrl: true }
        },
        _count: {
          select: { sales: true, purchases: true }
        }
      }
    });

    if (!contact) {
      return res.status(404).json({ message: 'Kontak tidak ditemukan.' });
    }

    res.status(200).json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil detail kontak.', error: error.message });
  }
};

// 3. Tambah Kontak Baru (Customer, Supplier, atau Karyawan) - Tab Keduanya Dihapus
exports.createContact = async (req, res) => {
  try {
    const { 
      name, 
      type = 'CUSTOMER', 
      employeeRole,
      npwp,
      phone, 
      email, 
      address, 
      bankName, 
      bankAccountNo, 
      bankAccountHolder, 
      notes 
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Nama kontak wajib diisi.' });
    }

    // Pilihan tipe: Hanya CUSTOMER, SUPPLIER, EMPLOYEE (BOTH dihapus)
    const validTypes = ['CUSTOMER', 'SUPPLIER', 'EMPLOYEE'];
    const contactType = validTypes.includes(type) ? type : 'CUSTOMER';

    let validEmployeeRole = null;
    let initialStatus = 'APPROVED';

    if (contactType === 'EMPLOYEE') {
      const allowedRoles = ['ADMIN', 'SALES', 'GUDANG'];
      validEmployeeRole = allowedRoles.includes(employeeRole) ? employeeRole : 'GUDANG';
    }

    const contact = await prisma.contact.create({
      data: {
        name: name.trim(),
        type: contactType,
        employeeRole: validEmployeeRole,
        status: initialStatus,
        npwp: npwp ? npwp.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        bankName: bankName ? bankName.trim() : null,
        bankAccountNo: bankAccountNo ? bankAccountNo.trim() : null,
        bankAccountHolder: bankAccountHolder ? bankAccountHolder.trim() : null,
        notes: notes ? notes.trim() : null
      }
    });

    // Jika kontak adalah Karyawan dan memiliki email, sinkronisasikan ke tabel User
    if (contactType === 'EMPLOYEE' && email && email.trim() !== '') {
      const normalizedEmail = email.toLowerCase().trim();
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          name: contact.name,
          role: validEmployeeRole,
          contactId: contact.id
        },
        create: {
          email: normalizedEmail,
          name: contact.name,
          role: validEmployeeRole,
          contactId: contact.id,
          password: null
        }
      });
    }

    logActivity({
      req,
      action: 'CONTACT_CREATE',
      entity: 'CONTACT',
      entityId: contact.id,
      targetName: `${contact.name} (${contact.type})`,
      details: `Menambahkan kontak baru "${contact.name}" sebagai ${contact.type}${contact.employeeRole ? ` (${contact.employeeRole})` : ''}`
    });

    res.status(201).json({
      success: true,
      message: contactType === 'EMPLOYEE' 
        ? `Karyawan "${contact.name}" (${validEmployeeRole}) berhasil ditambahkan.` 
        : 'Kontak berhasil ditambahkan.',
      data: contact
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan kontak.', error: error.message });
  }
};

// 4. Update Data Kontak
// Aturan:
// - "hanya super admin yg bisa merubah role akses"
// - "admin dan karyawan ybs yg bisa merubah data karyawan, karyawan lain tidak bisa"
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      employeeRole,
      status,
      npwp,
      phone, 
      email, 
      address, 
      bankName, 
      bankAccountNo, 
      bankAccountHolder, 
      notes 
    } = req.body;

    const existing = await prisma.contact.findUnique({ 
      where: { id },
      include: { users: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Kontak tidak ditemukan.' });
    }

    const isSuperAdmin = req.user?.role === 'DEVELOPER';
    const isAdmin = req.user?.role === 'ADMIN';
    const isSelf = Boolean(
      (req.user?.email && existing.email && req.user.email.toLowerCase() === existing.email.toLowerCase()) ||
      (req.user?.contactId && req.user.contactId === existing.id) ||
      (existing.users && existing.users.some(u => u.id === req.user?.id))
    );

    // Aturan: "admin dan karyawan ybs yg bisa merubah data karyawan, karyawan lain tidak bisa"
    // Khusus akun Owner (cahyonosugeng83@gmail.com): hanya Owner sendiri atau Super Admin (Developer) yang dapat mengubah data
    const isOwnerTarget = Boolean(existing.email && existing.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com');
    if (isOwnerTarget) {
      if (!isSuperAdmin && !isSelf) {
        return res.status(403).json({ 
          message: 'Akses ditolak. Profil Owner hanya dapat diubah oleh Owner sendiri atau Super Admin (Developer).' 
        });
      }
    } else if (existing.type === 'EMPLOYEE') {
      if (!isSuperAdmin && !isAdmin && !isSelf) {
        return res.status(403).json({ 
          message: 'Akses ditolak. Hanya Super Admin, Admin, atau Karyawan yang bersangkutan yang dapat mengubah data karyawan ini.' 
        });
      }
    }

    const targetType = type !== undefined ? type : existing.type;

    // Aturan: "hanya super admin yg bisa merubah role akses"
    // Akun Owner default ADMIN, tetapi Super Admin (Developer) memiliki Godmode
    let validEmployeeRole = existing.employeeRole;
    if (isOwnerTarget && !isSuperAdmin) {
      validEmployeeRole = 'ADMIN';
    } else if (targetType === 'EMPLOYEE') {
      if (employeeRole !== undefined && employeeRole !== existing.employeeRole) {
        if (!isSuperAdmin) {
          return res.status(403).json({ 
            message: 'Akses ditolak. Hanya Super Admin (Developer) yang berhak mengubah hak akses (role) karyawan.' 
          });
        }
        const allowedRoles = ['ADMIN', 'SALES', 'GUDANG', 'DEVELOPER'];
        validEmployeeRole = allowedRoles.includes(employeeRole) ? employeeRole : existing.employeeRole;
      }
    } else {
      validEmployeeRole = null;
    }

    // Status hanya bisa diubah oleh Super Admin (Developer)
    let finalStatus = existing.status;
    if (status !== undefined && status !== existing.status) {
      if (isSuperAdmin) {
        finalStatus = status;
      }
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        type: type !== undefined ? type : undefined,
        employeeRole: validEmployeeRole,
        status: finalStatus,
        npwp: npwp !== undefined ? (npwp ? npwp.trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        bankName: bankName !== undefined ? (bankName ? bankName.trim() : null) : undefined,
        bankAccountNo: bankAccountNo !== undefined ? (bankAccountNo ? bankAccountNo.trim() : null) : undefined,
        bankAccountHolder: bankAccountHolder !== undefined ? (bankAccountHolder ? bankAccountHolder.trim() : null) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined
      }
    });

    // Jika Karyawan dan sudah APPROVED, sinkronisasi perubahan nama/role/email ke tabel User
    const finalEmail = contact.email;
    if (contact.type === 'EMPLOYEE' && finalEmail) {
      const normalizedEmail = finalEmail.toLowerCase().trim();

      if (contact.status === 'APPROVED') {
        // Jika email diubah oleh Developer, sinkronisasikan email lama di tabel User
        if (existing.email && existing.email.toLowerCase().trim() !== normalizedEmail) {
          await prisma.user.updateMany({
            where: { email: existing.email.toLowerCase().trim(), role: { not: 'DEVELOPER' } },
            data: { email: normalizedEmail }
          });
        }

        await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: {
            name: contact.name,
            role: validEmployeeRole || 'GUDANG',
            contactId: contact.id
          },
          create: {
            email: normalizedEmail,
            name: contact.name,
            role: validEmployeeRole || 'GUDANG',
            contactId: contact.id,
            password: null
          }
        });
      } else if (contact.status === 'REJECTED' || contact.status === 'PENDING') {
        // Jika status diubah jadi PENDING atau REJECTED, cabut akun user login (kecuali DEVELOPER)
        await prisma.user.deleteMany({
          where: { email: normalizedEmail, role: { not: 'DEVELOPER' } }
        });
      }
    }

    logActivity({
      req,
      action: 'CONTACT_UPDATE',
      entity: 'CONTACT',
      entityId: contact.id,
      targetName: `${contact.name} (${contact.type})`,
      details: `Memperbarui data profil kontak "${contact.name}" (${contact.type})`
    });

    res.status(200).json({
      success: true,
      message: 'Data kontak berhasil diperbarui.',
      data: contact
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui kontak.', error: error.message });
  }
};

// 5. Setujui Karyawan (Approve & Assign Rule) - HANYA Super Admin (DEVELOPER)
exports.approveEmployee = async (req, res) => {
  try {
    if (req.user?.role !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Akses ditolak. Hanya Super Admin yang berhak menyetujui pendaftaran dan menentukan role akses karyawan.' });
    }

    const { id } = req.params;
    const { employeeRole } = req.body; // 'ADMIN', 'SALES', 'GUDANG'

    const allowedRoles = ['ADMIN', 'SALES', 'GUDANG'];
    if (!allowedRoles.includes(employeeRole)) {
      return res.status(400).json({ message: 'Role karyawan tidak valid. Pilih ADMIN, SALES, atau GUDANG.' });
    }

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json({ message: 'Data karyawan tidak ditemukan.' });
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        employeeRole,
        status: 'APPROVED'
      }
    });

    // Sinkronisasikan / aktifkan di tabel User
    if (contact.email) {
      const normalizedEmail = contact.email.toLowerCase().trim();
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          name: contact.name,
          role: employeeRole,
          contactId: contact.id
        },
        create: {
          email: normalizedEmail,
          name: contact.name,
          role: employeeRole,
          contactId: contact.id,
          password: null
        }
      });
    }

    logActivity({
      req,
      action: 'EMPLOYEE_APPROVE',
      entity: 'CONTACT',
      entityId: id,
      targetName: `${contact.name} (${employeeRole})`,
      details: `Menyetujui pendaftaran karyawan "${contact.name}" dengan hak akses ${employeeRole}`
    });

    res.status(200).json({
      success: true,
      message: `Karyawan "${contact.name}" berhasil disetujui dengan peran ${employeeRole}. Akun siap digunakan untuk login.`,
      data: updatedContact
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyetujui pendaftaran karyawan.', error: error.message });
  }
};

// 6. Tolak Pendaftaran Karyawan (Reject) - HANYA Super Admin (DEVELOPER)
exports.rejectEmployee = async (req, res) => {
  try {
    if (req.user?.role !== 'DEVELOPER') {
      return res.status(403).json({ message: 'Akses ditolak. Hanya Super Admin yang berhak menolak pendaftaran karyawan.' });
    }

    const { id } = req.params;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return res.status(404).json({ message: 'Data karyawan tidak ditemukan.' });
    }

    if (contact.email && contact.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com') {
      return res.status(403).json({ message: 'Akun Owner tidak dapat ditolak.' });
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        status: 'REJECTED'
      }
    });

    // Hapus akses di tabel User jika sebelumnya pernah ada
    if (contact.email) {
      await prisma.user.deleteMany({
        where: { email: contact.email.toLowerCase().trim(), role: { not: 'DEVELOPER' } }
      });
    }

    logActivity({
      req,
      action: 'EMPLOYEE_REJECT',
      entity: 'CONTACT',
      entityId: id,
      targetName: contact.name,
      details: `Menolak pendaftaran karyawan "${contact.name}" (${contact.email})`
    });

    res.status(200).json({
      success: true,
      message: `Pendaftaran karyawan "${contact.name}" telah ditolak.`,
      data: updatedContact
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menolak pendaftaran karyawan.', error: error.message });
  }
};

// 7. Hapus Kontak (Developer & Admin)
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Kontak tidak ditemukan.' });
    }

    if (existing.email && existing.email.toLowerCase().trim() === 'cahyonosugeng83@gmail.com') {
      const isSuperAdmin = req.user?.role === 'DEVELOPER';
      if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Akun Owner tidak dapat dihapus.' });
      }
    }

    // Jika Karyawan, putuskan relasi di tabel User atau hapus jika bukan developer
    if (existing.email) {
      await prisma.user.deleteMany({
        where: { email: existing.email.toLowerCase().trim(), role: { not: 'DEVELOPER' } }
      });
    }

    await prisma.contact.delete({ where: { id } });

    logActivity({
      req,
      action: 'CONTACT_DELETE',
      entity: 'CONTACT',
      entityId: id,
      targetName: `${existing.name} (${existing.type})`,
      details: `Menghapus kontak "${existing.name}" (${existing.type})`
    });

    res.status(200).json({
      success: true,
      message: `Kontak "${existing.name}" berhasil dihapus.`
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus kontak.', error: error.message });
  }
};
