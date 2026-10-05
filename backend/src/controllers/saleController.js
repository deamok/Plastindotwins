const { PrismaClient } = require('@prisma/client');
const { logActivity } = require('../utils/auditLogger');
const prisma = new PrismaClient();

// 1. Ambil Semua Riwayat Penjualan / Penawaran
// - Tiap Sales HANYA bisa melihat dokumen penawaran/faktur yang mereka buat sendiri
// - Gudang HANYA melihat dokumen siap kirim (Faktur, Delivering, Completed) tanpa mengetahui harga penjualan
exports.getAllSales = async (req, res) => {
  try {
    const { status } = req.query;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    // Role-based filtering:
    // Tiap Sales HANYA bisa melihat dokumen yang mereka buat sendiri
    if (req.user && req.user.role === 'SALES') {
      whereClause.userId = req.user.id;
    }

    // Bagian Gudang hanya melihat pesanan yang siap disiapkan/dikirim
    if (req.user && req.user.role === 'GUDANG') {
      if (status && ['INVOICE', 'DELIVERING', 'COMPLETED'].includes(status)) {
        whereClause.status = status;
      } else {
        whereClause.status = {
          in: ['INVOICE', 'DELIVERING', 'COMPLETED']
        };
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { id: true, code: true, name: true, type: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true, price: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true, role: true }
        },
        contact: {
          select: { 
            id: true, 
            name: true, 
            phone: true, 
            email: true, 
            address: true, 
            npwp: true,
            bankName: true, 
            bankAccountNo: true, 
            bankAccountHolder: true 
          }
        }
      }
    });

    // Masking harga penjualan untuk GUDANG:
    // Gudang hanya mengetahui kuantitas & rincian pengiriman (Surat Jalan), TIDAK BISA mengetahui harga penjualan
    let responseSales = sales;
    if (req.user && req.user.role === 'GUDANG') {
      responseSales = sales.map((sale) => {
        const s = { ...sale };
        s.totalAmount = null;
        if (s.items && Array.isArray(s.items)) {
          s.items = s.items.map((it) => {
            const sanitizedItem = { ...it };
            sanitizedItem.unitPrice = null;
            sanitizedItem.offeredPrice = null;
            sanitizedItem.adminPrice = null;
            sanitizedItem.appPrice = null;
            sanitizedItem.subtotal = null;
            if (sanitizedItem.product) {
              sanitizedItem.product = { ...sanitizedItem.product, price: null };
            }
            return sanitizedItem;
          });
        }
        return s;
      });
    }

    res.status(200).json({ success: true, data: responseSales });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data penjualan.', error: error.message });
  }
};

// 2. Buat Draft Penawaran Baru oleh Sales
// Sales menginput item, kuantitas, dan harga penawaran (bisa di bawah harga standar aplikasi).
// Status awal: OFFER_PENDING (belum memotong stok fisik gudang).
exports.createSale = async (req, res) => {
  try {
    const { 
      customerName, 
      customerAddress,
      contactId, 
      locationId, 
      paymentMethod = 'CASH', 
      notes, 
      items 
    } = req.body;
    const userId = req.user?.id || null;

    let finalCustomerName = customerName;
    let finalCustomerAddress = customerAddress || null;

    if (contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (contact) {
        finalCustomerName = contact.name;
        if (!finalCustomerAddress && contact.address) {
          finalCustomerAddress = contact.address;
        }
      }
    }

    if (!finalCustomerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nama pelanggan dan minimal 1 item barang penawaran wajib diisi.' });
    }

    // Tentukan lokasi gudang/outlet default (misal Outlet Jomblang)
    let targetLoc;
    if (locationId) {
      targetLoc = await prisma.location.findUnique({ where: { id: locationId } });
    }
    if (!targetLoc) {
      targetLoc = await prisma.location.findFirst({ where: { type: 'OUTLET' } }) ||
                  await prisma.location.findFirst({ where: { code: 'JOMBLANG' } }) ||
                  await prisma.location.findFirst();
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const offerNo = `SPH-${dateStr}-${randomSuffix}`;
    const invoiceNo = offerNo; // Menggunakan offerNo sebagai invoiceNo sementara hingga disetujui

    let totalAmount = 0;
    const saleItemsData = [];

    for (const item of items) {
      const sQty = parseFloat(item.saleQty !== undefined ? item.saleQty : item.quantity);
      const price = parseFloat(item.unitPrice);

      if (!item.productId || isNaN(sQty) || sQty <= 0 || isNaN(price) || price < 0) {
        return res.status(400).json({ message: 'Data item penawaran tidak valid (periksa produk, qty, dan harga).' });
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        return res.status(404).json({ message: `Produk dengan ID ${item.productId} tidak ditemukan.` });
      }

      const itemsPerUnit = parseFloat(item.itemsPerUnit !== undefined ? item.itemsPerUnit : 1);
      const saleUnit = item.saleUnit || product.unit || 'buah';
      const baseQty = Math.round(sQty * itemsPerUnit);

      // Harga standar aplikasi per satuan transaksi yang dipilih
      const appPrice = parseFloat(product.price || 0) * itemsPerUnit;
      // Harga yang diajukan oleh sales (bisa di bawah appPrice)
      const offeredPrice = price;

      const subtotal = sQty * offeredPrice;
      totalAmount += subtotal;

      saleItemsData.push({
        productId: product.id,
        saleQty: sQty,
        saleUnit: saleUnit,
        itemsPerUnit: itemsPerUnit,
        quantity: baseQty,
        appPrice: appPrice,
        offeredPrice: offeredPrice,
        adminPrice: null,
        adminDecision: null,
        isReviewed: false,
        unitPrice: offeredPrice,
        subtotal: subtotal
      });
    }

    const createdSale = await prisma.sale.create({
      data: {
        invoiceNo,
        offerNo,
        status: 'OFFER_PENDING',
        customerName: finalCustomerName,
        customerAddress: finalCustomerAddress,
        contactId: contactId || null,
        locationId: targetLoc?.id || null,
        totalAmount,
        paymentMethod,
        notes: notes || null,
        userId,
        items: {
          create: saleItemsData
        }
      },
      include: {
        location: true,
        items: {
          include: { product: true }
        },
        contact: true,
        user: true
      }
    });

    logActivity({
      req,
      action: 'OFFER_CREATE',
      entity: 'SALE',
      entityId: createdSale.id,
      targetName: `${createdSale.offerNo} - ${createdSale.customerName}`,
      details: `Membuat draft penawaran baru ${createdSale.offerNo} untuk pelanggan ${createdSale.customerName}. Total: Rp ${Number(createdSale.totalAmount).toLocaleString('id-ID')}`
    });

    res.status(201).json({
      success: true,
      message: `Draft penawaran ${createdSale.offerNo} berhasil dibuat dan telah dikirimkan ke Admin untuk ditinjau.`,
      data: createdSale
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal membuat draft penawaran.' });
  }
};

// 3. Review Penawaran oleh Admin (Item-by-Item Review)
// Admin memberikan keputusan untuk setiap item:
// - 'APPROVED': Setuju harga penawaran sales
// - 'USE_APP_PRICE': Tolak, kembalikan ke harga aplikasi
// - 'CUSTOM_PRICE': Tolak, tentukan harga kustom baru oleh admin
exports.reviewOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes, reviewedItems } = req.body;
    const adminName = req.user?.name || 'Administrator';

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });

    if (!sale) {
      return res.status(404).json({ message: 'Data penawaran tidak ditemukan.' });
    }

    if (sale.status !== 'OFFER_PENDING' && sale.status !== 'OFFER_APPROVED') {
      return res.status(400).json({ message: `Penawaran dengan status ${sale.status} tidak dapat direview ulang.` });
    }

    if (!reviewedItems || !Array.isArray(reviewedItems) || reviewedItems.length === 0) {
      return res.status(400).json({ message: 'Daftar item yang direview wajib disertakan.' });
    }

    const updatedSale = await prisma.$transaction(async (tx) => {
      let newTotalAmount = 0;

      for (const revItem of reviewedItems) {
        const existingItem = sale.items.find((it) => it.id === revItem.itemId);
        if (!existingItem) continue;

        let finalUnitPrice = parseFloat(existingItem.offeredPrice);
        let decision = revItem.adminDecision || 'APPROVED';
        let customAdminPrice = null;

        if (decision === 'APPROVED') {
          // Admin setuju -> gunakan harga sales
          finalUnitPrice = parseFloat(existingItem.offeredPrice);
        } else if (decision === 'USE_APP_PRICE') {
          // Admin tidak setuju -> gunakan harga sesuai aplikasi
          finalUnitPrice = parseFloat(existingItem.appPrice);
        } else if (decision === 'CUSTOM_PRICE') {
          // Admin tidak setuju -> gunakan harga yang diinput admin
          customAdminPrice = parseFloat(revItem.adminPrice);
          if (isNaN(customAdminPrice) || customAdminPrice < 0) {
            customAdminPrice = parseFloat(existingItem.appPrice);
          }
          finalUnitPrice = customAdminPrice;
        }

        const saleQty = parseFloat(existingItem.saleQty);
        const subtotal = saleQty * finalUnitPrice;
        newTotalAmount += subtotal;

        await tx.saleItem.update({
          where: { id: existingItem.id },
          data: {
            adminDecision: decision,
            adminPrice: customAdminPrice,
            unitPrice: finalUnitPrice,
            subtotal: subtotal,
            isReviewed: true
          }
        });
      }

      // Pastikan semua item sudah direview
      const allItems = await tx.saleItem.findMany({ where: { saleId: id } });
      const allReviewed = allItems.every((it) => it.isReviewed);

      const status = allReviewed ? 'OFFER_APPROVED' : 'OFFER_PENDING';

      const updated = await tx.sale.update({
        where: { id },
        data: {
          status,
          totalAmount: newTotalAmount,
          adminNotes: adminNotes || sale.adminNotes,
          reviewedBy: adminName,
          reviewedAt: new Date()
        },
        include: {
          location: true,
          items: { include: { product: true } },
          contact: true,
          user: true
        }
      });

      return updated;
    });

    logActivity({
      req,
      action: 'OFFER_REVIEW',
      entity: 'SALE',
      entityId: updatedSale.id,
      targetName: `${updatedSale.offerNo} - ${updatedSale.customerName}`,
      details: `Admin mereview penawaran ${updatedSale.offerNo} (Total: Rp ${Number(updatedSale.totalAmount).toLocaleString('id-ID')})`
    });

    res.status(200).json({
      success: true,
      message: `Penawaran ${updatedSale.offerNo} berhasil direview oleh Admin dan siap dicetak/diunduh oleh Sales.`,
      data: updatedSale
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses review penawaran.' });
  }
};

// 4. Pelanggan Setuju -> Konversi Penawaran Menjadi Faktur Penjualan
// Memotong stok fisik di gudang/outlet terkait, membuat nomor invoice & nomor surat jalan resmi,
// serta meneruskan order ke bagian Gudang untuk disiapkan pengirimannya.
exports.approveToInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        location: true,
        items: { include: { product: true } },
        contact: true
      }
    });

    if (!sale) {
      return res.status(404).json({ message: 'Data penawaran tidak ditemukan.' });
    }

    if (sale.status !== 'OFFER_APPROVED') {
      return res.status(400).json({ 
        message: `Hanya penawaran yang sudah disetujui Admin (OFFER_APPROVED) yang dapat diterbitkan menjadi Faktur Penjualan. Status saat ini: ${sale.status}` 
      });
    }

    // Tiap Sales HANYA bisa memproses penawaran yang mereka buat sendiri
    if (req.user && req.user.role === 'SALES' && sale.userId && sale.userId !== req.user.id) {
      return res.status(403).json({ 
        message: 'Hak akses ditolak. Anda hanya dapat memproses dokumen penawaran yang Anda buat sendiri.' 
      });
    }

    // Eksekusi transaksi atomik konversi ke faktur & pemotongan stok
    const convertedSale = await prisma.$transaction(async (tx) => {
      // 1. Tentukan lokasi sumber pemotongan stok
      let targetLoc = sale.location;
      if (!targetLoc) {
        targetLoc = await tx.location.findFirst({ where: { type: 'OUTLET' } }) ||
                    await tx.location.findFirst({ where: { code: 'JOMBLANG' } }) ||
                    await tx.location.findFirst();
      }

      const stockUpdates = [];

      // 2. Validasi ketersediaan stok fisik di lokasi terkait
      for (const item of sale.items) {
        const product = item.product;
        const baseQty = item.quantity; // Kuantitas dalam satuan dasar produk

        const productStock = await tx.productStock.findUnique({
          where: {
            productId_locationId: { productId: product.id, locationId: targetLoc.id }
          }
        });

        const currentLocStock = productStock ? productStock.stock : 0;

        if (currentLocStock < baseQty) {
          const otherStocks = await tx.productStock.findMany({
            where: { productId: product.id, NOT: { locationId: targetLoc.id } },
            include: { location: true }
          });
          const otherInfo = otherStocks.map(s => `${s.location.name}: ${s.stock} ${product.unit}`).join(', ');

          throw new Error(
            `Stok "${product.name}" di ${targetLoc.name} tidak mencukupi saat penerbitan faktur! Sisa stok: ${currentLocStock} ${product.unit}, dibutuhkan: ${baseQty} ${product.unit}.${otherInfo ? ` [Tersedia di ${otherInfo}]` : ''}`
          );
        }

        const noteDetail = item.saleUnit.toLowerCase() !== (product.unit || 'buah').toLowerCase()
          ? ` [${item.saleQty} ${item.saleUnit} x ${item.itemsPerUnit} = -${baseQty} ${product.unit}]`
          : ` [-${baseQty} ${product.unit}]`;

        stockUpdates.push({
          productId: product.id,
          productName: product.name,
          currentTotalStock: product.stock,
          currentLocStock,
          newLocStock: currentLocStock - baseQty,
          newTotalStock: product.stock - baseQty,
          quantity: baseQty,
          noteDetail
        });
      }

      // 3. Generate Nomor Invoice dan Nomor Surat Jalan Pengiriman
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `INV-${dateStr}-${randomSuffix}`;
      const deliveryNo = `SJ-${dateStr}-${randomSuffix}`;

      // 4. Update status penjualan menjadi INVOICE
      const updated = await tx.sale.update({
        where: { id },
        data: {
          status: 'INVOICE',
          invoiceNo,
          deliveryNo,
          locationId: targetLoc.id,
          approvedAt: new Date()
        },
        include: {
          location: true,
          items: { include: { product: true } },
          contact: true,
          user: true
        }
      });

      // 5. Potong stok fisik dan catat log mutasi inventori
      for (const update of stockUpdates) {
        await tx.productStock.update({
          where: {
            productId_locationId: { productId: update.productId, locationId: targetLoc.id }
          },
          data: { stock: update.newLocStock }
        });

        await tx.product.update({
          where: { id: update.productId },
          data: { stock: update.newTotalStock }
        });

        await tx.transaction.create({
          data: {
            productId: update.productId,
            locationId: targetLoc.id,
            type: 'STOCK_OUT',
            quantity: update.quantity,
            notes: `Faktur #${invoiceNo} (Penawaran #${sale.offerNo}) untuk ${sale.customerName} di ${targetLoc.name}${update.noteDetail}`
          }
        });
      }

      return updated;
    });

    logActivity({
      req,
      action: 'OFFER_APPROVE_INVOICE',
      entity: 'SALE',
      entityId: convertedSale.id,
      targetName: `${convertedSale.invoiceNo} (SPH: ${convertedSale.offerNo})`,
      details: `Menerbitkan Faktur Penjualan #${convertedSale.invoiceNo} & Surat Jalan #${convertedSale.deliveryNo} untuk ${convertedSale.customerName}. Total: Rp ${Number(convertedSale.totalAmount).toLocaleString('id-ID')}`
    });

    res.status(200).json({
      success: true,
      message: `Faktur Penjualan #${convertedSale.invoiceNo} berhasil diterbitkan! Pesanan telah diteruskan ke bagian Gudang (Surat Jalan #${convertedSale.deliveryNo}) untuk disiapkan.`,
      data: convertedSale
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal menerbitkan faktur penjualan.' });
  }
};

// 5. Update Status Pengiriman oleh Gudang
// - 'DELIVERING': Barang telah disiapkan dan sedang dikirim bersama Surat Jalan
// - 'COMPLETED': Barang telah tiba di alamat dan Surat Jalan telah ditandatangani pelanggan
exports.updateShippingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveryDriver, deliveryNotes } = req.body;

    if (!['DELIVERING', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ message: 'Status pengiriman harus DELIVERING atau COMPLETED.' });
    }

    const sale = await prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      return res.status(404).json({ message: 'Data penjualan tidak ditemukan.' });
    }

    const updateData = {
      status,
      deliveryDriver: deliveryDriver !== undefined ? deliveryDriver : sale.deliveryDriver,
      deliveryNotes: deliveryNotes !== undefined ? deliveryNotes : sale.deliveryNotes
    };

    if (status === 'DELIVERING' && !sale.shippedAt) {
      updateData.shippedAt = new Date();
    } else if (status === 'COMPLETED') {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
        items: { include: { product: true } },
        contact: true,
        user: true
      }
    });

    const statusLabel = status === 'DELIVERING' 
      ? 'sedang dalam proses pengiriman oleh kurir' 
      : 'telah selesai dan ditandatangani oleh pelanggan';

    // Masking harga penjualan untuk GUDANG
    let responseData = updated;
    if (req.user && req.user.role === 'GUDANG') {
      const s = { ...updated };
      s.totalAmount = null;
      if (s.items && Array.isArray(s.items)) {
        s.items = s.items.map((it) => {
          const item = { ...it, unitPrice: null, subtotal: null, offeredPrice: null, adminPrice: null, appPrice: null };
          if (item.product) item.product = { ...item.product, price: null };
          return item;
        });
      }
      responseData = s;
    }

    logActivity({
      req,
      action: 'SHIPPING_UPDATE',
      entity: 'SALE',
      entityId: updated.id,
      targetName: `${updated.invoiceNo || updated.offerNo} - ${updated.customerName}`,
      details: `Status pengiriman pesanan #${updated.invoiceNo} diubah ke ${statusLabel}. Kurir: ${deliveryDriver || '-'}`
    });

    res.status(200).json({
      success: true,
      message: `Status pesanan #${updated.invoiceNo} berhasil diperbarui: ${statusLabel}.`,
      data: responseData
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memperbarui status pengiriman.' });
  }
};

// 6. Hapus Data Penjualan / Penawaran
exports.deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, location: true }
    });

    if (!sale) {
      return res.status(404).json({ message: 'Data tidak ditemukan.' });
    }

    // Jika sudah menjadi faktur dan memotong stok, kembalikan stok
    if (['INVOICE', 'DELIVERING', 'COMPLETED'].includes(sale.status)) {
      await prisma.$transaction(async (tx) => {
        if (sale.locationId) {
          for (const item of sale.items) {
            await tx.productStock.updateMany({
              where: { productId: item.productId, locationId: sale.locationId },
              data: { stock: { increment: item.quantity } }
            });

            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });

            await tx.transaction.create({
              data: {
                productId: item.productId,
                locationId: sale.locationId,
                type: 'STOCK_IN',
                quantity: item.quantity,
                notes: `Pembatalan Faktur #${sale.invoiceNo} (Pengembalian stok)`
              }
            });
          }
        }
        await tx.sale.delete({ where: { id } });
      });
    } else {
      // Masih draft penawaran (belum memotong stok), langsung hapus
      await prisma.sale.delete({ where: { id } });
    }

    logActivity({
      req,
      action: 'SALE_DELETE',
      entity: 'SALE',
      entityId: id,
      targetName: `${sale.invoiceNo || sale.offerNo} - ${sale.customerName}`,
      details: `Menghapus dokumen transaksi #${sale.invoiceNo || sale.offerNo} (Status: ${sale.status})`
    });

    res.status(200).json({ success: true, message: 'Data penjualan/penawaran berhasil dihapus.' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal menghapus data penjualan.' });
  }
};

// 7. Update Data Penjualan / Penawaran (Admin & Developer)
// Mengubah informasi umum (pelanggan, alamat, catatan, metode bayar, kurir pengiriman).
// Khusus peran DEVELOPER: memiliki Godmode untuk mengganti status transaksi jika diperlukan.
exports.updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customerName, 
      customerAddress, 
      paymentMethod, 
      notes, 
      adminNotes, 
      deliveryDriver, 
      deliveryNotes, 
      status 
    } = req.body;

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Data penjualan/penawaran tidak ditemukan.' });
    }

    const isDeveloper = req.user?.role === 'DEVELOPER';

    const updateData = {
      customerName: customerName !== undefined ? customerName.trim() : undefined,
      customerAddress: customerAddress !== undefined ? customerAddress.trim() : undefined,
      paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
      notes: notes !== undefined ? notes : undefined,
      adminNotes: adminNotes !== undefined ? adminNotes : undefined,
      deliveryDriver: deliveryDriver !== undefined ? deliveryDriver : undefined,
      deliveryNotes: deliveryNotes !== undefined ? deliveryNotes : undefined,
    };

    // Khusus DEVELOPER (Godmode): Bisa override status transaksi
    if (status && status !== existing.status) {
      if (isDeveloper) {
        updateData.status = status;
      }
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
        items: { include: { product: true } },
        contact: true,
        user: true
      }
    });

    logActivity({
      req,
      action: 'SALE_UPDATE',
      entity: 'SALE',
      entityId: updated.id,
      targetName: `${updated.invoiceNo || updated.offerNo} - ${updated.customerName}`,
      details: `Memperbarui rincian transaksi #${updated.invoiceNo || updated.offerNo}${status && status !== existing.status ? ` (Status diubah ke ${status})` : ''}`
    });

    res.status(200).json({
      success: true,
      message: `Data transaksi #${updated.invoiceNo || updated.offerNo} berhasil diperbarui.`,
      data: updated
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memperbarui transaksi penjualan.' });
  }
};

