import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      customerName,
      submissionType = 'review',
      reviewLink,
      deliveredScreenshotUrl,
      reviewScreenshotUrl,
      ratingScreenshotUrl,
      rating,
      source,
    } = body;

    if (!orderId || !orderId.trim()) {
      return NextResponse.json({ error: 'Amazon Order ID is required' }, { status: 400 });
    }

    const cleanOrderId = orderId.trim();
    const finalProofScreenshot = reviewScreenshotUrl || ratingScreenshotUrl || null;
    const effectiveSource = source || (submissionType === 'rating' ? 'PORTAL_RATING' : 'PORTAL_REVIEW');

    // Find if order exists in DB
    const order = await prisma.order.findUnique({
      where: { orderId: cleanOrderId },
      include: { brand: true },
    });

    let matched = false;
    let updatedOrder = null;

    if (order) {
      matched = true;
      let updatedNotes = order.notes || '';
      if (reviewLink && reviewLink.trim()) {
        const cleanLink = reviewLink.trim();
        if (!updatedNotes) {
          updatedNotes = `Review Link: ${cleanLink}`;
        } else if (!updatedNotes.includes(cleanLink)) {
          updatedNotes = `${updatedNotes} | Review Link: ${cleanLink}`;
        }
      }

      updatedOrder = await prisma.order.update({
        where: { orderId: cleanOrderId },
        data: {
          status: 'REVIEW_SUBMITTED',
          reviewSubmittedAt: new Date(),
          reviewRating: rating ? parseInt(rating, 10) : (order.reviewRating || 5),
          deliveredProofUrl: deliveredScreenshotUrl || order.deliveredProofUrl,
          ratingProofUrl: finalProofScreenshot || order.ratingProofUrl,
          notes: updatedNotes || order.notes,
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
        ratingScreenshotUrl: finalProofScreenshot || null,
        source: effectiveSource,
        rawData: JSON.stringify(body),
      },
    });

    return NextResponse.json({
      success: true,
      matched,
      message: matched
        ? `Submission verified successfully! Order ${cleanOrderId} marked as REVIEW_SUBMITTED.`
        : `Submission received for Order ${cleanOrderId}. (Pending order sync in database)`,
      order: updatedOrder,
      submission,
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
