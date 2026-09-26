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
    ukuran = ukuran.replace(/\s+(?:sablon|polos).*$/i, '').trim();
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

function determinePurchaseUnit(cat, subcat) {
  if (cat === 'Plastik Kemasan' || cat === 'Plastik Penyimpanan') {
    return 'kg';
  }
  return 'dus';
}

function mapSatuanToUnit(satuan, cat, subcat) {
  if (!satuan) return 'buah';
  const s = satuan.toLowerCase().trim();
  if (s === 'lbr') return 'lembar';
  if (s === 'bh') {
    if (subcat.includes('Tape') || subcat.includes('Perekat')) return 'roll';
    return 'buah';
  }
  if (s === 'bks') return 'bungkus';
  return s;
}

async function main() {
  console.log('--- Memperbarui Master Barang dari stok barang.csv ---');
  const csvPath = path.join(__dirname, '../../stok barang.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`File CSV tidak ditemukan di: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((l) => l.trim().length > 0).slice(1);
  console.log(`Ditemukan ${lines.length} baris barang dalam CSV.`);

  const locations = await prisma.location.findMany();
  console.log(`Lokasi gudang terdaftar: ${locations.map((l) => l.name).join(', ')}`);

  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    const parts = row.split(';').map((s) => (s ? s.replace(/\r/g, '').trim() : ''));
    const no = parseInt(parts[0]);
    let sku = parts[1];
    const cat = parts[2];
    const subcat = parts[3];
    const rawName = parts[4];
    const rawSatuan = parts[5];

    if (!sku || !rawName) continue;

    // Perbaiki SKU duplikat pada Perlengkapan Penunjang (No. 145-150)
    // yang tercatat sebagai 03.01.xxx agar sesuai hierarki kategori 04
    if (cat === 'Perlengkapan Penunjang') {
      if (subcat.includes('Tissue')) {
        const seq = String(no - 144).padStart(3, '0');
        sku = `SKU. 04.01.${seq}`;
      } else if (subcat.includes('Tape') || subcat.includes('Perekat')) {
        const seq = String(no - 148).padStart(3, '0');
        sku = `SKU. 04.02.${seq}`;
      }
    }

    const { rawName: cleanName, description } = extractDetails(rawName);
    const unit = mapSatuanToUnit(rawSatuan, cat, subcat);
    const purchaseUnit = determinePurchaseUnit(cat, subcat);

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
          description: description,
          unit,
          purchaseUnit
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

  const total = await prisma.product.count();
  console.log(`\n=== UPDATE SELESAI ===`);
  console.log(`Barang Diperbarui (Updated): ${updatedCount}`);
  console.log(`Barang Baru Diimpor: ${importedCount}`);
  console.log(`Total produk aktif di database: ${total}`);
}

main()
  .catch((e) => {
    console.error('Error saat update produk:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
