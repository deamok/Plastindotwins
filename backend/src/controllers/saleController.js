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
              select: { id: true, sku: true, name: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true }
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
    const { customerName, paymentMethod = 'CASH', notes, items } = req.body;
    const userId = req.user?.id || null;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nama pelanggan dan minimal 1 item penjualan wajib diisi.' });
    }

    // Eksekusi transaksi atomik di PostgreSQL
    const createdSale = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsData = [];
      const stockUpdates = [];

      // Validasi setiap item & ketersediaan stok
      for (const item of items) {
        const qty = parseInt(item.quantity);
        const price = parseFloat(item.unitPrice);

        if (!item.productId || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
          throw new Error('Data item penjualan tidak valid (periksa produk, qty, dan harga).');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }

        if (product.stock < qty) {
          throw new Error(`Stok "${product.name}" tidak mencukupi! Sisa stok: ${product.stock} pcs, diminta: ${qty} pcs.`);
        }

        const subtotal = qty * price;
        totalAmount += subtotal;

        saleItemsData.push({
          productId: product.id,
          quantity: qty,
          unitPrice: price,
          subtotal
        });

        // Simpan rencana pembaruan stok
        stockUpdates.push({
          productId: product.id,
          productName: product.name,
          newStock: product.stock - qty,
          quantity: qty
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
          customerName,
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
          }
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
            notes: `Penjualan #${invoiceNo} (${customerName})`
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
