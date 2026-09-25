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
      stock: 150,
      minStock: 25,
      price: 2750.00
    },
    {
      sku: 'PLS-002',
      name: 'Jerigen Plastik 5 Liter Biru',
      description: 'Jerigen tebal anti bocor untuk cairan kimia/minyak',
      stock: 4, // Under minStock -> LOW STOCK TRIGGER
      minStock: 15,
      price: 18500.00
    },
    {
      sku: 'PLS-003',
      name: 'Tutup Botol Ulir Segel 28mm Merah',
      description: 'Tutup botol plastik ber-segel anti tumpah',
      stock: 600,
      minStock: 100,
      price: 450.00
    },
    {
      sku: 'PLS-004',
      name: 'Kantong Plastik PP Bening Tebal 30x40',
      description: 'Plastik transparan serbaguna kemasan beras/snack',
      stock: 3, // Under minStock -> LOW STOCK TRIGGER
      minStock: 20,
      price: 14000.00
    }
  ];

  for (const item of products) {
    const prod = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {},
      create: item
    });
    console.log(`Product created: [${prod.sku}] ${prod.name} (Stock: ${prod.stock})`);
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
