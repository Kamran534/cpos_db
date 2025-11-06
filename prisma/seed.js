/* eslint-disable no-console */
require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');

// Use generated Prisma client matching prisma/schema.prisma generator output
const { PrismaClient } = require('../node_modules/.prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL_REMOTE || process.env.POSTGRES_URL,
    },
  },
});

// Note: Image downloading removed from seed. Use scripts/download-images.js if needed.

async function main() {
  // No local asset preparation here; images remain as remote URLs.

  console.log('[seed] Clearing existing demo records (if any)');
  // Order of deletions respects FKs
  await prisma.discount.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleOrderLine.deleteMany();
  await prisma.saleOrder.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.taxCategory.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.terminal.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.customerGroup.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.store.deleteMany();

  console.log('[seed] Creating Store and Branches');
  await prisma.store.create({
    data: {
      id: 'store_001',
      storeCode: 'ELECTROHUB',
      storeName: 'ElectroHub Electronics',
      legalName: 'ElectroHub Retail Solutions Inc.',
      email: 'info@electrohub.com',
      phone: '+1-555-0123',
      addressLine1: '123 Tech Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US',
      defaultCurrency: 'USD',
      isActive: true,
    },
  });

  await prisma.branch.createMany({
    data: [
      {
        id: 'branch_001', storeId: 'store_001', branchCode: 'SF_MAIN', branchName: 'San Francisco Main Store',
        email: 'sf@electrohub.com', phone: '+1-555-0124',
        // address fields
        // Using simplified fields per schema: addressLine* exist only on Store; Branch keeps contact/meta
        timezone: 'America/Los_Angeles', currency: 'USD', taxRate: 8.5, isActive: true,
      },
      {
        id: 'branch_002', storeId: 'store_001', branchCode: 'SF_WAREHOUSE', branchName: 'SF Warehouse & Online',
        email: 'warehouse@electrohub.com', phone: '+1-555-0125',
        timezone: 'America/Los_Angeles', currency: 'USD', taxRate: 8.5, isActive: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Users');
  const defaultHash = await bcrypt.hash('Aa112233!', 10);
  await prisma.user.createMany({
    data: [
      { id: 'user_001', storeId: 'store_001', username: 'john.doe', email: 'john.doe@electrohub.com', passwordHash: defaultHash, firstName: 'John', lastName: 'Doe', phone: '+1-555-1001', role: 'STORE_MANAGER', permissions: [], isActive: true },
      { id: 'user_002', storeId: 'store_001', username: 'sarah.smith', email: 'sarah.smith@electrohub.com', passwordHash: defaultHash, firstName: 'Sarah', lastName: 'Smith', phone: '+1-555-1002', role: 'ASSISTANT_MANAGER', permissions: [], isActive: true },
      { id: 'user_003', storeId: 'store_001', username: 'mike.johnson', email: 'mike.johnson@electrohub.com', passwordHash: defaultHash, firstName: 'Mike', lastName: 'Johnson', phone: '+1-555-1003', role: 'CASHIER', permissions: [], isActive: true },
      { id: 'user_004', storeId: 'store_001', username: 'emily.wang', email: 'emily.wang@electrohub.com', passwordHash: defaultHash, firstName: 'Emily', lastName: 'Wang', phone: '+1-555-1004', role: 'CASHIER', permissions: [], isActive: true },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Locations');
  await prisma.location.createMany({
    data: [
      { id: 'loc_001', branchId: 'branch_001', code: 'SF_STORE', name: 'San Francisco Retail Store', type: 'STORE', address: '123 Tech Avenue', city: 'San Francisco', state: 'CA', zipCode: '94105', country: 'US', phone: '+1-555-0124', taxRate: 8.5, isActive: true },
      { id: 'loc_002', branchId: 'branch_002', code: 'SF_WH', name: 'San Francisco Warehouse', type: 'WAREHOUSE', address: '456 Industrial Way', city: 'San Francisco', state: 'CA', zipCode: '94107', country: 'US', phone: '+1-555-0125', taxRate: 8.5, isActive: true },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Terminals');
  const now = new Date();
  await prisma.terminal.createMany({
    data: [
      { id: 'term_001', branchId: 'branch_001', locationId: 'loc_001', terminalCode: 'POS_001', terminalName: 'Main Checkout Counter 1', apiKey: 'term_key_abc123', ipAddress: '192.168.1.101', macAddress: '00:1B:44:11:3A:B7', status: 'ONLINE', version: 'v2.1.4', isActive: true, registeredAt: now },
      { id: 'term_002', branchId: 'branch_001', locationId: 'loc_001', terminalCode: 'POS_002', terminalName: 'Mobile Checkout Tablet', apiKey: 'term_key_def456', ipAddress: '192.168.1.102', macAddress: '00:1B:44:11:3A:B8', status: 'ONLINE', version: 'v2.1.4', isActive: true, registeredAt: now },
      { id: 'term_003', branchId: 'branch_002', locationId: 'loc_002', terminalCode: 'WH_TERM_01', terminalName: 'Warehouse Terminal 1', apiKey: 'term_key_ghi789', ipAddress: '192.168.1.201', macAddress: '00:1B:44:11:3A:B9', status: 'ONLINE', version: 'v2.1.4', isActive: true, registeredAt: now },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Categories');
  const categoryImages = {
    cat_001: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    cat_002: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    cat_003: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    cat_004: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
    cat_005: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop',
  };
  const categories = [
    { id: 'cat_001', code: 'SMARTPHONES', name: 'Smartphones', description: 'Latest smartphones and mobile devices' },
    { id: 'cat_002', code: 'LAPTOPS', name: 'Laptops & Computers', description: 'Laptops, desktops and computer accessories' },
    { id: 'cat_003', code: 'AUDIO', name: 'Audio Equipment', description: 'Headphones, speakers and audio accessories' },
    { id: 'cat_004', code: 'CAMERAS', name: 'Cameras & Photography', description: 'Digital cameras and photography equipment' },
    { id: 'cat_005', code: 'GAMING', name: 'Gaming & VR', description: 'Gaming consoles and virtual reality' },
  ];
  for (const c of categories) {
    await prisma.category.create({
      data: {
        id: c.id,
        storeId: 'store_001',
        code: c.code,
        name: c.name,
        description: c.description,
        imageUrl: categoryImages[c.id] || null,
        isActive: true,
      },
    });
  }

  console.log('[seed] Creating Brands');
  const brandLogos = {
    brand_001: 'https://logos-world.net/wp-content/uploads/2020/04/Apple-Logo.png',
    brand_002: 'https://logos-world.net/wp-content/uploads/2020/04/Samsung-Logo.png',
    brand_003: 'https://logos-world.net/wp-content/uploads/2020/04/Sony-Logo.png',
    brand_004: 'https://logos-world.net/wp-content/uploads/2020/07/Dell-Logo.png',
    brand_005: 'https://logos-world.net/wp-content/uploads/2020/07/Bose-Logo.png',
  };
  const brands = [
    { id: 'brand_001', code: 'APPLE', name: 'Apple', description: 'Apple Inc. products' },
    { id: 'brand_002', code: 'SAMSUNG', name: 'Samsung', description: 'Samsung Electronics' },
    { id: 'brand_003', code: 'SONY', name: 'Sony', description: 'Sony electronics and entertainment' },
    { id: 'brand_004', code: 'DELL', name: 'Dell', description: 'Dell computers and accessories' },
    { id: 'brand_005', code: 'BOSE', name: 'Bose', description: 'Bose audio equipment' },
  ];
  for (const b of brands) {
    await prisma.brand.create({
      data: {
        id: b.id, storeId: 'store_001', code: b.code, name: b.name, description: b.description,
        logoUrl: brandLogos[b.id], isActive: true,
      },
    });
  }

  console.log('[seed] Creating Tax Categories & Rates');
  await prisma.taxCategory.createMany({
    data: [
      { id: 'tax_001', storeId: 'store_001', code: 'STANDARD', name: 'Standard Tax', description: 'Standard sales tax rate', isActive: true },
      { id: 'tax_002', storeId: 'store_001', code: 'ELECTRONICS', name: 'Electronics', description: 'Electronics products tax', isActive: true },
    ],
    skipDuplicates: true,
  });
  await prisma.taxRate.createMany({
    data: [
      { id: 'tax_rate_001', taxCategoryId: 'tax_001', name: 'CA State Tax', rate: 8.5, country: 'US', state: 'CA', isActive: true },
      { id: 'tax_rate_002', taxCategoryId: 'tax_002', name: 'CA Electronics', rate: 8.5, country: 'US', state: 'CA', isActive: true },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Products');
  const productImages = {
    prod_001: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
    prod_002: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop',
    prod_003: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop',
    prod_004: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop',
    prod_005: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=400&fit=crop',
    prod_006: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
    prod_007: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    prod_008: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=400&fit=crop',
    prod_009: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop',
    prod_010: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop',
  };
  const products = [
    { id: 'prod_001', code: 'IPHONE14_PRO', name: 'iPhone 14 Pro', description: 'Latest Apple iPhone with advanced camera system', categoryId: 'cat_001', brandId: 'brand_001', taxCategoryId: 'tax_002', type: 'SIMPLE' },
    { id: 'prod_002', code: 'IPHONE14', name: 'iPhone 14', description: 'Powerful and affordable iPhone', categoryId: 'cat_001', brandId: 'brand_001', taxCategoryId: 'tax_002', type: 'SIMPLE' },
    { id: 'prod_003', code: 'GALAXY_S23', name: 'Samsung Galaxy S23', description: 'Premium Android smartphone', categoryId: 'cat_001', brandId: 'brand_002', taxCategoryId: 'tax_002', type: 'VARIABLE' },
    { id: 'prod_004', code: 'MACBOOK_PRO', name: 'MacBook Pro 16"', description: 'Professional laptop with M2 Pro chip', categoryId: 'cat_002', brandId: 'brand_001', taxCategoryId: 'tax_002', type: 'VARIABLE' },
    { id: 'prod_005', code: 'DELL_XPS', name: 'Dell XPS 13', description: 'Ultra-thin premium laptop', categoryId: 'cat_002', brandId: 'brand_004', taxCategoryId: 'tax_002', type: 'VARIABLE' },
    { id: 'prod_006', code: 'SONY_WH1000', name: 'Sony WH-1000XM5', description: 'Noise cancelling wireless headphones', categoryId: 'cat_003', brandId: 'brand_003', taxCategoryId: 'tax_002', type: 'SIMPLE' },
    { id: 'prod_007', code: 'BOSE_QC45', name: 'Bose QuietComfort 45', description: 'Wireless noise cancelling headphones', categoryId: 'cat_003', brandId: 'brand_005', taxCategoryId: 'tax_002', type: 'SIMPLE' },
    { id: 'prod_008', code: 'SONY_A7IV', name: 'Sony A7 IV Camera', description: 'Full-frame mirrorless camera', categoryId: 'cat_004', brandId: 'brand_003', taxCategoryId: 'tax_002', type: 'SIMPLE' },
    { id: 'prod_009', code: 'PLAYSTATION_5', name: 'Sony PlayStation 5', description: 'Next-gen gaming console', categoryId: 'cat_005', brandId: 'brand_003', taxCategoryId: 'tax_002', type: 'SIMPLE' },
    { id: 'prod_010', code: 'AIRPODS_PRO', name: 'AirPods Pro (2nd Gen)', description: 'Wireless earbuds with Active Noise Cancellation', categoryId: 'cat_003', brandId: 'brand_001', taxCategoryId: 'tax_002', type: 'SIMPLE' },
  ];
  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id, storeId: 'store_001', code: p.code, name: p.name, description: p.description,
        categoryId: p.categoryId, brandId: p.brandId, taxCategoryId: p.taxCategoryId,
        imageUrl: productImages[p.id] || null,
        type: p.type, isActive: true,
      },
    });
  }

  console.log('[seed] Creating Product Variants');
  await prisma.productVariant.createMany({
    data: [
      { id: 'var_001', productId: 'prod_001', sku: 'IP14P-128-SB', name: 'iPhone 14 Pro 128GB Space Black', cost: 850.00, price: 1099.00, compareAtPrice: 1199.00, color: 'Space Black', size: '128GB', barcode: '194253774321', weight: 0.206, weightUnit: 'kg', isActive: true },
      { id: 'var_002', productId: 'prod_001', sku: 'IP14P-256-SB', name: 'iPhone 14 Pro 256GB Space Black', cost: 950.00, price: 1199.00, compareAtPrice: 1299.00, color: 'Space Black', size: '256GB', barcode: '194253774338', weight: 0.206, weightUnit: 'kg', isActive: true },
      { id: 'var_003', productId: 'prod_001', sku: 'IP14P-512-SB', name: 'iPhone 14 Pro 512GB Space Black', cost: 1150.00, price: 1399.00, compareAtPrice: 1499.00, color: 'Space Black', size: '512GB', barcode: '194253774345', weight: 0.206, weightUnit: 'kg', isActive: true },
      { id: 'var_004', productId: 'prod_002', sku: 'IP14-128-BLUE', name: 'iPhone 14 128GB Blue', cost: 650.00, price: 799.00, compareAtPrice: 899.00, color: 'Blue', size: '128GB', barcode: '194253774901', weight: 0.172, weightUnit: 'kg', isActive: true },
      { id: 'var_005', productId: 'prod_002', sku: 'IP14-256-BLUE', name: 'iPhone 14 256GB Blue', cost: 750.00, price: 899.00, compareAtPrice: 999.00, color: 'Blue', size: '256GB', barcode: '194253774918', weight: 0.172, weightUnit: 'kg', isActive: true },
      { id: 'var_006', productId: 'prod_003', sku: 'SGS23-128-CRM', name: 'Galaxy S23 128GB Cream', cost: 600.00, price: 799.99, compareAtPrice: 849.99, color: 'Cream', size: '128GB', barcode: '887276929123', weight: 0.168, weightUnit: 'kg', isActive: true },
      { id: 'var_007', productId: 'prod_003', sku: 'SGS23-256-CRM', name: 'Galaxy S23 256GB Cream', cost: 700.00, price: 859.99, compareAtPrice: 919.99, color: 'Cream', size: '256GB', barcode: '887276929130', weight: 0.168, weightUnit: 'kg', isActive: true },
      { id: 'var_008', productId: 'prod_003', sku: 'SGS23-512-CRM', name: 'Galaxy S23 512GB Cream', cost: 850.00, price: 999.99, compareAtPrice: 1079.99, color: 'Cream', size: '512GB', barcode: '887276929147', weight: 0.168, weightUnit: 'kg', isActive: true },
      { id: 'var_009', productId: 'prod_004', sku: 'MBP16-M2-512-SG', name: 'MacBook Pro 16" M2 Pro 512GB Silver', cost: 1800.00, price: 2499.00, compareAtPrice: 2699.00, color: 'Silver', size: '512GB/16GB', barcode: '194253075320', weight: 2.15, weightUnit: 'kg', isActive: true },
      { id: 'var_010', productId: 'prod_004', sku: 'MBP16-M2-1TB-SG', name: 'MacBook Pro 16" M2 Pro 1TB Silver', cost: 2100.00, price: 2699.00, compareAtPrice: 2899.00, color: 'Silver', size: '1TB/16GB', barcode: '194253075337', weight: 2.15, weightUnit: 'kg', isActive: true },
      { id: 'var_011', productId: 'prod_005', sku: 'DXP13-512-PLM', name: 'Dell XPS 13 512GB Platinum', cost: 800.00, price: 1099.99, compareAtPrice: 1199.99, color: 'Platinum Silver', size: '512GB/16GB', barcode: '884116367854', weight: 1.27, weightUnit: 'kg', isActive: true },
      { id: 'var_012', productId: 'prod_005', sku: 'DXP13-1TB-PLM', name: 'Dell XPS 13 1TB Platinum', cost: 950.00, price: 1299.99, compareAtPrice: 1399.99, color: 'Platinum Silver', size: '1TB/16GB', barcode: '884116367861', weight: 1.27, weightUnit: 'kg', isActive: true },
      { id: 'var_013', productId: 'prod_006', sku: 'SONY-WH1000XM5', name: 'Sony WH-1000XM5 Headphones', cost: 250.00, price: 399.99, compareAtPrice: 449.99, color: 'Black', size: 'Standard', barcode: '027242924331', weight: 0.25, weightUnit: 'kg', isActive: true },
      { id: 'var_014', productId: 'prod_007', sku: 'BOSE-QC45-BLACK', name: 'Bose QuietComfort 45 Black', cost: 200.00, price: 329.00, compareAtPrice: 379.00, color: 'Black', size: 'Standard', barcode: '017334075621', weight: 0.24, weightUnit: 'kg', isActive: true },
      { id: 'var_015', productId: 'prod_008', sku: 'SONY-A7IV-BODY', name: 'Sony A7 IV Body Only', cost: 1800.00, price: 2499.00, compareAtPrice: 2699.00, color: 'Black', size: 'Body Only', barcode: '0027242927182', weight: 0.658, weightUnit: 'kg', isActive: true },
      { id: 'var_016', productId: 'prod_009', sku: 'PS5-DISC', name: 'PlayStation 5 Disc Edition', cost: 400.00, price: 499.99, compareAtPrice: 599.99, color: 'White', size: 'Standard', barcode: '711719511010', weight: 4.5, weightUnit: 'kg', isActive: true },
      { id: 'var_017', productId: 'prod_010', sku: 'AIRPODS-PRO2', name: 'AirPods Pro 2nd Generation', cost: 150.00, price: 249.00, compareAtPrice: 299.00, color: 'White', size: 'Standard', barcode: '194253074120', weight: 0.05, weightUnit: 'kg', isActive: true },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Customer Groups, Customers, Addresses');
  await prisma.customerGroup.createMany({
    data: [
      { id: 'group_001', storeId: 'store_001', code: 'VIP', name: 'VIP Customers', description: 'Premium customers with exclusive benefits', discountPercent: 10.0, isActive: true },
      { id: 'group_002', storeId: 'store_001', code: 'STUDENT', name: 'Student Discount', description: 'Students with valid ID', discountPercent: 5.0, isActive: true },
      { id: 'group_003', storeId: 'store_001', code: 'EMPLOYEE', name: 'Employee Discount', description: 'Store employees', discountPercent: 15.0, isActive: true },
    ],
    skipDuplicates: true,
  });
  await prisma.customer.createMany({
    data: [
      { id: 'cust_001', storeId: 'store_001', code: 'CUST1001', firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@email.com', phone: '+1-555-2001', dateOfBirth: new Date('1985-03-15'), type: 'VIP', groupId: 'group_001', loyaltyPoints: 1500, totalSpent: 4500.00, totalOrders: 12, creditLimit: 5000.00, currentBalance: 0.00, allowMarketing: true, isActive: true },
      { id: 'cust_002', storeId: 'store_001', code: 'CUST1002', firstName: 'Jennifer', lastName: 'Rodriguez', email: 'jennifer.rod@email.com', phone: '+1-555-2002', dateOfBirth: new Date('1992-07-22'), type: 'REGULAR', groupId: null, loyaltyPoints: 350, totalSpent: 1200.00, totalOrders: 4, creditLimit: 2000.00, currentBalance: 0.00, allowMarketing: true, isActive: true },
      { id: 'cust_003', storeId: 'store_001', code: 'CUST1003', firstName: 'David', lastName: 'Kim', email: 'david.kim@email.com', phone: '+1-555-2003', dateOfBirth: new Date('1988-11-08'), type: 'REGULAR', groupId: 'group_002', loyaltyPoints: 120, totalSpent: 800.00, totalOrders: 3, creditLimit: 1000.00, currentBalance: 0.00, allowMarketing: false, isActive: true },
      { id: 'cust_004', storeId: 'store_001', code: 'CUST1004', firstName: 'Sarah', lastName: 'Thompson', email: 'sarah.thompson@email.com', phone: '+1-555-2004', dateOfBirth: new Date('1979-05-30'), type: 'VIP', groupId: 'group_001', loyaltyPoints: 2100, totalSpent: 6300.00, totalOrders: 18, creditLimit: 7500.00, currentBalance: 0.00, allowMarketing: true, isActive: true },
      { id: 'cust_005', storeId: 'store_001', code: 'CUST1005', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@email.com', phone: '+1-555-2005', dateOfBirth: new Date('1995-12-14'), type: 'REGULAR', groupId: null, loyaltyPoints: 80, totalSpent: 400.00, totalOrders: 2, creditLimit: 1500.00, currentBalance: 0.00, allowMarketing: true, isActive: true },
      { id: 'cust_006', storeId: 'store_001', code: 'CUST1006', firstName: 'Lisa', lastName: 'Garcia', email: 'lisa.garcia@email.com', phone: '+1-555-2006', dateOfBirth: new Date('1983-09-05'), type: 'EMPLOYEE', groupId: 'group_003', loyaltyPoints: 600, totalSpent: 2000.00, totalOrders: 8, creditLimit: 3000.00, currentBalance: 0.00, allowMarketing: true, isActive: true },
    ],
    skipDuplicates: true,
  });
  await prisma.customerAddress.createMany({
    data: [
      { id: 'addr_001', customerId: 'cust_001', type: 'BILLING', addressLine1: '123 Market Street', addressLine2: 'Apt 4B', city: 'San Francisco', state: 'CA', zipCode: '94103', country: 'US', isDefault: true },
      { id: 'addr_002', customerId: 'cust_001', type: 'SHIPPING', addressLine1: '123 Market Street', addressLine2: 'Apt 4B', city: 'San Francisco', state: 'CA', zipCode: '94103', country: 'US', isDefault: true },
      { id: 'addr_003', customerId: 'cust_002', type: 'BOTH', addressLine1: '456 Oak Avenue', addressLine2: null, city: 'San Francisco', state: 'CA', zipCode: '94109', country: 'US', isDefault: true },
      { id: 'addr_004', customerId: 'cust_003', type: 'BOTH', addressLine1: '789 Pine Street', addressLine2: 'Unit 12', city: 'San Francisco', state: 'CA', zipCode: '94102', country: 'US', isDefault: true },
      { id: 'addr_005', customerId: 'cust_004', type: 'BILLING', addressLine1: '321 Castro Street', addressLine2: 'Penthouse', city: 'San Francisco', state: 'CA', zipCode: '94114', country: 'US', isDefault: true },
    ],
    skipDuplicates: true,
  });

  console.log('[seed] Creating Inventory Items');
  await prisma.inventoryItem.createMany({
    data: [
      { id: 'inv_001', variantId: 'var_001', locationId: 'loc_001', quantityOnHand: 15, quantityReserved: 2, quantityAvailable: 13, reorderPoint: 5, reorderQuantity: 10 },
      { id: 'inv_002', variantId: 'var_002', locationId: 'loc_001', quantityOnHand: 12, quantityReserved: 1, quantityAvailable: 11, reorderPoint: 5, reorderQuantity: 10 },
      { id: 'inv_003', variantId: 'var_003', locationId: 'loc_001', quantityOnHand: 8, quantityReserved: 0, quantityAvailable: 8, reorderPoint: 3, reorderQuantity: 5 },
      { id: 'inv_004', variantId: 'var_004', locationId: 'loc_001', quantityOnHand: 20, quantityReserved: 3, quantityAvailable: 17, reorderPoint: 8, reorderQuantity: 15 },
      { id: 'inv_005', variantId: 'var_005', locationId: 'loc_001', quantityOnHand: 18, quantityReserved: 2, quantityAvailable: 16, reorderPoint: 8, reorderQuantity: 15 },
      { id: 'inv_006', variantId: 'var_006', locationId: 'loc_001', quantityOnHand: 14, quantityReserved: 1, quantityAvailable: 13, reorderPoint: 6, reorderQuantity: 12 },
      { id: 'inv_007', variantId: 'var_007', locationId: 'loc_001', quantityOnHand: 10, quantityReserved: 0, quantityAvailable: 10, reorderPoint: 4, reorderQuantity: 8 },
      { id: 'inv_008', variantId: 'var_008', locationId: 'loc_001', quantityOnHand: 6, quantityReserved: 0, quantityAvailable: 6, reorderPoint: 2, reorderQuantity: 4 },
      { id: 'inv_009', variantId: 'var_009', locationId: 'loc_001', quantityOnHand: 5, quantityReserved: 1, quantityAvailable: 4, reorderPoint: 2, reorderQuantity: 3 },
      { id: 'inv_010', variantId: 'var_010', locationId: 'loc_001', quantityOnHand: 4, quantityReserved: 0, quantityAvailable: 4, reorderPoint: 2, reorderQuantity: 3 },
      { id: 'inv_011', variantId: 'var_013', locationId: 'loc_001', quantityOnHand: 25, quantityReserved: 4, quantityAvailable: 21, reorderPoint: 10, reorderQuantity: 20 },
      { id: 'inv_012', variantId: 'var_014', locationId: 'loc_001', quantityOnHand: 22, quantityReserved: 2, quantityAvailable: 20, reorderPoint: 8, reorderQuantity: 15 },
      { id: 'inv_013', variantId: 'var_016', locationId: 'loc_001', quantityOnHand: 8, quantityReserved: 1, quantityAvailable: 7, reorderPoint: 3, reorderQuantity: 6 },
      { id: 'inv_014', variantId: 'var_017', locationId: 'loc_001', quantityOnHand: 30, quantityReserved: 5, quantityAvailable: 25, reorderPoint: 12, reorderQuantity: 25 },

      { id: 'inv_015', variantId: 'var_001', locationId: 'loc_002', quantityOnHand: 50, quantityReserved: 0, quantityAvailable: 50, reorderPoint: 20, reorderQuantity: 30 },
      { id: 'inv_016', variantId: 'var_002', locationId: 'loc_002', quantityOnHand: 40, quantityReserved: 0, quantityAvailable: 40, reorderPoint: 15, reorderQuantity: 25 },
      { id: 'inv_017', variantId: 'var_009', locationId: 'loc_002', quantityOnHand: 12, quantityReserved: 0, quantityAvailable: 12, reorderPoint: 5, reorderQuantity: 8 },
      { id: 'inv_018', variantId: 'var_015', locationId: 'loc_002', quantityOnHand: 8, quantityReserved: 0, quantityAvailable: 8, reorderPoint: 3, reorderQuantity: 5 },
    ],
  });

  console.log('[seed] Creating Shifts');
  await prisma.shift.createMany({
    data: [
      { id: 'shift_001', shiftNumber: 'SHIFT2024001', locationId: 'loc_001', terminalId: 'term_001', userId: 'user_003', registerId: 'REG001', openingCash: 200.00, closingCash: 1850.75, totalSales: 4520.50, totalTransactions: 8, openedAt: new Date('2024-01-15T08:00:00Z'), closedAt: new Date('2024-01-15T16:00:00Z'), status: 'CLOSED' },
      { id: 'shift_002', shiftNumber: 'SHIFT2024002', locationId: 'loc_001', terminalId: 'term_002', userId: 'user_004', registerId: 'REG002', openingCash: 200.00, closingCash: 1320.25, totalSales: 2875.75, totalTransactions: 5, openedAt: new Date('2024-01-15T09:00:00Z'), closedAt: new Date('2024-01-15T17:00:00Z'), status: 'CLOSED' },
    ],
  });

  console.log('[seed] Creating Sale Orders & Lines & Payments & Discounts');
  await prisma.saleOrder.createMany({
    data: [
      { id: 'order_001', locationId: 'loc_001', terminalId: 'term_001', orderNumber: 'ORD001001', type: 'SALE', status: 'COMPLETED', source: 'POS', customerId: 'cust_001', shiftId: 'shift_001', userId: 'user_003', subtotal: 1399.00, taxAmount: 118.92, discountAmount: 139.90, total: 1378.02, completedAt: new Date('2024-01-15T09:30:00Z'), receiptPrinted: true, createdAt: new Date('2024-01-15T09:28:00Z') },
      { id: 'order_002', locationId: 'loc_001', terminalId: 'term_001', orderNumber: 'ORD001002', type: 'SALE', status: 'COMPLETED', source: 'POS', customerId: 'cust_002', shiftId: 'shift_001', userId: 'user_003', subtotal: 799.99, taxAmount: 68.00, discountAmount: 0.00, total: 867.99, completedAt: new Date('2024-01-15T10:15:00Z'), receiptPrinted: true, createdAt: new Date('2024-01-15T10:12:00Z') },
      { id: 'order_003', locationId: 'loc_001', terminalId: 'term_001', orderNumber: 'ORD001003', type: 'SALE', status: 'COMPLETED', source: 'POS', customerId: null, shiftId: 'shift_001', userId: 'user_003', subtotal: 249.00, taxAmount: 21.17, discountAmount: 0.00, total: 270.17, completedAt: new Date('2024-01-15T11:45:00Z'), receiptPrinted: true, createdAt: new Date('2024-01-15T11:42:00Z') },
      { id: 'order_004', locationId: 'loc_001', terminalId: 'term_002', orderNumber: 'ORD002001', type: 'SALE', status: 'COMPLETED', source: 'POS', customerId: 'cust_004', shiftId: 'shift_002', userId: 'user_004', subtotal: 2699.00, taxAmount: 229.42, discountAmount: 404.85, total: 2523.57, completedAt: new Date('2024-01-15T10:30:00Z'), receiptPrinted: true, createdAt: new Date('2024-01-15T10:25:00Z') },
      { id: 'order_005', locationId: 'loc_001', terminalId: 'term_002', orderNumber: 'ORD002002', type: 'SALE', status: 'COMPLETED', source: 'POS', customerId: 'cust_003', shiftId: 'shift_002', userId: 'user_004', subtotal: 399.99, taxAmount: 34.00, discountAmount: 20.00, total: 413.99, completedAt: new Date('2024-01-15T14:20:00Z'), receiptPrinted: true, createdAt: new Date('2024-01-15T14:15:00Z') },
    ],
  });
  await prisma.saleOrderLine.createMany({
    data: [
      { id: 'line_001', orderId: 'order_001', variantId: 'var_002', quantity: 1, unitPrice: 1199.00, discountAmount: 119.90, taxAmount: 91.72, lineTotal: 1170.82 },
      { id: 'line_002', orderId: 'order_001', variantId: 'var_017', quantity: 1, unitPrice: 249.00, discountAmount: 20.00, taxAmount: 19.47, lineTotal: 248.47 },
      { id: 'line_003', orderId: 'order_002', variantId: 'var_006', quantity: 1, unitPrice: 799.99, discountAmount: 0.00, taxAmount: 68.00, lineTotal: 867.99 },
      { id: 'line_004', orderId: 'order_003', variantId: 'var_017', quantity: 1, unitPrice: 249.00, discountAmount: 0.00, taxAmount: 21.17, lineTotal: 270.17 },
      { id: 'line_005', orderId: 'order_004', variantId: 'var_010', quantity: 1, unitPrice: 2699.00, discountAmount: 404.85, taxAmount: 195.02, lineTotal: 2489.17 },
      { id: 'line_006', orderId: 'order_005', variantId: 'var_013', quantity: 1, unitPrice: 399.99, discountAmount: 20.00, taxAmount: 32.30, lineTotal: 412.29 },
    ],
  });
  await prisma.payment.createMany({
    data: [
      { id: 'pay_001', orderId: 'order_001', method: 'CARD', amount: 1378.02, cardLast4: '4242', cardBrand: 'VISA', reference: 'txn_ch_1ABC123def456', status: 'COMPLETED', processedAt: new Date('2024-01-15T09:30:00Z') },
      { id: 'pay_002', orderId: 'order_002', method: 'CARD', amount: 867.99, cardLast4: '1881', cardBrand: 'MASTERCARD', reference: 'txn_ch_1DEF456ghi789', status: 'COMPLETED', processedAt: new Date('2024-01-15T10:15:00Z') },
      { id: 'pay_003', orderId: 'order_003', method: 'CASH', amount: 270.17, cardLast4: null, cardBrand: null, reference: 'CASH_RCPT_001', status: 'COMPLETED', processedAt: new Date('2024-01-15T11:45:00Z') },
      { id: 'pay_004', orderId: 'order_004', method: 'CARD', amount: 2523.57, cardLast4: '8888', cardBrand: 'AMEX', reference: 'txn_ch_1GHI789jkl012', status: 'COMPLETED', processedAt: new Date('2024-01-15T10:30:00Z') },
      { id: 'pay_005', orderId: 'order_005', method: 'CARD', amount: 413.99, cardLast4: '1234', cardBrand: 'VISA', reference: 'txn_ch_1JKL012mno345', status: 'COMPLETED', processedAt: new Date('2024-01-15T14:20:00Z') },
    ],
  });
  await prisma.discount.createMany({
    data: [
      { id: 'disc_001', orderId: 'order_001', type: 'PERCENTAGE', name: 'VIP Discount', code: 'VIP10', amount: 139.90 },
      { id: 'disc_002', orderId: 'order_004', type: 'PERCENTAGE', name: 'VIP Discount', code: 'VIP10', amount: 404.85 },
      { id: 'disc_003', orderId: 'order_005', type: 'FIXED_AMOUNT', name: 'Student Discount', code: 'STUDENT5', amount: 20.00 },
    ],
  });

  console.log('[seed] Done');
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


