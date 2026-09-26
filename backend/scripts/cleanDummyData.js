const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDummyData() {
  console.log('--- Menghapus Semua Data Dummy ---');

  // 1. Hapus SaleItem & Sale
  const deletedSaleItems = await prisma.saleItem.deleteMany();
  const deletedSales = await prisma.sale.deleteMany();
  console.log(`Dihapus: ${deletedSales.count} transaksi penjualan (${deletedSaleItems.count} items).`);

  // 2. Hapus PurchaseItem & Purchase
  const deletedPurchaseItems = await prisma.purchaseItem.deleteMany();
  const deletedPurchases = await prisma.purchase.deleteMany();
  console.log(`Dihapus: ${deletedPurchases.count} transaksi pembelian (${deletedPurchaseItems.count} items).`);

  // 3. Hapus StockTransfer
  const deletedTransfers = await prisma.stockTransfer.deleteMany();
  console.log(`Dihapus: ${deletedTransfers.count} mutasi transfer antar gudang.`);

  // 4. Hapus Transaction logs
  const deletedTransactions = await prisma.transaction.deleteMany();
  console.log(`Dihapus: ${deletedTransactions.count} riwayat mutasi stok.`);

  // 5. Hapus 6 Produk Dummy (non-CSV)
  const deletedProducts = await prisma.product.deleteMany({
    where: {
      NOT: {
        sku: { startsWith: 'SKU.' }
      }
    }
  });
  console.log(`Dihapus: ${deletedProducts.count} produk dummy sampel awal.`);

  // 6. Hapus Dummy Contacts
  const deletedContacts = await prisma.contact.deleteMany();
  console.log(`Dihapus: ${deletedContacts.count} kontak dummy.`);

  // 7. Reset saldo stok 150 produk CSV menjadi 0 jika ada sisa nilai
  await prisma.product.updateMany({
    where: { sku: { startsWith: 'SKU.' } },
    data: { stock: 0 }
  });
  await prisma.productStock.updateMany({
    data: { stock: 0 }
  });
  console.log('Semua stok produk riil dari CSV diset ke saldo awal bersih (0).');

  // Verifikasi akhir
  const remainingProducts = await prisma.product.count();
  const remainingUsers = await prisma.user.count();
  const remainingLocations = await prisma.location.count();
  const remainingContacts = await prisma.contact.count();
  const remainingSales = await prisma.sale.count();
  const remainingPurchases = await prisma.purchase.count();

  console.log('\n=== STATUS DATABASE SETELAH PEMBERSIHAN ===');
  console.log(`Produk Aktif (Real dari CSV): ${remainingProducts}`);
  console.log(`Gudang / Lokasi: ${remainingLocations}`);
  console.log(`Pengguna Sistem (User): ${remainingUsers}`);
  console.log(`Kontak: ${remainingContacts}`);
  console.log(`Penjualan (Sales): ${remainingSales}`);
  console.log(`Pembelian (Purchases): ${remainingPurchases}`);
}

cleanDummyData()
  .catch((e) => {
    console.error('Error saat membersihkan data dummy:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
