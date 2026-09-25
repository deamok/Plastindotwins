const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Daftar Produk
exports.getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
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

// 2. Tambah Produk Baru
exports.createProduct = async (req, res) => {
  try {
    const { sku, name, description, stock, minStock, price } = req.body;

    if (!sku || !name || price === undefined) {
      return res.status(400).json({ message: 'SKU, nama, dan harga wajib diisi.' });
    }
    
    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ message: 'SKU sudah terdaftar.' });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description: description || null,
        stock: stock ? parseInt(stock) : 0,
        minStock: minStock ? parseInt(minStock) : 5,
        price
      }
    });
    
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan produk.', error: error.message });
  }
};

// 3. Transaksi Penyesuaian Stok (Masuk / Keluar)
exports.adjustStock = async (req, res) => {
  try {
    const { productId, type, quantity, notes } = req.body;
    const qty = parseInt(quantity);

    if (!productId || !type || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: 'ProductId, type, dan quantity valid wajib diisi.' });
    }

    // Validasi produk
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Produk tidak ditemukan.' });

    // Hitung stok baru
    let newStock = product.stock;
    if (type === 'STOCK_IN') {
      newStock += qty;
    } else if (type === 'STOCK_OUT') {
      if (product.stock < qty) {
        return res.status(400).json({ message: 'Stok tidak mencukupi untuk transaksi ini.' });
      }
      newStock -= qty;
    } else {
      return res.status(400).json({ message: 'Tipe transaksi tidak valid. Gunakan STOCK_IN atau STOCK_OUT.' });
    }

    // Eksekusi ACID Transaction di Database
    const result = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock }
      }),
      prisma.transaction.create({
        data: { productId, type, quantity: qty, notes: notes || null }
      })
    ]);

    // Beri peringatan jika stok menyentuh batas minimum
    const updatedProduct = result[0];
    const isLowStock = updatedProduct.stock <= updatedProduct.minStock;

    res.status(200).json({
      success: true,
      message: `Stok berhasil diperbarui (${type})`,
      data: updatedProduct,
      alert: isLowStock ? `Peringatan: Stok ${updatedProduct.name} hampir habis!` : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui stok.', error: error.message });
  }
};

// 4. Update Detail Produk
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, minStock, price } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        minStock: minStock !== undefined ? parseInt(minStock) : undefined,
        price
      }
    });

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui produk.', error: error.message });
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
