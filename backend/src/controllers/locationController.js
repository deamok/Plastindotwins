const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Lokasi Gudang beserta Ringkasan Stok
exports.getAllLocations = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { code: 'asc' },
      include: {
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                price: true,
                minStock: true
              }
            }
          }
        }
      }
    });

    const summary = locations.map((loc) => {
      const totalUnits = loc.stocks.reduce((acc, s) => acc + (s.stock || 0), 0);
      const lowStockItems = loc.stocks.filter((s) => s.stock <= s.product.minStock).length;
      return {
        ...loc,
        totalUnits,
        totalItemsCount: loc.stocks.length,
        lowStockItems
      };
    });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data lokasi gudang.', error: error.message });
  }
};

// 2. Transfer / Mutasi Stok Antar Gudang (ACID Transaction)
// Misal: Transfer dari Bangetayu (Penyimpanan) ke Jomblang (Outlet Penjualan)
exports.transferStock = async (req, res) => {
  try {
    const { sourceLocationId, destLocationId, productId, quantity, notes } = req.body;
    const userId = req.user?.id || null;
    const qty = parseInt(quantity);

    if (!sourceLocationId || !destLocationId || !productId || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        message: 'Gudang asal, gudang tujuan, produk, dan jumlah transfer (> 0) wajib diisi.'
      });
    }

    if (sourceLocationId === destLocationId) {
      return res.status(400).json({
        message: 'Gudang asal dan gudang tujuan tidak boleh sama.'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validasi produk & lokasi
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Produk tidak ditemukan.');

      const sourceLoc = await tx.location.findUnique({ where: { id: sourceLocationId } });
      const destLoc = await tx.location.findUnique({ where: { id: destLocationId } });
      if (!sourceLoc || !destLoc) throw new Error('Salah satu lokasi tidak ditemukan.');

      // 2. Cek stok di lokasi asal
      const sourceStock = await tx.productStock.findUnique({
        where: {
          productId_locationId: { productId, locationId: sourceLocationId }
        }
      });

      const currentSourceQty = sourceStock ? sourceStock.stock : 0;
      if (currentSourceQty < qty) {
        throw new Error(
          `Stok "${product.name}" di ${sourceLoc.name} tidak mencukupi! Tersedia: ${currentSourceQty} ${product.unit}, dibutuhkan: ${qty} ${product.unit}.`
        );
      }

      // 3. Kurangi stok di gudang asal
      const updatedSourceStock = await tx.productStock.update({
        where: {
          productId_locationId: { productId, locationId: sourceLocationId }
        },
        data: { stock: currentSourceQty - qty }
      });

      // 4. Tambah stok di gudang tujuan
      const destStock = await tx.productStock.findUnique({
        where: {
          productId_locationId: { productId, locationId: destLocationId }
        }
      });

      const currentDestQty = destStock ? destStock.stock : 0;
      const updatedDestStock = await tx.productStock.upsert({
        where: {
          productId_locationId: { productId, locationId: destLocationId }
        },
        update: { stock: currentDestQty + qty },
        create: {
          productId,
          locationId: destLocationId,
          stock: qty
        }
      });

      // 5. Generate Nomor Mutasi Transfer
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const transferNo = `TRF-${dateStr}-${randomSuffix}`;

      // 6. Buat Record Transfer
      const transfer = await tx.stockTransfer.create({
        data: {
          transferNo,
          sourceLocationId,
          destLocationId,
          productId,
          quantity: qty,
          notes: notes || null,
          userId
        },
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
          sourceLocation: { select: { id: true, name: true, code: true } },
          destLocation: { select: { id: true, name: true, code: true } }
        }
      });

      // 7. Catat audit di Transaction log
      await tx.transaction.create({
        data: {
          productId,
          locationId: sourceLocationId,
          type: 'TRANSFER_OUT',
          quantity: qty,
          notes: `Transfer #${transferNo} keluar menuju ${destLoc.name}. Catatan: ${notes || '-'}`
        }
      });

      await tx.transaction.create({
        data: {
          productId,
          locationId: destLocationId,
          type: 'TRANSFER_IN',
          quantity: qty,
          notes: `Transfer #${transferNo} masuk dari ${sourceLoc.name}. Catatan: ${notes || '-'}`
        }
      });

      return {
        transfer,
        sourceStock: updatedSourceStock.stock,
        destStock: updatedDestStock.stock
      };
    });

    res.status(200).json({
      success: true,
      message: `Mutasi berhasil! Dipindahkan ${qty} unit dari ${result.transfer.sourceLocation.name} ke ${result.transfer.destLocation.name}.`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses mutasi stok.' });
  }
};

// 3. Ambil Riwayat Mutasi Antar Gudang
exports.getTransferHistory = async (req, res) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        product: { select: { id: true, sku: true, name: true, unit: true } },
        sourceLocation: { select: { id: true, name: true, code: true } },
        destLocation: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({ success: true, data: transfers });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil riwayat mutasi.', error: error.message });
  }
};
