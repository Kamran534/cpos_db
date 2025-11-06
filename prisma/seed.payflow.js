/* eslint-disable no-console */
require('dotenv').config();
const path = require('path');

// Use generated Prisma client for local SQLite (schema.payflow.prisma)
const { PrismaClient } = require('../node_modules/.prisma/payflow-client');

// Resolve the SQLite path to the same file the app uses (default: ./payflow.db)
function resolveSqliteUrl() {
  let SQLITE_PATH_LOCAL = process.env.SQLITE_PATH_LOCAL;
  if (!SQLITE_PATH_LOCAL) {
    const dbPath = path.join(process.cwd(), 'payflow.db');
    return `file:${dbPath.replace(/\\/g, '/')}`;
  }
  if (!SQLITE_PATH_LOCAL.startsWith('file:')) {
    const resolvedPath = (SQLITE_PATH_LOCAL.startsWith('/') || /^[A-Z]:/i.test(SQLITE_PATH_LOCAL))
      ? SQLITE_PATH_LOCAL
      : path.join(process.cwd(), SQLITE_PATH_LOCAL);
    return `file:${resolvedPath.replace(/\\/g, '/')}`;
  }
  const filePath = SQLITE_PATH_LOCAL.replace(/^file:/, '');
  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return `file:${absPath.replace(/\\/g, '/')}`;
}

const SQLITE_URL = resolveSqliteUrl();
const prisma = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } });

async function main() {
  console.log('[local-seed] Clearing existing records (safe order)');
  // Delete in reverse dependency order where applicable
  await prisma.discount.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleOrderLine.deleteMany();
  await prisma.saleOrder.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.stockTransferLine.deleteMany().catch(() => {});
  await prisma.stockTransfer.deleteMany().catch(() => {});
  await prisma.stockAdjustmentLine.deleteMany().catch(() => {});
  await prisma.stockAdjustment.deleteMany().catch(() => {});
  await prisma.returnOrderLine.deleteMany().catch(() => {});
  await prisma.returnOrder.deleteMany().catch(() => {});
  await prisma.parkedOrder.deleteMany().catch(() => {});
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.taxCategory.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.terminal.deleteMany();
  await prisma.location.deleteMany();
  await prisma.customerAddress?.deleteMany().catch(() => {});
  await prisma.customer.deleteMany();
  await prisma.customerGroup.deleteMany();
  await prisma.user?.deleteMany().catch(() => {});
  await prisma.store?.deleteMany().catch(() => {});
  await prisma.localSettings?.deleteMany().catch(() => {});

  console.log('[local-seed] Creating base records');
  // Optional Store (local copy)
  await prisma.store?.create({
    data: {
      id: 'store_local_001',
      storeCode: 'LOCAL_DEMO',
      storeName: 'Local Demo Store',
      email: 'local@demo.store',
      country: 'US',
      defaultCurrency: 'USD',
      timezone: 'UTC',
      isActive: true,
    },
  }).catch(() => {});

  // Locations
  await prisma.location.createMany({
    data: [
      { id: 'loc_local_001', code: 'LOCAL_STORE', name: 'Local Store', type: 'STORE', address: '1 Main St', city: 'Metropolis', state: 'CA', zipCode: '90001', country: 'US', phone: '+1-555-0001', taxRate: 8.5, isActive: true },
    ],
  });

  // Terminals
  const now = new Date();
  await prisma.terminal.createMany({
    data: [
      { id: 'term_local_001', terminalCode: 'LOCAL_POS_1', terminalName: 'Local POS 1', apiKey: 'local_key_123', ipAddress: '127.0.0.1', status: 'ONLINE', version: 'v1.0.0', isActive: true, registeredAt: now, locationId: 'loc_local_001' },
    ],
  });

  // Categories & Brands
  await prisma.category.createMany({
    data: [
      { id: 'cat_local_001', code: 'ACCESSORIES', name: 'Accessories', description: 'Local accessories' },
    ],
  });
  await prisma.brand.createMany({
    data: [
      { id: 'brand_local_001', code: 'GENERIC', name: 'Generic', description: 'Local brand' },
    ],
  });

  // Tax Categories & Rates
  await prisma.taxCategory.createMany({
    data: [
      { id: 'tax_local_001', code: 'LOCAL_TAX', name: 'Local Tax', description: 'Local tax category', isActive: true },
    ],
  });
  await prisma.taxRate.createMany({
    data: [
      { id: 'tax_rate_local_001', taxCategoryId: 'tax_local_001', name: 'Default Local', rate: 8.5, country: 'US', state: 'CA', isActive: true },
    ],
  });

  // Products & Variants
  await prisma.product.createMany({
    data: [
      { id: 'prod_local_001', code: 'USB_CABLE', name: 'USB-C Cable', description: '1m USB-C to USB-C', categoryId: 'cat_local_001', brandId: 'brand_local_001', taxCategoryId: 'tax_local_001', imageUrl: null, type: 'SIMPLE', isActive: true },
    ],
  });
  await prisma.productVariant.createMany({
    data: [
      { id: 'var_local_001', productId: 'prod_local_001', sku: 'USBC-1M-BLK', name: 'USB-C 1m Black', cost: 3.0, price: 9.99, compareAtPrice: 12.99, color: 'Black', size: '1m', weight: 0.05, weightUnit: 'kg', isActive: true },
    ],
  });

  // Inventory
  await prisma.inventoryItem.createMany({
    data: [
      { id: 'inv_local_001', variantId: 'var_local_001', locationId: 'loc_local_001', quantityOnHand: 50, quantityReserved: 0, quantityAvailable: 50, reorderPoint: 10, reorderQuantity: 20 },
    ],
  });

  // A local user for offline auth testing (password: Aa112233!)
  await prisma.user?.create({
    data: {
      id: 'user_local_001',
      username: 'local.user',
      email: 'local.user@example.com',
      // Use same bcrypt hash from online seed for simplicity
      passwordHash: '$2a$10$XRm6t81HU5o.2cOOtjj0xOCBlAU0crp9YR2G.hVgGl2.91HDfDeJG',
      firstName: 'Local',
      lastName: 'User',
      role: 'CASHIER',
      isActive: true,
    },
  }).catch(() => {});

  // Local settings (including initial sync watermark if desired)
  await prisma.localSettings?.createMany({
    data: [
      { id: 'ls_001', key: 'SYNC_LAST_TS', value: '1970-01-01T00:00:00.000Z', category: 'SYNC', description: 'Last successful pull timestamp' },
    ],
  }).catch(() => {});

  console.log('[local-seed] Done');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


