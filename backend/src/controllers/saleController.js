const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Riwayat Penjualan
exports.getAllSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { id: true, code: true, name: true, type: true }
        },
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
// Default memotong stok dari Outlet Jomblang (outlet penjualan)
exports.createSale = async (req, res) => {
  try {
    const { customerName, contactId, locationId, paymentMethod = 'CASH', notes, items } = req.body;
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
      // 1. Tentukan lokasi outlet/gudang sumber pengurangan stok (default: Outlet Jomblang)
      let targetLoc;
      if (locationId) {
        targetLoc = await tx.location.findUnique({ where: { id: locationId } });
      }
      if (!targetLoc) {
        targetLoc = await tx.location.findFirst({ where: { type: 'OUTLET' } }) ||
                    await tx.location.findFirst({ where: { code: 'JOMBLANG' } }) ||
                    await tx.location.findFirst();
      }

      let totalAmount = 0;
      const saleItemsData = [];
      const stockUpdates = [];

      // 2. Validasi setiap item & ketersediaan stok fisik di lokasi terkait
      for (const item of items) {
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

        // Ambil stok produk khusus di lokasi target (misal Outlet Jomblang)
        const productStock = await tx.productStock.findUnique({
          where: {
            productId_locationId: { productId: product.id, locationId: targetLoc.id }
          }
        });

        const currentLocStock = productStock ? productStock.stock : 0;

        if (currentLocStock < baseQty) {
          // Cari info stok di gudang lain (misal Gudang Bangetayu) untuk saran mutasi
          const otherStocks = await tx.productStock.findMany({
            where: { productId: product.id, NOT: { locationId: targetLoc.id } },
            include: { location: true }
          });
          const otherInfo = otherStocks.map(s => `${s.location.name}: ${s.stock} ${product.unit}`).join(', ');

          throw new Error(
            `Stok "${product.name}" di ${targetLoc.name} tidak mencukupi! Sisa stok: ${currentLocStock} ${product.unit}, dibutuhkan: ${baseQty} ${product.unit} (${sQty} ${saleUnit}).${otherInfo ? ` [Tersedia di ${otherInfo}]` : ''}`
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
          currentTotalStock: product.stock,
          currentLocStock,
          newLocStock: currentLocStock - baseQty,
          newTotalStock: product.stock - baseQty,
          quantity: baseQty,
          noteDetail
        });
      }

      // 3. Generate Nomor Invoice Unik
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `INV-${dateStr}-${randomSuffix}`;

      // 4. Buat Header Penjualan & Detail Items
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          customerName: finalCustomerName,
          contactId: contactId || null,
          locationId: targetLoc.id,
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
          contact: true
        }
      });

      // 5. Update stok lokasi, stok total produk, dan catat log mutasi inventori
      for (const update of stockUpdates) {
        // Kurangi stok di lokasi target
        await tx.productStock.update({
          where: {
            productId_locationId: { productId: update.productId, locationId: targetLoc.id }
          },
          data: { stock: update.newLocStock }
        });

        // Kurangi total stok produk
        await tx.product.update({
          where: { id: update.productId },
          data: { stock: update.newTotalStock }
        });

        // Catat di kartu mutasi
        await tx.transaction.create({
          data: {
            productId: update.productId,
            locationId: targetLoc.id,
            type: 'STOCK_OUT',
            quantity: update.quantity,
            notes: `Penjualan #${invoiceNo} (${finalCustomerName}) di ${targetLoc.name}${update.noteDetail}`
          }
        });
      }

      return sale;
    });

    res.status(201).json({
      success: true,
      message: `Transaksi penjualan berhasil disimpan dan stok di ${createdSale.location?.name || 'outlet'} telah dipotong.`,
      data: createdSale
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses transaksi penjualan.' });
  }
};
