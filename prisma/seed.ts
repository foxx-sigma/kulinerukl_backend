import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kuliner.com' },
    update: {},
    create: { name: 'Admin Kuliner', email: 'admin@kuliner.com', password: adminPassword, role: 'ADMIN' },
  });

  // User biasa
  const userPassword = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { email: 'user@kuliner.com' },
    update: {},
    create: { name: 'User Test', email: 'user@kuliner.com', password: userPassword, role: 'USER' },
  });

  // Kategori
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'mie-bakso' }, update: {}, create: { name: 'Mie & Bakso', slug: 'mie-bakso' } }),
    prisma.category.upsert({ where: { slug: 'nasi' }, update: {}, create: { name: 'Nasi', slug: 'nasi' } }),
    prisma.category.upsert({ where: { slug: 'minuman' }, update: {}, create: { name: 'Minuman', slug: 'minuman' } }),
  ]);

  // Kuliner
  const place = await prisma.culinaryPlace.create({
    data: {
      name: 'Bakso Pak Kumis',
      description: 'Bakso legendaris sejak 1990 dengan kuah gurih khas Malang',
      address: 'Jl. Soekarno Hatta No. 5, Malang',
      categoryId: categories[0].id,
      priceMin: 10000,
      priceMax: 25000,
      rating: 4.5,
    },
  });

  // Menu
  await prisma.menu.createMany({
    data: [
      { name: 'Bakso Campur', price: 15000, stock: 50, culinaryPlaceId: place.id },
      { name: 'Bakso Urat', price: 18000, stock: 30, culinaryPlaceId: place.id },
      { name: 'Bakso Halus', price: 15000, stock: 40, culinaryPlaceId: place.id },
      { name: 'Es Teh Manis', price: 5000, stock: 100, culinaryPlaceId: place.id },
    ],
  });

  console.log('✅ Seed data berhasil dimasukkan');
  console.log('📧 Admin: admin@kuliner.com | 🔑 Password: admin123');
  console.log('📧 User:  user@kuliner.com  | 🔑 Password: user123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
