import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Webhook handler for Google Apps Script / Google Forms / Zapier
 * Example Google Apps Script snippet is documented in the response or admin settings.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let data: any = {};

    try {
      data = JSON.parse(rawBody);
    } catch {
      // If form-urlencoded or plain text
      const params = new URLSearchParams(rawBody);
      params.forEach((value, key) => {
        data[key] = value;
      });
    }

    // Attempt to extract order ID from different likely field names
    const orderId =
      data.orderId ||
      data['Order ID'] ||
      data['order_id'] ||
      data['Amazon Order ID'] ||
      data['Amazon Order Number'] ||
      '';

    const customerName =
      data.customerName ||
      data['Customer Name'] ||
      data['Name'] ||
      data['Buyer Name'] ||
      '';

    const rating =
      data.rating ||
      data['Rating'] ||
      data['Star Rating'] ||
      5;

    const deliveredUrl =
      data.deliveredScreenshotUrl ||
      data['Delivered Screenshot'] ||
      data['Delivered Proof'] ||
      '';

    const ratingUrl =
      data.ratingScreenshotUrl ||
      data['Rating Screenshot'] ||
      data['Review Screenshot'] ||
      '';

    const cleanOrderId = String(orderId).trim();
    if (!cleanOrderId) {
      return NextResponse.json(
        { error: 'Order ID could not be identified in payload' },
        { status: 400 }
      );
    }

    // Match order
    const order = await prisma.order.findUnique({
      where: { orderId: cleanOrderId },
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
          reviewRating: parseInt(String(rating), 10) || 5,
          deliveredProofUrl: deliveredUrl || order.deliveredProofUrl,
          ratingProofUrl: ratingUrl || order.ratingProofUrl,
        },
      });
    }

    const submission = await prisma.reviewSubmission.create({
      data: {
        orderId: cleanOrderId,
        customerName: customerName || (order ? order.customerName : null),
        rating: parseInt(String(rating), 10) || 5,
        deliveredScreenshotUrl: deliveredUrl || null,
        ratingScreenshotUrl: ratingUrl || null,
        source: 'GOOGLE_FORM',
        rawData: rawBody,
      },
    });

    return NextResponse.json({
      success: true,
      matched,
      order: updatedOrder,
      submission,
      message: matched
        ? `Google Form submission mapped successfully to ${cleanOrderId}!`
        : `Google Form submission received for ${cleanOrderId}. Order record not yet created.`,
    });
  } catch (error) {
    console.error('Google Form sync error:', error);
    return NextResponse.json({ error: 'Failed to process Google Form sync' }, { status: 500 });
  }
}
