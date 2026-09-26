const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function extractDetails(rawName) {
  let text = rawName.replace(/\r/g, '').trim();
  let warna = null;
  let ukuran = null;

  // Ukuran extraction
  const ukMatch = text.match(/ukuran\s+([0-9a-zA-Z\s.,xX/()\-]+?)(?=\s+(?:sablon|polos|warna|merek|merk)|$)/i);
  if (ukMatch) {
    ukuran = ukMatch[1].trim();
  }
  if (!ukuran) {
    if (/600gr/i.test(text)) ukuran = '600gr';
    else if (/1000ply/i.test(text)) ukuran = '1000 ply';
    else if (/250ply/i.test(text)) ukuran = '250 ply';
    else if (/600pcs/i.test(text)) ukuran = '600 pcs';
  }

  // Warna extraction
  const wMatch = text.match(/warna\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  if (wMatch) {
    let rawW = wMatch[1].trim();
    rawW = rawW.replace(/\s+(?:merek|merk|ukuran|\(ALUS\)|\(JAMUR\)|0,3|0,8|2IK|polos|sablon|logo).*$/i, '').trim();
    warna = rawW;
  } else if (/polos bening|sablon bening|warna bening|bening polos/i.test(text)) {
    warna = 'Bening';
  } else if (/sablon biru|polos warna biru|sablon warna biru/i.test(text)) {
    warna = 'Biru';
  } else if (/sablon merah|polos warna merah|sablon warna merah/i.test(text)) {
    warna = 'Merah';
  } else if (/warna putih/i.test(text)) {
    warna = 'Putih';
  } else if (/warna hitam/i.test(text)) {
    warna = 'Hitam';
  } else if (/warna kuning/i.test(text)) {
    warna = 'Kuning';
  }

  if (warna) {
    warna = warna.charAt(0).toUpperCase() + warna.slice(1).toLowerCase();
  }

  const descParts = [];
  if (warna) descParts.push(`Warna: ${warna}`);
  if (ukuran) descParts.push(`Ukuran: ${ukuran}`);

  return {
    rawName: text,
    warna,
    ukuran,
    description: descParts.length > 0 ? descParts.join(' | ') : null
  };
}

function determineUnits(cat, subcat, name) {
  let unit = 'pak';
  let purchaseUnit = 'kg';

  if (subcat.includes('Tape') || subcat.includes('Perekat')) {
    unit = 'roll';
    purchaseUnit = 'dus';
  } else if (subcat.includes('Tissue') || subcat.includes('Kertas Tisu')) {
    unit = 'pak';
    purchaseUnit = 'dus';
  } else if (subcat.includes('Cup') || subcat.includes('Gelas')) {
    unit = 'pak';
    purchaseUnit = 'dus';
  } else if (subcat.includes('Alat Kesehatan')) {
    unit = 'buah';
    purchaseUnit = 'dus';
  } else if (subcat.includes('Wadah Obat')) {
    if (/klip|kertas/i.test(name)) {
      unit = 'pak';
      purchaseUnit = 'dus';
    } else {
      unit = 'buah';
      purchaseUnit = 'dus';
    }
  }

  return { unit, purchaseUnit };
}

async function main() {
  console.log('--- Memulai Import Master Barang dari CSV ---');
  const csvPath = path.join(__dirname, '../../stok barang.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`File CSV tidak ditemukan di: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0).slice(1);
  console.log(`Ditemukan ${lines.length} baris barang dalam CSV.`);

  // Pastikan lokasi gudang tersedia
  const locations = await prisma.location.findMany();
  console.log(`Lokasi gudang terdaftar: ${locations.map((l) => l.name).join(', ')}`);

  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    const parts = row.split(';').map((s) => (s ? s.trim() : ''));
    const no = parseInt(parts[0]);
    let sku = parts[1];
    const cat = parts[2];
    const subcat = parts[3];
    const rawName = parts[4];

    if (!sku || !rawName) continue;

    // Perbaiki SKU duplikat pada Perlengkapan Penunjang (No. 145-150)
    // yang tercatat sebagai 03.01.xxx agar sesuai hierarki kategori 04
    if (cat === 'Perlengkapan Penunjang') {
      if (subcat.includes('Tissue')) {
        // No 145 -> 04.01.001, No 146 -> 04.01.002, dst
        const seq = String(no - 144).padStart(3, '0');
        sku = `SKU. 04.01.${seq}`;
      } else if (subcat.includes('Tape') || subcat.includes('Perekat')) {
        const seq = String(no - 148).padStart(3, '0');
        sku = `SKU. 04.02.${seq}`;
      }
    }

    const { rawName: cleanName, description } = extractDetails(rawName);
    const { unit, purchaseUnit } = determineUnits(cat, subcat, cleanName);

    // Cari apakah produk sudah ada dengan SKU ini
    const existing = await prisma.product.findUnique({
      where: { sku },
      include: { stocks: true }
    });

    let product;
    if (existing) {
      product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          category: cat,
          subCategory: subcat,
          description: description || existing.description
        }
      });
      updatedCount++;
    } else {
      product = await prisma.product.create({
        data: {
          sku,
          name: cleanName,
          category: cat,
          subCategory: subcat,
          description,
          stock: 0,
          minStock: 5,
          unit,
          purchaseUnit,
          itemsPerPurchaseUnit: 1,
          price: 0,
          costPrice: 0
        }
      });
      importedCount++;
    }

    // Pastikan kedua lokasi gudang memiliki ProductStock untuk produk ini
    for (const loc of locations) {
      await prisma.productStock.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: loc.id
          }
        },
        update: {},
        create: {
          productId: product.id,
          locationId: loc.id,
          stock: 0
        }
      });
    }
  }

  // Update kategori untuk 6 produk sampel lama jika belum memiliki kategori
  await prisma.product.updateMany({
    where: { sku: 'PLS-003', category: null },
    data: { category: 'Plastik Kemasan', subCategory: 'Wadah Botol' }
  });
  await prisma.product.updateMany({
    where: { sku: 'PLS-002', category: null },
    data: { category: 'Plastik Penyimpanan', subCategory: 'Jerigen' }
  });
  await prisma.product.updateMany({
    where: { sku: 'PLS-KRESEK-HD', category: null },
    data: { category: 'Plastik Kemasan', subCategory: 'T-Shirt Bag' }
  });
  await prisma.product.updateMany({
    where: { sku: 'PLS-001', category: null },
    data: { category: 'Plastik Kemasan', subCategory: 'Wadah Botol' }
  });
  await prisma.product.updateMany({
    where: { sku: 'PLS-004', category: null },
    data: { category: 'Plastik Penyimpanan', subCategory: 'Plastik Bening' }
  });
  await prisma.product.updateMany({
    where: { sku: 'PLS-006', category: null },
    data: { category: 'Plastik Kemasan', subCategory: 'Plastik Sepatu' }
  });

  const total = await prisma.product.count();
  console.log(`\n=== IMPORT SELESAI ===`);
  console.log(`Baru diimpor: ${importedCount}`);
  console.log(`Diperbarui: ${updatedCount}`);
  console.log(`Total produk di database sekarang: ${total}`);
}

main()
  .catch((e) => {
    console.error('Error saat import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
