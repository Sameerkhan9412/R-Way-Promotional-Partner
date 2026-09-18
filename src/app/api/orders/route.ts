import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parentFilter = searchParams.get('parentFilter') || 'all'; // all | pending | submitted
    const brandId = searchParams.get('brandId');
    const timeRange = searchParams.get('timeRange') || 'all'; // all | today | yesterday | week | custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search')?.trim();
    const sortBy = searchParams.get('sortBy') || 'orderDate';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build Prisma query condition
    const where: any = {};

    // Parent Filter Status Condition
    if (parentFilter === 'pending') {
      where.status = 'PENDING_REVIEW';
    } else if (parentFilter === 'submitted') {
      where.status = 'REVIEW_SUBMITTED';
    }

    // Brand Condition
    if (brandId && brandId !== 'all') {
      where.brandId = brandId;
    }

    // Date Range Condition
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
        if (startDate) {
          where.orderDate.gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.orderDate.lte = end;
        }
      }
    }

    // Search Query Condition (Order ID, Customer Name, Brand Name, Deal Code)
    if (search) {
      where.OR = [
        { orderId: { contains: search } },
        { customerName: { contains: search } },
        { brand: { name: { contains: search } } },
        { deal: { dealCode: { contains: search } } },
      ];
    }

    // Sorting
    let orderBy: any = {};
    if (sortBy === 'amount') {
      orderBy = { amount: sortOrder };
    } else if (sortBy === 'customerName') {
      orderBy = { customerName: sortOrder };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else {
      orderBy = { orderDate: sortOrder };
    }

    // Fetch matching orders
    const orders = await prisma.order.findMany({
      where,
      orderBy,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        deal: {
          select: {
            id: true,
            dealCode: true,
            title: true,
          },
        },
      },
    });

    // Compute aggregate counts (independent of current status parentFilter to display tabs accurately)
    const baseWhere = { ...where };
    delete baseWhere.status;

    const [totalCount, pendingCount, submittedCount] = await Promise.all([
      prisma.order.count({ where: baseWhere }),
      prisma.order.count({ where: { ...baseWhere, status: 'PENDING_REVIEW' } }),
      prisma.order.count({ where: { ...baseWhere, status: 'REVIEW_SUBMITTED' } }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

    return NextResponse.json({
      orders,
      counts: {
        totalOrders: totalCount,
        pendingReview: pendingCount,
        submittedReview: submittedCount,
      },
      totalRevenue,
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST: Create single order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, brandId, brandName, dealCode, customerName, amount, orderDate, status } = body;

    if (!orderId || !orderId.trim()) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    let targetBrandId = brandId;

    // If brandName is provided without brandId, find or create brand
    if (!targetBrandId && brandName) {
      const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const brand = await prisma.brand.upsert({
        where: { slug },
        update: { name: brandName.trim() },
        create: { name: brandName.trim(), slug },
      });
      targetBrandId = brand.id;
    }

    if (!targetBrandId) {
      // Default to first brand or create General
      const firstBrand = await prisma.brand.findFirst();
      if (firstBrand) {
        targetBrandId = firstBrand.id;
      } else {
        const brand = await prisma.brand.create({
          data: { name: 'General', slug: 'general' },
        });
        targetBrandId = brand.id;
      }
    }

    // Optional deal creation or assignment
    let dealId = null;
    if (dealCode) {
      const deal = await prisma.deal.findFirst({
        where: { dealCode, brandId: targetBrandId },
      });
      if (deal) {
        dealId = deal.id;
      } else {
        const newDeal = await prisma.deal.create({
          data: {
            brandId: targetBrandId,
            dealCode,
            title: `${dealCode} Campaign`,
            dealDate: orderDate ? new Date(orderDate) : new Date(),
          },
        });
        dealId = newDeal.id;
      }
    }

    const order = await prisma.order.upsert({
      where: { orderId: orderId.trim() },
      update: {
        brandId: targetBrandId,
        dealId,
        customerName: customerName || 'Customer',
        amount: parseFloat(amount) || 0,
        status: status || 'PENDING_REVIEW',
        orderDate: orderDate ? new Date(orderDate) : new Date(),
      },
      create: {
        orderId: orderId.trim(),
        brandId: targetBrandId,
        dealId,
        customerName: customerName || 'Customer',
        amount: parseFloat(amount) || 0,
        status: status || 'PENDING_REVIEW',
        orderDate: orderDate ? new Date(orderDate) : new Date(),
      },
      include: {
        brand: true,
        deal: true,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Create single order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

// PUT: Update order details or toggle status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, orderId, status, customerName, amount, reviewRating, notes } = body;

    const targetId = id || (orderId ? (await prisma.order.findUnique({ where: { orderId } }))?.id : null);
    if (!targetId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'REVIEW_SUBMITTED') {
        updateData.reviewSubmittedAt = new Date();
      } else if (status === 'PENDING_REVIEW') {
        updateData.reviewSubmittedAt = null;
      }
    }

    if (customerName !== undefined) updateData.customerName = customerName;
    if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
    if (reviewRating !== undefined) updateData.reviewRating = parseInt(reviewRating, 10);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.order.update({
      where: { id: targetId },
      data: updateData,
      include: { brand: true, deal: true },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE: Remove order
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const orderId = searchParams.get('orderId');

    if (!id && !orderId) {
      return NextResponse.json({ error: 'ID or Order ID required' }, { status: 400 });
    }

    if (id) {
      await prisma.order.delete({ where: { id } });
    } else if (orderId) {
      await prisma.order.delete({ where: { orderId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
