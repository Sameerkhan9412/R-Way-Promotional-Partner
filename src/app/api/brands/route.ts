import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
      },
    });

    const brandStats = brands.map((brand) => {
      const totalOrders = brand.orders.length;
      const reviewPending = brand.orders.filter(
        (o) => o.status === 'PENDING_REVIEW'
      ).length;
      const reviewSubmitted = brand.orders.filter(
        (o) => o.status === 'REVIEW_SUBMITTED'
      ).length;
      const totalAmount = brand.orders.reduce((sum, o) => sum + o.amount, 0);

      const completionRate =
        totalOrders > 0
          ? Math.round((reviewSubmitted / totalOrders) * 100)
          : 0;

      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        totalOrders,
        reviewPending,
        reviewSubmitted,
        totalAmount,
        completionRate,
      };
    });

    return NextResponse.json({ brands: brandStats });
  } catch (error) {
    console.error('Fetch brands error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name: trimmedName, description: description || undefined },
      create: {
        name: trimmedName,
        slug,
        description: description || null,
      },
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Create brand error:', error);
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 });
  }
}
