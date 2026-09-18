import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding RWAY Promotion database...');

  // 1. Create Default Admin
  const adminEmail = 'admin@rway.com';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'RWAY Admin',
        role: 'SUPERADMIN',
      },
    });
    console.log('Admin user created: admin@rway.com / admin123');
  }

  // 2. Set Default Google Form Setting
  await prisma.appSetting.upsert({
    where: { key: 'google_form_url' },
    update: {},
    create: {
      key: 'google_form_url',
      value: 'https://forms.google.com/example-rway-review-form',
    },
  });

  // 3. Seed Sample Brand: Tagas
  const tagas = await prisma.brand.upsert({
    where: { slug: 'tagas' },
    update: {},
    create: {
      name: 'Tagas',
      slug: 'tagas',
      description: 'Tagas Kids Wear & Apparel Deals',
    },
  });

  // 4. Seed Sample Brand: Celary
  const celary = await prisma.brand.upsert({
    where: { slug: 'celary' },
    update: {},
    create: {
      name: 'Celary',
      slug: 'celary',
      description: 'Celary Fashion & Women Co-ord Sets',
    },
  });

  // 5. Seed Deal 1: Tagas kids night suit
  const deal1 = await prisma.deal.create({
    data: {
      brandId: tagas.id,
      title: 'Tagas kids night suit',
      dealCode: 'Deal 50',
      dealDate: new Date('2026-09-16T10:00:00.000Z'),
      expectedOrders: 5,
      totalAmount: 1432,
    },
  });

  // Orders for Deal 1
  const deal1Orders = [
    { orderId: '402-3773401-7723540', customerName: 'Nitesh', amount: 363, status: 'PENDING_REVIEW' },
    { orderId: '408-7068348-7712307', customerName: 'MANGI lal', amount: 289, status: 'REVIEW_SUBMITTED', reviewRating: 5, reviewSubmittedAt: new Date('2026-09-17T14:30:00.000Z') },
    { orderId: '403-5365709-9153157', customerName: 'Vicky sharma', amount: 363, status: 'PENDING_REVIEW' },
    { orderId: '403-3265425-2321961', customerName: 'Vicky sharma', amount: 363, status: 'PENDING_REVIEW' },
    { orderId: '402-4112007-8633966', customerName: 'Gunjan', amount: 304, status: 'REVIEW_SUBMITTED', reviewRating: 5, reviewSubmittedAt: new Date('2026-09-18T11:00:00.000Z') },
  ];

  for (const ord of deal1Orders) {
    await prisma.order.upsert({
      where: { orderId: ord.orderId },
      update: {},
      create: {
        orderId: ord.orderId,
        brandId: tagas.id,
        dealId: deal1.id,
        customerName: ord.customerName,
        amount: ord.amount,
        status: ord.status,
        orderDate: new Date('2026-09-16T10:00:00.000Z'),
        reviewRating: ord.reviewRating || null,
        reviewSubmittedAt: ord.reviewSubmittedAt || null,
      },
    });
  }

  // 6. Seed Deal 2: Celary women co ord set
  const deal2 = await prisma.deal.create({
    data: {
      brandId: celary.id,
      title: 'Celary women co ord set',
      dealCode: 'Deal 80',
      dealDate: new Date('2026-09-16T12:00:00.000Z'),
      expectedOrders: 7,
      totalAmount: 4795,
    },
  });

  const deal2Orders = [
    { orderId: '405-3826494-3818769', customerName: 'Robin sair', amount: 793, status: 'PENDING_REVIEW' },
    { orderId: '408-6053637-9765139', customerName: 'Vinod', amount: 793, status: 'PENDING_REVIEW' },
    { orderId: '408-9932450-0190727', customerName: 'Ashish ar', amount: 793, status: 'REVIEW_SUBMITTED', reviewRating: 5, reviewSubmittedAt: new Date('2026-09-18T16:20:00.000Z') },
    { orderId: '406-2527724-8333131', customerName: 'Vikas rohi', amount: 0, status: 'PENDING_REVIEW' },
    { orderId: '406-6088399-6185101', customerName: 'Arun kum', amount: 0, status: 'PENDING_REVIEW' },
    { orderId: '404-2083786-6252352', customerName: 'nitin', amount: 793, status: 'PENDING_REVIEW' },
    { orderId: '402-8649734-1331566', customerName: 'Gunjan', amount: 784, status: 'REVIEW_SUBMITTED', reviewRating: 5, reviewSubmittedAt: new Date('2026-09-19T09:10:00.000Z') },
  ];

  for (const ord of deal2Orders) {
    await prisma.order.upsert({
      where: { orderId: ord.orderId },
      update: {},
      create: {
        orderId: ord.orderId,
        brandId: celary.id,
        dealId: deal2.id,
        customerName: ord.customerName,
        amount: ord.amount,
        status: ord.status,
        orderDate: new Date('2026-09-16T12:00:00.000Z'),
        reviewRating: ord.reviewRating || null,
        reviewSubmittedAt: ord.reviewSubmittedAt || null,
      },
    });
  }

  console.log('Database seeded successfully with Tagas and Celary deals & orders.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
