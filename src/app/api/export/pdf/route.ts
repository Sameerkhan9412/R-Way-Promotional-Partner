import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOrdersPDF, ExportOrderRow } from '@/lib/pdf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status') || searchParams.get('parentFilter');
    const timeRange = searchParams.get('timeRange') || 'all';
    const specificDate = searchParams.get('specificDate') || searchParams.get('date');
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
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      where.orderDate = { gte: startOfYesterday, lte: endOfYesterday };
    } else if (timeRange === 'single' || (specificDate && timeRange !== 'custom')) {
      if (specificDate) {
        const [y, m, d] = specificDate.split('-').map(Number);
        const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
        const endLocal = new Date(y, m - 1, d, 23, 59, 59, 999);
        const startUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        const endUtc = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

        const minStart = new Date(Math.min(startLocal.getTime(), startUtc.getTime()));
        const maxEnd = new Date(Math.max(endLocal.getTime(), endUtc.getTime()));
        where.orderDate = { gte: minStart, lte: maxEnd };
      }
    } else if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.orderDate = { gte: oneWeekAgo };
    } else if (timeRange === 'custom') {
      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) {
          const [sy, sm, sd] = startDate.split('-').map(Number);
          where.orderDate.gte = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        }
        if (endDate) {
          const [ey, em, ed] = endDate.split('-').map(Number);
          where.orderDate.lte = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        }
      }
    }

    let targetBrandName = 'All Brands';
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
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const url = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || url.origin;

    const exportRows: ExportOrderRow[] = orders.map((o) => {
      let reviewLink: string | null = null;
      if (o.notes) {
        const match = o.notes.match(/https?:\/\/[^\s"'<>\(\)\|]+/i);
        if (match) reviewLink = match[0];
      }
      if (!reviewLink && (o as any).reviews?.[0]?.rawData) {
        try {
          const raw = JSON.parse((o as any).reviews[0].rawData);
          if (raw.reviewLink) reviewLink = raw.reviewLink;
        } catch (e) {}
      }

      return {
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
        deliveredProofUrl: o.deliveredProofUrl || (o as any).reviews?.[0]?.deliveredScreenshotUrl || null,
        ratingProofUrl: o.ratingProofUrl || (o as any).reviews?.[0]?.ratingScreenshotUrl || null,
        reviewLink: reviewLink,
        notes: o.notes,
      };
    });

    const pdfBuffer = await generateOrdersPDF(exportRows, targetBrandName, baseUrl);
    const dateStamp = new Date().toISOString().split('T')[0];
    const safeBrandName = targetBrandName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `RWAY_${safeBrandName || 'Orders'}_Orders_${dateStamp}.pdf`;

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF file' }, { status: 500 });
  }
}
