const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Ambil Semua Riwayat Pembelian
exports.getAllPurchases = async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { id: true, code: true, name: true, type: true }
        },
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
          select: { id: true, name: true, phone: true, email: true, address: true, province: true, bankName: true, bankAccountNo: true, bankAccountHolder: true }
        }
      }
    });

    res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pembelian.', error: error.message });
  }
};

// 2. Buat Transaksi Pembelian Baru dari Supplier (ACID Transaction dengan Konversi Satuan)
// Default masuk ke Gudang Bangetayu (Pusat Penyimpanan)
exports.createPurchase = async (req, res) => {
  try {
    const { 
      supplierName, 
      contactId, 
      locationId, 
      invoiceNo,
      fakturNo,
      purchaseDate,
      tanggal,
      paymentStatus = 'PAID', 
      notes, 
      items 
    } = req.body;
    const userId = req.user?.id || null;

    const finalInvoiceNo = invoiceNo || fakturNo || null;
    let finalPurchaseDate = new Date();
    if (purchaseDate || tanggal) {
      const parsedDate = new Date(purchaseDate || tanggal);
      if (!isNaN(parsedDate.getTime())) {
        finalPurchaseDate = parsedDate;
      }
    }

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
      // 1. Tentukan lokasi gudang penerimaan barang (default: Gudang Bangetayu)
      let targetLoc;
      if (locationId) {
        targetLoc = await tx.location.findUnique({ where: { id: locationId } });
      }
      if (!targetLoc) {
        targetLoc = await tx.location.findFirst({ where: { type: 'STORAGE' } }) ||
                    await tx.location.findFirst({ where: { code: 'BANGETAYU' } }) ||
                    await tx.location.findFirst();
      }

      let totalAmount = 0;
      const purchaseItemsData = [];
      const stockUpdates = [];

      for (const item of items) {
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

        // Rasio konversi: berapa pak/buah per 1 kg
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

        // Ambil stok produk di gudang target penerimaan
        const locStock = await tx.productStock.findUnique({
          where: {
            productId_locationId: { productId: product.id, locationId: targetLoc.id }
          }
        });
        const currentLocStock = locStock ? locStock.stock : 0;

        stockUpdates.push({
          productId: product.id,
          currentTotalStock: product.stock,
          newTotalStock: product.stock + baseQty,
          currentLocStock,
          newLocStock: currentLocStock + baseQty,
          costPrice: cost,
          addedQty: baseQty,
          pQty,
          purchaseUnit,
          itemsPerUnit,
          baseUnit: product.unit || 'buah'
        });
      }

      // 2. Generate Nomor PO Unik
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const purchaseNo = `PO-${dateStr}-${randomSuffix}`;

      // 3. Buat Header Pembelian & Detail Items
      const purchase = await tx.purchase.create({
        data: {
          purchaseNo,
          invoiceNo: finalInvoiceNo ? finalInvoiceNo.trim() : null,
          purchaseDate: finalPurchaseDate,
          supplierName: finalSupplierName,
          contactId: contactId || null,
          locationId: targetLoc.id,
          totalAmount,
          paymentStatus,
          notes: notes || null,
          userId,
          items: {
            create: purchaseItemsData
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

      // 4. Update stok lokasi & total produk serta catat log mutasi penambahan stok
      for (const update of stockUpdates) {
        // Update stok di gudang penerimaan
        await tx.productStock.upsert({
          where: {
            productId_locationId: { productId: update.productId, locationId: targetLoc.id }
          },
          update: { stock: update.newLocStock },
          create: {
            productId: update.productId,
            locationId: targetLoc.id,
            stock: update.newLocStock
          }
        });

        // Update total stok & modal produk
        await tx.product.update({
          where: { id: update.productId },
          data: {
            stock: update.newTotalStock,
            costPrice: update.costPrice // update estimasi modal beli per kg
          }
        });

        // Catat di kartu mutasi
        await tx.transaction.create({
          data: {
            productId: update.productId,
            locationId: targetLoc.id,
            type: 'STOCK_IN',
            quantity: update.addedQty,
            notes: `Pembelian #${purchaseNo} (${finalSupplierName}) di ${targetLoc.name} [${update.pQty} ${update.purchaseUnit} x ${update.itemsPerUnit} = +${update.addedQty} ${update.baseUnit}]`
          }
        });
      }

      return purchase;
    });

    res.status(201).json({
      success: true,
      message: `Transaksi pembelian berhasil disimpan dan stok telah masuk ke ${createdPurchase.location?.name || 'gudang'}.`,
      data: createdPurchase
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Gagal memproses transaksi pembelian.' });
  }
};
