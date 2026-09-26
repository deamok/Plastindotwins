const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Daftar Produk Beserta Stok per Lokasi Gudang
exports.getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        stocks: {
          include: {
            location: {
              select: { id: true, code: true, name: true, type: true }
            }
          }
        },
        _count: {
          select: { transactions: true }
        }
      }
    });

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data produk.', error: error.message });
  }
};

// 2. Tambah Produk Baru dengan Alokasi Stok Gudang
exports.createProduct = async (req, res) => {
  try {
    const { 
      sku, 
      name, 
      description, 
      stock, 
      stockBangetayu, 
      stockJomblang, 
      minStock, 
      price, 
      costPrice, 
      unit, 
      purchaseUnit, 
      itemsPerPurchaseUnit 
    } = req.body;

    if (!sku || !name || price === undefined) {
      return res.status(400).json({ message: 'SKU, nama, dan harga wajib diisi.' });
    }
    
    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ message: 'SKU sudah terdaftar.' });
    }

    // Hitung alokasi stok per gudang
    const qtyBangetayu = stockBangetayu !== undefined ? parseInt(stockBangetayu) || 0 : (stock ? parseInt(stock) : 0);
    const qtyJomblang = stockJomblang !== undefined ? parseInt(stockJomblang) || 0 : 0;
    const totalStock = qtyBangetayu + qtyJomblang;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat master produk
      const product = await tx.product.create({
        data: {
          sku,
          name,
          description: description || null,
          stock: totalStock,
          minStock: minStock ? parseInt(minStock) : 5,
          price,
          costPrice: costPrice !== undefined ? costPrice : 0,
          unit: unit || 'buah',
          purchaseUnit: purchaseUnit || 'kg',
          itemsPerPurchaseUnit: itemsPerPurchaseUnit ? parseFloat(itemsPerPurchaseUnit) : 1
        }
      });

      // 2. Buat atau hubungkan stok ke masing-masing lokasi
      const locations = await tx.location.findMany();
      for (const loc of locations) {
        let initialLocStock = 0;
        if (loc.code === 'BANGETAYU') initialLocStock = qtyBangetayu;
        else if (loc.code === 'JOMBLANG') initialLocStock = qtyJomblang;

        await tx.productStock.create({
          data: {
            productId: product.id,
            locationId: loc.id,
            stock: initialLocStock
          }
        });

        if (initialLocStock > 0) {
          await tx.transaction.create({
            data: {
              productId: product.id,
              locationId: loc.id,
              type: 'STOCK_IN',
              quantity: initialLocStock,
              notes: `Saldo stok awal di ${loc.name}`
            }
          });
        }
      }

      return await tx.product.findUnique({
        where: { id: product.id },
        include: {
          stocks: {
            include: { location: true }
          }
        }
      });
    });
    
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan produk.', error: error.message });
  }
};

// 3. Transaksi Penyesuaian Stok (Masuk / Keluar) dengan Pemilihan Lokasi Gudang
exports.adjustStock = async (req, res) => {
  try {
    const { productId, locationId, type, quantity, notes } = req.body;
    const qty = parseInt(quantity);

    if (!productId || !type || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'ProductId, type, dan quantity valid wajib diisi.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Produk tidak ditemukan.');

      // Cari lokasi spesifik atau default
      let targetLocation;
      if (locationId) {
        targetLocation = await tx.location.findUnique({ where: { id: locationId } });
      }
      if (!targetLocation) {
        targetLocation = await tx.location.findFirst({
          where: { type: type === 'STOCK_OUT' ? 'OUTLET' : 'STORAGE' }
        }) || await tx.location.findFirst();
      }

      // Cek stok lokasi
      const productStock = await tx.productStock.findUnique({
        where: {
          productId_locationId: { productId: product.id, locationId: targetLocation.id }
        }
      });

      const currentLocStock = productStock ? productStock.stock : 0;
      let newLocStock = currentLocStock;
      let newTotalStock = product.stock;

      if (type === 'STOCK_IN') {
        newLocStock += qty;
        newTotalStock += qty;
      } else if (type === 'STOCK_OUT') {
        if (currentLocStock < qty) {
          throw new Error(`Stok "${product.name}" di ${targetLocation.name} tidak mencukupi! Sisa stok: ${currentLocStock} ${product.unit}, dibutuhkan: ${qty} ${product.unit}.`);
        }
        newLocStock -= qty;
        newTotalStock -= qty;
      } else {
        throw new Error('Tipe transaksi tidak valid. Gunakan STOCK_IN atau STOCK_OUT.');
      }

      // Update stok lokasi
      await tx.productStock.upsert({
        where: {
          productId_locationId: { productId: product.id, locationId: targetLocation.id }
        },
        update: { stock: newLocStock },
        create: {
          productId: product.id,
          locationId: targetLocation.id,
          stock: newLocStock
        }
      });

      // Update total stok produk
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: { stock: newTotalStock },
        include: {
          stocks: { include: { location: true } }
        }
      });

      // Catat mutasi transaksi
      await tx.transaction.create({
        data: {
          productId: product.id,
          locationId: targetLocation.id,
          type,
          quantity: qty,
          notes: notes ? `[${targetLocation.name}] ${notes}` : `Penyesuaian stok di ${targetLocation.name}`
        }
      });

      return { updatedProduct, targetLocation };
    });

    const isLowStock = result.updatedProduct.stock <= result.updatedProduct.minStock;

    res.status(200).json({
      success: true,
      message: `Stok berhasil diperbarui di ${result.targetLocation.name} (${type})`,
      data: result.updatedProduct,
      alert: isLowStock ? `Peringatan: Stok ${result.updatedProduct.name} hampir habis!` : null
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memperbarui stok.' });
  }
};

// 4. Update Detail Produk (Menu Edit Barang di Stok)
// Mengedit nama, sku, deskripsi, harga, satuan, min stock, serta penyesuaian stok fisik per lokasi
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      sku,
      name, 
      description, 
      minStock, 
      price, 
      costPrice, 
      unit, 
      purchaseUnit, 
      itemsPerPurchaseUnit,
      stockBangetayu,
      stockJomblang,
      stocks
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cek produk eksis
      const existingProduct = await tx.product.findUnique({ where: { id } });
      if (!existingProduct) throw new Error('Produk tidak ditemukan.');

      // 2. Jika SKU diubah, cek apakah bentrok
      if (sku && sku !== existingProduct.sku) {
        const skuConflict = await tx.product.findUnique({ where: { sku } });
        if (skuConflict) throw new Error(`SKU "${sku}" sudah digunakan oleh produk lain.`);
      }

      // 3. Update stok per lokasi jika dikirim dari frontend
      let totalStock = existingProduct.stock;
      let shouldRecalculateStock = false;

      // Handle stockBangetayu dan stockJomblang langsung
      if (stockBangetayu !== undefined || stockJomblang !== undefined) {
        shouldRecalculateStock = true;
        const locations = await tx.location.findMany();
        const locBangetayu = locations.find((l) => l.code === 'BANGETAYU');
        const locJomblang = locations.find((l) => l.code === 'JOMBLANG');

        if (stockBangetayu !== undefined && locBangetayu) {
          const newQty = parseInt(stockBangetayu) || 0;
          await tx.productStock.upsert({
            where: { productId_locationId: { productId: id, locationId: locBangetayu.id } },
            update: { stock: newQty },
            create: { productId: id, locationId: locBangetayu.id, stock: newQty }
          });
        }

        if (stockJomblang !== undefined && locJomblang) {
          const newQty = parseInt(stockJomblang) || 0;
          await tx.productStock.upsert({
            where: { productId_locationId: { productId: id, locationId: locJomblang.id } },
            update: { stock: newQty },
            create: { productId: id, locationId: locJomblang.id, stock: newQty }
          });
        }
      } else if (Array.isArray(stocks)) {
        shouldRecalculateStock = true;
        for (const s of stocks) {
          if (s.locationId && s.stock !== undefined) {
            const newQty = parseInt(s.stock) || 0;
            await tx.productStock.upsert({
              where: { productId_locationId: { productId: id, locationId: s.locationId } },
              update: { stock: newQty },
              create: { productId: id, locationId: s.locationId, stock: newQty }
            });
          }
        }
      }

      // Hitung ulang total stok jika ada update stok lokasi
      if (shouldRecalculateStock) {
        const allLocStocks = await tx.productStock.findMany({ where: { productId: id } });
        totalStock = allLocStocks.reduce((sum, item) => sum + (item.stock || 0), 0);
      }

      // 4. Update data produk
      const updated = await tx.product.update({
        where: { id },
        data: {
          sku: sku || undefined,
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
          minStock: minStock !== undefined ? parseInt(minStock) : undefined,
          price: price !== undefined ? price : undefined,
          costPrice: costPrice !== undefined ? costPrice : undefined,
          unit: unit !== undefined ? unit : undefined,
          purchaseUnit: purchaseUnit !== undefined ? purchaseUnit : undefined,
          itemsPerPurchaseUnit: itemsPerPurchaseUnit !== undefined ? parseFloat(itemsPerPurchaseUnit) : undefined,
          stock: shouldRecalculateStock ? totalStock : undefined
        },
        include: {
          stocks: {
            include: { location: true }
          }
        }
      });

      return updated;
    });

    res.status(200).json({ 
      success: true, 
      message: 'Data produk dan stok berhasil diperbarui.',
      data: result 
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memperbarui produk.' });
  }
};

// 5. Hapus Produk
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus produk.', error: error.message });
  }
};
