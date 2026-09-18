import * as XLSX from 'xlsx';

export interface ExportOrderRow {
  id: string;
  orderId: string;
  brandName: string;
  dealCode?: string;
  customerName: string;
  amount: number;
  status: string;
  orderDate: string | Date;
  reviewSubmittedAt?: string | Date | null;
  reviewRating?: number | null;
  deliveredProofUrl?: string | null;
  ratingProofUrl?: string | null;
}

/**
 * Creates an Excel workbook buffer from an array of order records.
 */
export function generateOrdersWorkbook(orders: ExportOrderRow[], brandName?: string): Uint8Array {
  const wb = XLSX.utils.book_new();

  const formattedRows = orders.map((ord, idx) => {
    const formattedDate = ord.orderDate
      ? new Date(ord.orderDate).toLocaleDateString('en-GB')
      : '';
    const reviewDate = ord.reviewSubmittedAt
      ? new Date(ord.reviewSubmittedAt).toLocaleDateString('en-GB')
      : '-';

    const statusLabel =
      ord.status === 'REVIEW_SUBMITTED' ? 'Review Submitted' : 'Pending Review';

    return {
      'S.No': idx + 1,
      'Order ID (Amazon)': ord.orderId,
      'Brand': ord.brandName,
      'Deal Code': ord.dealCode || '-',
      'Buyer / Customer Name': ord.customerName,
      'Offer / Order Amount (₹)': ord.amount,
      'Order Date': formattedDate,
      'Review Status': statusLabel,
      'Review Date': reviewDate,
      'Rating (Stars)': ord.reviewRating ? `${ord.reviewRating} / 5` : '-',
      'Delivered Proof URL': ord.deliveredProofUrl || '-',
      'Rating Proof URL': ord.ratingProofUrl || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(formattedRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 24 }, // Order ID
    { wch: 14 }, // Brand
    { wch: 12 }, // Deal Code
    { wch: 22 }, // Customer Name
    { wch: 22 }, // Amount
    { wch: 14 }, // Date
    { wch: 18 }, // Review Status
    { wch: 14 }, // Review Date
    { wch: 14 }, // Rating
    { wch: 26 }, // Delivered Proof
    { wch: 26 }, // Rating Proof
  ];

  const sheetName = (brandName ? `${brandName} Orders` : 'All Orders').substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
