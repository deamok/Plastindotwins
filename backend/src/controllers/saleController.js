const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Riwayat Penjualan
exports.getAllSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, unit: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        contact: {
          select: { id: true, name: true, phone: true, email: true, address: true, bankName: true, bankAccountNo: true, bankAccountHolder: true }
        }
      }
    });

    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data penjualan.', error: error.message });
  }
};

// 2. Buat Transaksi Penjualan Baru (ACID Transaction)
exports.createSale = async (req, res) => {
  try {
    const { customerName, contactId, paymentMethod = 'CASH', notes, items } = req.body;
    const userId = req.user?.id || null;

    let finalCustomerName = customerName;
    if (contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (contact) {
        finalCustomerName = contact.name;
      }
    }

    if (!finalCustomerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nama pelanggan dan minimal 1 item penjualan wajib diisi.' });
    }

    // Eksekusi transaksi atomik di PostgreSQL
    const createdSale = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsData = [];
      const stockUpdates = [];

      // Validasi setiap item & ketersediaan stok
      for (const item of items) {
        // Mendukung transaksi penjualan dalam berbagai satuan (misal: lusin, pack, kodi, pcs, dll.)
        const sQty = parseFloat(item.saleQty !== undefined ? item.saleQty : item.quantity);
        const price = parseFloat(item.unitPrice);

        if (!item.productId || isNaN(sQty) || sQty <= 0 || isNaN(price) || price < 0) {
          throw new Error('Data item penjualan tidak valid (periksa produk, qty, dan harga).');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }

        const itemsPerUnit = parseFloat(item.itemsPerUnit !== undefined ? item.itemsPerUnit : 1);
        const saleUnit = item.saleUnit || product.unit || 'buah';
        const baseQty = Math.round(sQty * itemsPerUnit);

        if (product.stock < baseQty) {
          throw new Error(
            `Stok "${product.name}" tidak mencukupi! Sisa stok: ${product.stock} ${product.unit}, dibutuhkan: ${baseQty} ${product.unit} (${sQty} ${saleUnit}).`
          );
        }

        const subtotal = sQty * price;
        totalAmount += subtotal;

        saleItemsData.push({
          productId: product.id,
          saleQty: sQty,
          saleUnit: saleUnit,
          itemsPerUnit: itemsPerUnit,
          quantity: baseQty,
          unitPrice: price,
          subtotal
        });

        // Detail mutasi untuk kartu stok
        const noteDetail = saleUnit.toLowerCase() !== (product.unit || 'buah').toLowerCase()
          ? ` [${sQty} ${saleUnit} x ${itemsPerUnit} = -${baseQty} ${product.unit}]`
          : ` [-${baseQty} ${product.unit}]`;

        stockUpdates.push({
          productId: product.id,
          productName: product.name,
          newStock: product.stock - baseQty,
          quantity: baseQty,
          noteDetail
        });
      }

      // Generate Nomor Invoice Unik
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `INV-${dateStr}-${randomSuffix}`;

      // Buat Header Penjualan & Detail Items
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          customerName: finalCustomerName,
          contactId: contactId || null,
          totalAmount,
          paymentMethod,
          notes: notes || null,
          userId,
          items: {
            create: saleItemsData
          }
        },
        include: {
          items: {
            include: { product: true }
          },
          contact: true
        }
      });

      // Update stok produk dan catat log mutasi inventori
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: { stock: update.newStock }
        });

        await tx.transaction.create({
          data: {
            productId: update.productId,
            type: 'STOCK_OUT',
            quantity: update.quantity,
            notes: `Penjualan #${invoiceNo} (${customerName})${update.noteDetail}`
          }
        });
      }

      return sale;
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi penjualan berhasil disimpan dan stok telah diperbarui.',
      data: createdSale
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses transaksi penjualan.' });
  }
};
