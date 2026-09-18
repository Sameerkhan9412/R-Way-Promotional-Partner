import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOrdersWorkbook, ExportOrderRow } from '@/lib/excel';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status');
    const timeRange = searchParams.get('timeRange') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (brandId && brandId !== 'all') {
      where.brandId = brandId;
    }

    if (status === 'pending') {
      where.status = 'PENDING_REVIEW';
    } else if (status === 'submitted') {
      where.status = 'REVIEW_SUBMITTED';
    }

    const now = new Date();
    if (timeRange === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      where.orderDate = { gte: startOfDay };
    } else if (timeRange === 'yesterday') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      where.orderDate = { gte: startOfYesterday, lte: endOfYesterday };
    } else if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.orderDate = { gte: oneWeekAgo };
    } else if (timeRange === 'custom') {
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.orderDate.lte = end;
        }
      }
    }

    let targetBrandName = 'All';
    if (brandId && brandId !== 'all') {
      const b = await prisma.brand.findUnique({ where: { id: brandId } });
      if (b) targetBrandName = b.name;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { orderDate: 'desc' },
      include: {
        brand: true,
        deal: true,
      },
    });

    const exportRows: ExportOrderRow[] = orders.map((o) => ({
      id: o.id,
      orderId: o.orderId,
      brandName: o.brand.name,
      dealCode: o.deal?.dealCode || '-',
      customerName: o.customerName,
      amount: o.amount,
      status: o.status,
      orderDate: o.orderDate,
      reviewSubmittedAt: o.reviewSubmittedAt,
      reviewRating: o.reviewRating,
      deliveredProofUrl: o.deliveredProofUrl,
      ratingProofUrl: o.ratingProofUrl,
    }));

    const workbookBuffer = generateOrdersWorkbook(exportRows, targetBrandName);
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `RWAY_${targetBrandName.replace(/\s+/g, '_')}_Orders_${dateStamp}.xlsx`;

    return new Response(Buffer.from(workbookBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel file' }, { status: 500 });
  }
}
