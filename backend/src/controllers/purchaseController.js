const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Riwayat Pembelian
exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
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

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pembelian.', error: error.message });
  }
};

// 2. Buat Transaksi Pembelian Baru dari Supplier (ACID Transaction)
exports.createPurchase = async (req, res) => {
  try {
    const { supplierName, paymentStatus = 'PAID', notes, items } = req.body;
    const userId = req.user?.id || null;

    if (!supplierName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nama supplier dan minimal 1 item pembelian wajib diisi.' });
    }

    // Eksekusi transaksi atomik di PostgreSQL
    const createdPurchase = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const purchaseItemsData = [];
      const stockUpdates = [];

      for (const item of items) {
        const qty = parseInt(item.quantity);
        const cost = parseFloat(item.costPrice);

        if (!item.productId || isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
          throw new Error('Data item pembelian tidak valid (periksa produk, qty, dan harga beli).');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }

        const subtotal = qty * cost;
        totalAmount += subtotal;

        purchaseItemsData.push({
          productId: product.id,
          quantity: qty,
          costPrice: cost,
          subtotal
        });

        stockUpdates.push({
          productId: product.id,
          newStock: product.stock + qty,
          costPrice: cost,
          quantity: qty
        });
      }

      // Generate Nomor PO Unik
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const purchaseNo = `PO-${dateStr}-${randomSuffix}`;

      // Buat Header Pembelian & Detail Items
      const purchase = await tx.purchase.create({
        data: {
          purchaseNo,
          supplierName,
          totalAmount,
          paymentStatus,
          notes: notes || null,
          userId,
          items: {
            create: purchaseItemsData
          }
        },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      // Update stok produk & catat log mutasi penambahan stok
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stock: update.newStock,
            costPrice: update.costPrice // update estimasi modal terakhir
          }
        });

        await tx.transaction.create({
          data: {
            productId: update.productId,
            type: 'STOCK_IN',
            quantity: update.quantity,
            notes: `Pembelian #${purchaseNo} (${supplierName})`
          }
        });
      }

      return purchase;
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi pembelian berhasil disimpan dan stok telah ditambahkan.',
      data: createdPurchase
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses transaksi pembelian.' });
  }
};
