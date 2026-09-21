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
  reviewLink?: string | null;
  notes?: string | null;
}

/**
 * Detects and extracts a valid URL from a cell string value,
 * resolving relative paths with baseUrl if available.
 */
function extractUrl(val: unknown, baseUrl?: string): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-') return null;

  // Direct absolute HTTP/HTTPS URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Relative upload or asset path (e.g. /uploads/image.png)
  if (trimmed.startsWith('/') || /^\/uploads\//i.test(trimmed)) {
    const cleanBase = (baseUrl || '').replace(/\/+$/, '');
    if (cleanBase) {
      return `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    }
    return trimmed;
  }

  // Embedded URL in text (e.g. "Review Link: https://amazon.in/...")
  const match = trimmed.match(/https?:\/\/[^\s"'<>\(\)\|]+/i);
  if (match) {
    return match[0];
  }

  return null;
}

/**
 * Creates an Excel workbook buffer from an array of order records.
 * Automatically transforms any cell containing a URL into a directly clickable Excel hyperlink.
 */
export function generateOrdersWorkbook(
  orders: ExportOrderRow[],
  brandName?: string,
  baseUrl?: string
): Uint8Array {
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

    // Auto-detect review link from notes if not explicitly provided
    let reviewLink = ord.reviewLink || '';
    if (!reviewLink && ord.notes) {
      const match = ord.notes.match(/https?:\/\/[^\s"'<>\(\)\|]+/i);
      if (match) {
        reviewLink = match[0];
      }
    }

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
      'Review Link': reviewLink || '-',
      'Delivered Proof URL': ord.deliveredProofUrl || '-',
      'Rating Proof URL': ord.ratingProofUrl || '-',
      'Notes': ord.notes || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(formattedRows);

  // Scan all cells and attach OpenXML hyperlinks and HYPERLINK formulas for any URL data
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell || typeof cell.v !== 'string') continue;

        const url = extractUrl(cell.v, baseUrl);
        if (url) {
          // OpenXML native relationship hyperlink
          cell.l = {
            Target: url,
            Tooltip: `Click to open link: ${url}`,
          };
          // Excel HYPERLINK formula ensures blue-underline clickable link styling in Excel & Google Sheets
          const safeUrl = url.replace(/"/g, '""');
          const safeLabel = String(cell.v).replace(/"/g, '""');
          cell.f = `HYPERLINK("${safeUrl}", "${safeLabel}")`;
        }
      }
    }

    // Compute dynamic, readable column widths
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell && cell.v !== undefined && cell.v !== null) {
          const len = String(cell.v).length;
          if (len > maxLen) maxLen = len;
        }
      }
      colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 10), 45) });
    }
    ws['!cols'] = colWidths;
  }

  const sheetName = (brandName ? `${brandName} Orders` : 'All Orders').substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}
