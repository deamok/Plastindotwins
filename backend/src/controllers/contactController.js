const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Daftar Kontak (dengan filter tipe dan pencarian)
exports.getAllContacts = async (req, res) => {
  try {
    const { type, search } = req.query;

    const where = {};

    // Filter berdasarkan tipe: CUSTOMER, SUPPLIER, atau BOTH
    if (type) {
      if (type === 'CUSTOMER') {
        where.type = { in: ['CUSTOMER', 'BOTH'] };
      } else if (type === 'SUPPLIER') {
        where.type = { in: ['SUPPLIER', 'BOTH'] };
      } else {
        where.type = type;
      }
    }

    // Filter pencarian
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { province: { contains: search, mode: 'insensitive' } },
        { bankName: { contains: search, mode: 'insensitive' } },
        { bankAccountNo: { contains: search, mode: 'insensitive' } },
        { bankAccountHolder: { contains: search, mode: 'insensitive' } }
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            sales: true,
            purchases: true
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

// 3. Tambah Kontak Baru
exports.createContact = async (req, res) => {
  try {
    const { 
      name, 
      type = 'CUSTOMER', 
      phone, 
      email, 
      address, 
      province,
      propinsi,
      bankName, 
      bankAccountNo, 
      bankAccountHolder, 
      notes 
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Nama kontak wajib diisi.' });
    }

    const validTypes = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
    const contactType = validTypes.includes(type) ? type : 'CUSTOMER';
    const finalProvince = province !== undefined ? province : propinsi;

    const contact = await prisma.contact.create({
      data: {
        name: name.trim(),
        type: contactType,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        province: finalProvince ? finalProvince.trim() : null,
        bankName: bankName ? bankName.trim() : null,
        bankAccountNo: bankAccountNo ? bankAccountNo.trim() : null,
        bankAccountHolder: bankAccountHolder ? bankAccountHolder.trim() : null,
        notes: notes ? notes.trim() : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Kontak berhasil ditambahkan.',
      data: contact
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan kontak.', error: error.message });
  }
};

// 4. Update Data Kontak
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      phone, 
      email, 
      address, 
      province,
      propinsi,
      bankName, 
      bankAccountNo, 
      bankAccountHolder, 
      notes 
    } = req.body;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Kontak tidak ditemukan.' });
    }

    const finalProvince = province !== undefined ? province : propinsi;

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        type: type !== undefined ? type : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        province: finalProvince !== undefined ? (finalProvince ? finalProvince.trim() : null) : undefined,
        bankName: bankName !== undefined ? (bankName ? bankName.trim() : null) : undefined,
        bankAccountNo: bankAccountNo !== undefined ? (bankAccountNo ? bankAccountNo.trim() : null) : undefined,
        bankAccountHolder: bankAccountHolder !== undefined ? (bankAccountHolder ? bankAccountHolder.trim() : null) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined
      }
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

// 5. Hapus Kontak
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Kontak tidak ditemukan.' });
    }

    await prisma.contact.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: `Kontak "${existing.name}" berhasil dihapus.`
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus kontak.', error: error.message });
  }
};
