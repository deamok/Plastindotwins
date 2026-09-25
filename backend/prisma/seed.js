const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Seed Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@plastindo.com' },
    update: {},
    create: {
      email: 'admin@plastindo.com',
      name: 'Admin Plastindo',
      password: adminPassword,
      role: 'ADMIN'
    }
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@plastindo.com' },
    update: {},
    create: {
      email: 'staff@plastindo.com',
      name: 'Staff Gudang Budi',
      password: staffPassword,
      role: 'STAFF'
    }
  });

  console.log(`Users created: ${admin.email}, ${staff.email}`);

  // 2. Seed Products
  const products = [
    {
      sku: 'PLS-001',
      name: 'Botol Plastik HDPE 500ml Putih',
      description: 'Material HDPE Food Grade dengan tutup ulir',
      stock: 180,
      minStock: 25,
      price: 2750.00,
      costPrice: 1900.00
    },
    {
      sku: 'PLS-002',
      name: 'Jerigen Plastik 5 Liter Biru',
      description: 'Jerigen tebal anti bocor untuk cairan kimia/minyak',
      stock: 4, // Under minStock -> LOW STOCK TRIGGER
      minStock: 15,
      price: 18500.00,
      costPrice: 13000.00
    },
    {
      sku: 'PLS-003',
      name: 'Tutup Botol Ulir Segel 28mm Merah',
      description: 'Tutup botol plastik ber-segel anti tumpah',
      stock: 600,
      minStock: 100,
      price: 450.00,
      costPrice: 280.00
    },
    {
      sku: 'PLS-004',
      name: 'Kantong Plastik PP Bening Tebal 30x40',
      description: 'Plastik transparan serbaguna kemasan beras/snack',
      stock: 52,
      minStock: 20,
      price: 14000.00,
      costPrice: 10000.00
    }
  ];

  const createdProds = {};
  for (const item of products) {
    const prod = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        costPrice: item.costPrice
      },
      create: item
    });
    createdProds[prod.sku] = prod;
    console.log(`Product created/updated: [${prod.sku}] ${prod.name} (Stock: ${prod.stock})`);
  }

  // 3. Seed Sample Purchase
  const existingPurchase = await prisma.purchase.findFirst();
  if (!existingPurchase && createdProds['PLS-001']) {
    const p1 = createdProds['PLS-001'];
    await prisma.purchase.create({
      data: {
        purchaseNo: 'PO-20260925-001',
        supplierName: 'PT Polimer Raya Indonesia',
        totalAmount: 190000,
        paymentStatus: 'PAID',
        notes: 'Pengadaan awal botol plastik',
        userId: admin.id,
        items: {
          create: [
            {
              productId: p1.id,
              quantity: 100,
              costPrice: 1900,
              subtotal: 190000
            }
          ]
        }
      }
    });
    console.log('Sample purchase created: PO-20260925-001');
  }

  // 4. Seed Sample Sale
  const existingSale = await prisma.sale.findFirst();
  if (!existingSale && createdProds['PLS-001']) {
    const p1 = createdProds['PLS-001'];
    await prisma.sale.create({
      data: {
        invoiceNo: 'INV-20260925-001',
        customerName: 'Toko Sumber Rezeki Plastik',
        totalAmount: 55000,
        paymentMethod: 'CASH',
        notes: 'Penjualan tunai langsung kasir',
        userId: staff.id,
        items: {
          create: [
            {
              productId: p1.id,
              quantity: 20,
              unitPrice: 2750,
              subtotal: 55000
            }
          ]
        }
      }
    });
    console.log('Sample sale created: INV-20260925-001');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
