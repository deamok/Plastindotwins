-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "itemsPerPurchaseUnit" DECIMAL(10,2) NOT NULL DEFAULT 1,
ADD COLUMN     "purchaseUnit" TEXT NOT NULL DEFAULT 'kg',
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'buah';

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "itemsPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 1,
ADD COLUMN     "purchaseQty" DECIMAL(10,2) NOT NULL DEFAULT 1,
ADD COLUMN     "purchaseUnit" TEXT NOT NULL DEFAULT 'kg';
