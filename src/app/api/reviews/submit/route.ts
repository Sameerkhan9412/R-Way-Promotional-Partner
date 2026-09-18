import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      customerName,
      rating,
      deliveredScreenshotUrl,
      ratingScreenshotUrl,
      source = 'DIRECT_PORTAL',
    } = body;

    if (!orderId || !orderId.trim()) {
      return NextResponse.json({ error: 'Amazon Order ID is required' }, { status: 400 });
    }

    const cleanOrderId = orderId.trim();

    // Find if order exists in DB
    const order = await prisma.order.findUnique({
      where: { orderId: cleanOrderId },
      include: { brand: true },
    });

    let matched = false;
    let updatedOrder = null;

    if (order) {
      matched = true;
      updatedOrder = await prisma.order.update({
        where: { orderId: cleanOrderId },
        data: {
          status: 'REVIEW_SUBMITTED',
          reviewSubmittedAt: new Date(),
          reviewRating: rating ? parseInt(rating, 10) : (order.reviewRating || 5),
          deliveredProofUrl: deliveredScreenshotUrl || order.deliveredProofUrl,
          ratingProofUrl: ratingScreenshotUrl || order.ratingProofUrl,
        },
      });
    }

    // Always create a ReviewSubmission record
    const submission = await prisma.reviewSubmission.create({
      data: {
        orderId: cleanOrderId,
        customerName: customerName || (order ? order.customerName : null),
        rating: rating ? parseInt(rating, 10) : 5,
        deliveredScreenshotUrl: deliveredScreenshotUrl || null,
        ratingScreenshotUrl: ratingScreenshotUrl || null,
        source: source || 'DIRECT_PORTAL',
        rawData: JSON.stringify(body),
      },
    });

    return NextResponse.json({
      success: true,
      matched,
      message: matched
        ? `Review linked successfully! Order ${cleanOrderId} marked as REVIEW_SUBMITTED.`
        : `Review recorded for Order ${cleanOrderId}. (Pending order sync in database)`,
      order: updatedOrder,
      submission,
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
