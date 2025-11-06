/* eslint-disable no-console */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Use generated Prisma client output path
const { PrismaClient } = require('../node_modules/.prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRES_URL_REMOTE || process.env.POSTGRES_URL,
    },
  },
});

const ASSETS_ROOT = path.join(process.cwd(), 'assets', 'images');
const DIRS = {
  products: path.join(ASSETS_ROOT, 'products'),
  categories: path.join(ASSETS_ROOT, 'categories'),
  brands: path.join(ASSETS_ROOT, 'brands'),
};

function ensureDirs() {
  Object.values(DIRS).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
}

function isRemote(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

async function download(url, outDir, filenameBase, preferExt) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const contentType = res.headers['content-type'] || '';
    let ext = preferExt || '.img';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    else if (contentType.includes('webp')) ext = '.webp';
    const safeBase = (filenameBase || 'image').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filePath = path.join(outDir, `${safeBase}${ext}`);
    fs.writeFileSync(filePath, res.data);
    const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    return `/${rel}`;
  } catch (e) {
    console.warn('[images] Failed to download', url, e.message);
    return null;
  }
}

async function processProducts() {
  console.log('[images] Processing Products');
  const products = await prisma.product.findMany({ select: { id: true, code: true, imageUrl: true } });
  let updated = 0;
  for (const p of products) {
    const urls = Array.isArray(p.imageUrl) ? p.imageUrl : [];
    const newPaths = [];
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      if (isRemote(u)) {
        const local = await download(u, DIRS.products, `${p.code}_${i + 1}`);
        newPaths.push(local || u);
      } else {
        newPaths.push(u);
      }
    }
    if (JSON.stringify(newPaths) !== JSON.stringify(urls)) {
      await prisma.product.update({ where: { id: p.id }, data: { imageUrl: newPaths } });
      updated++;
    }
  }
  console.log(`[images] Products updated: ${updated}`);
}

async function processCategories() {
  console.log('[images] Processing Categories');
  const categories = await prisma.category.findMany({ select: { id: true, code: true, imageUrl: true } });
  let updated = 0;
  for (const c of categories) {
    const urls = Array.isArray(c.imageUrl) ? c.imageUrl : [];
    const newPaths = [];
    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      if (isRemote(u)) {
        const local = await download(u, DIRS.categories, `${c.code}_${i + 1}`);
        newPaths.push(local || u);
      } else {
        newPaths.push(u);
      }
    }
    if (JSON.stringify(newPaths) !== JSON.stringify(urls)) {
      await prisma.category.update({ where: { id: c.id }, data: { imageUrl: newPaths } });
      updated++;
    }
  }
  console.log(`[images] Categories updated: ${updated}`);
}

async function processBrands() {
  console.log('[images] Processing Brands');
  const brands = await prisma.brand.findMany({ select: { id: true, code: true, logoUrl: true } });
  let updated = 0;
  for (const b of brands) {
    const url = b.logoUrl;
    if (isRemote(url)) {
      const local = await download(url, DIRS.brands, b.code);
      if (local) {
        await prisma.brand.update({ where: { id: b.id }, data: { logoUrl: local } });
        updated++;
      }
    }
  }
  console.log(`[images] Brands updated: ${updated}`);
}

async function main() {
  ensureDirs();
  await processProducts();
  await processCategories();
  await processBrands();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('[images] Completed');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


