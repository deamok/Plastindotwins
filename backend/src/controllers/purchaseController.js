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
              select: { id: true, sku: true, name: true, unit: true, purchaseUnit: true, itemsPerPurchaseUnit: true }
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

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pembelian.', error: error.message });
  }
};

// 2. Buat Transaksi Pembelian Baru dari Supplier (ACID Transaction dengan Konversi Satuan)
exports.createPurchase = async (req, res) => {
  try {
    const { supplierName, contactId, paymentStatus = 'PAID', notes, items } = req.body;
    const userId = req.user?.id || null;

    let finalSupplierName = supplierName;
    if (contactId) {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (contact) {
        finalSupplierName = contact.name;
      }
    }

    if (!finalSupplierName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Nama supplier dan minimal 1 item pembelian wajib diisi.' });
    }

    // Eksekusi transaksi atomik di PostgreSQL
    const createdPurchase = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const purchaseItemsData = [];
      const stockUpdates = [];

      for (const item of items) {
        // Mendukung pembelian dalam Kg (purchaseQty) dan konversi ke satuan jual (pak/buah)
        const pQty = parseFloat(item.purchaseQty !== undefined ? item.purchaseQty : item.quantity);
        const cost = parseFloat(item.costPrice);

        if (!item.productId || isNaN(pQty) || pQty <= 0 || isNaN(cost) || cost < 0) {
          throw new Error('Data item pembelian tidak valid (periksa produk, jumlah beli, dan harga beli).');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }

        // Rasio konversi: berapa pak/buah per 1 kg (diambil dari item atau master product)
        const itemsPerUnit = parseFloat(
          item.itemsPerUnit !== undefined ? item.itemsPerUnit : product.itemsPerPurchaseUnit || 1
        );
        const purchaseUnit = item.purchaseUnit || product.purchaseUnit || 'kg';

        // Total stok dasar (buah/pak) yang masuk ke gudang
        const baseQty = Math.round(pQty * itemsPerUnit);

        const subtotal = pQty * cost;
        totalAmount += subtotal;

        purchaseItemsData.push({
          productId: product.id,
          purchaseQty: pQty,
          purchaseUnit: purchaseUnit,
          itemsPerUnit: itemsPerUnit,
          quantity: baseQty,
          costPrice: cost,
          subtotal
        });

        stockUpdates.push({
          productId: product.id,
          newStock: product.stock + baseQty,
          costPrice: cost,
          addedQty: baseQty,
          pQty,
          purchaseUnit,
          itemsPerUnit,
          baseUnit: product.unit || 'buah'
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
          supplierName: finalSupplierName,
          contactId: contactId || null,
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
          },
          contact: true
        }
      });

      // Update stok produk & catat log mutasi penambahan stok
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stock: update.newStock,
            costPrice: update.costPrice // update estimasi modal beli per kg
          }
        });

        await tx.transaction.create({
          data: {
            productId: update.productId,
            type: 'STOCK_IN',
            quantity: update.addedQty,
            notes: `Pembelian #${purchaseNo} (${supplierName}) [${update.pQty} ${update.purchaseUnit} x ${update.itemsPerUnit} = +${update.addedQty} ${update.baseUnit}]`
          }
        });
      }

      return purchase;
    });

    res.status(201).json({
      success: true,
      message: 'Transaksi pembelian berhasil disimpan dan stok telah dikonversi & ditambahkan.',
      data: createdPurchase
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses transaksi pembelian.' });
  }
};
