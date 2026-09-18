import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { deals } = await request.json();

    if (!deals || !Array.isArray(deals) || deals.length === 0) {
      return NextResponse.json(
        { error: 'Invalid deals payload. Array of deals is required.' },
        { status: 400 }
      );
    }

    let totalImported = 0;
    let totalUpdated = 0;
    const createdBrandIds = new Set<string>();

    for (const dealData of deals) {
      const {
        brandName,
        dealCode,
        productTitle,
        date,
        expectedOrderCount,
        statedTotal,
        orders,
      } = dealData;

      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        continue;
      }

      // 1. Ensure Brand exists (case-insensitive slug match)
      const cleanBrand = (brandName || 'General').trim();
      const brandSlug = cleanBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const brand = await prisma.brand.upsert({
        where: { slug: brandSlug },
        update: { name: cleanBrand },
        create: {
          name: cleanBrand,
          slug: brandSlug,
          description: `${cleanBrand} Campaign Brand`,
        },
      });

      createdBrandIds.add(brand.id);

      // 2. Create or Find Deal
      const dealDate = date ? new Date(date) : new Date();
      const calculatedDealTotal = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);

      const deal = await prisma.deal.create({
        data: {
          brandId: brand.id,
          title: productTitle || `${cleanBrand} Deal`,
          dealCode: dealCode || 'Deal Promo',
          dealDate,
          expectedOrders: expectedOrderCount || orders.length,
          totalAmount: statedTotal || calculatedDealTotal,
        },
      });

      // 3. Upsert each Order
      for (const ord of orders) {
        if (!ord.orderId) continue;

        const cleanOrderId = ord.orderId.trim();
        const existing = await prisma.order.findUnique({
          where: { orderId: cleanOrderId },
        });

        const orderDate = date ? new Date(date) : new Date();
        const amount = parseFloat(ord.amount) || 0;
        const customerName = (ord.customerName || 'Customer').trim();

        if (existing) {
          await prisma.order.update({
            where: { orderId: cleanOrderId },
            data: {
              brandId: brand.id,
              dealId: deal.id,
              customerName,
              amount: amount > 0 ? amount : existing.amount,
              orderDate,
            },
          });
          totalUpdated++;
        } else {
          await prisma.order.create({
            data: {
              orderId: cleanOrderId,
              brandId: brand.id,
              dealId: deal.id,
              customerName,
              amount,
              status: 'PENDING_REVIEW',
              orderDate,
            },
          });
          totalImported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk import completed! ${totalImported} orders imported, ${totalUpdated} orders updated.`,
      stats: {
        totalImported,
        totalUpdated,
        dealsProcessed: deals.length,
        brandsCount: createdBrandIds.size,
      },
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk import.' },
      { status: 500 }
    );
  }
}
