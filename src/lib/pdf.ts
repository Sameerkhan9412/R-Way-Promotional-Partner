import PDFDocument from 'pdfkit';
import { ExportOrderRow } from './excel';

export type { ExportOrderRow };

/**
 * Helper to detect and extract valid URL, resolving relative paths with baseUrl.
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

  // Embedded URL in text
  const match = trimmed.match(/https?:\/\/[^\s"'<>\(\)\|]+/i);
  if (match) {
    return match[0];
  }

  return null;
}

interface ColumnDef {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  isLink?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { header: '#', width: 28, align: 'center' },
  { header: 'Order ID (Amazon)', width: 116, align: 'left' },
  { header: 'Brand', width: 72, align: 'left' },
  { header: 'Deal Code', width: 62, align: 'left' },
  { header: 'Buyer Name', width: 88, align: 'left' },
  { header: 'Amount (₹)', width: 56, align: 'right' },
  { header: 'Status', width: 78, align: 'center' },
  { header: 'Order Date', width: 60, align: 'center' },
  { header: 'Delivered Proof', width: 68, align: 'center', isLink: true },
  { header: 'Rating Proof', width: 68, align: 'center', isLink: true },
  { header: 'Review Link', width: 68, align: 'center', isLink: true },
  { header: 'Notes', width: 27, align: 'left' },
];

/**
 * Generates an executive-ready PDF order report buffer.
 * Automatically renders clickable "Click" buttons for any proof or review link cells.
 */
export async function generateOrdersPDF(
  orders: ExportOrderRow[],
  brandName: string = 'All Brands',
  baseUrl?: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape', // 841.89 x 595.28 pt
        margins: { top: 26, bottom: 26, left: 25, right: 25 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const startX = 25;
      const contentWidth = 791.89;
      const bottomLimit = pageHeight - 38;

      // Summary metrics
      const totalOrders = orders.length;
      const totalAmount = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const submittedCount = orders.filter((o) => o.status === 'REVIEW_SUBMITTED').length;
      const pendingCount = totalOrders - submittedCount;

      let currentY = 24;

      // --- 1. Header Section ---
      doc.rect(startX, currentY, contentWidth, 42).fill('#0f766e');

      // Header Brand Text
      doc.font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#ffffff')
        .text('RWAY PROMOTION PARTNERS', startX + 14, currentY + 10);

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#ccfbf1')
        .text('CAMPAIGN ORDER & REVIEW STATUS REPORT', startX + 14, currentY + 26);

      // Header Meta (Right aligned)
      const nowStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      doc.font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#ffffff')
        .text(`Brand: ${brandName}`, startX, currentY + 10, {
          width: contentWidth - 14,
          align: 'right',
        });

      doc.font('Helvetica')
        .fontSize(8)
        .fillColor('#ccfbf1')
        .text(`Generated: ${nowStr} | Total: ${totalOrders} Orders`, startX, currentY + 26, {
          width: contentWidth - 14,
          align: 'right',
        });

      currentY += 48;

      // --- 2. Summary KPI Metrics Bar ---
      const cardWidth = (contentWidth - 24) / 4;
      const stats = [
        { label: 'TOTAL ORDERS', val: `${totalOrders}`, color: '#0f766e' },
        { label: 'TOTAL REVENUE', val: `₹${totalAmount.toLocaleString('en-IN')}`, color: '#0284c7' },
        { label: 'REVIEWS SUBMITTED', val: `${submittedCount}`, color: '#16a34a' },
        { label: 'PENDING REVIEWS', val: `${pendingCount}`, color: '#d97706' },
      ];

      stats.forEach((st, idx) => {
        const cx = startX + idx * (cardWidth + 8);
        doc.roundedRect(cx, currentY, cardWidth, 28, 4)
          .fillAndStroke('#f8fafc', '#e2e8f0');

        doc.font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor('#64748b')
          .text(st.label, cx + 8, currentY + 5);

        doc.font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(st.color)
          .text(st.val, cx + 8, currentY + 13);
      });

      currentY += 34;

      // Helper function to draw table header
      const drawTableHeader = (y: number) => {
        doc.rect(startX, y, contentWidth, 18).fill('#1e293b');
        let x = startX;
        COLUMNS.forEach((col) => {
          doc.font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#ffffff')
            .text(col.header, x + 3, y + 5, {
              width: col.width - 6,
              align: col.align || 'left',
            });
          x += col.width;
        });
        return y + 18;
      };

      currentY = drawTableHeader(currentY);

      // --- 3. Render Table Rows ---
      const rowHeight = 20;

      orders.forEach((ord, index) => {
        // Page break check
        if (currentY + rowHeight > bottomLimit) {
          doc.addPage();
          currentY = 24;
          currentY = drawTableHeader(currentY);
        }

        const isEven = index % 2 === 0;
        const rowBg = isEven ? '#ffffff' : '#f8fafc';
        doc.rect(startX, currentY, contentWidth, rowHeight).fill(rowBg);

        // Bottom row border
        doc.moveTo(startX, currentY + rowHeight)
          .lineTo(startX + contentWidth, currentY + rowHeight)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();

        // Extract and resolve URLs
        const deliveredUrl = extractUrl(ord.deliveredProofUrl, baseUrl);
        const ratingUrl = extractUrl(ord.ratingProofUrl, baseUrl);
        let reviewUrl = extractUrl(ord.reviewLink, baseUrl);
        if (!reviewUrl && ord.notes) {
          reviewUrl = extractUrl(ord.notes, baseUrl);
        }

        const formattedDate = ord.orderDate
          ? new Date(ord.orderDate).toLocaleDateString('en-GB')
          : '-';

        const isSubmitted = ord.status === 'REVIEW_SUBMITTED';

        let colX = startX;

        // 1. S.No
        doc.font('Helvetica')
          .fontSize(7.5)
          .fillColor('#475569')
          .text(`${index + 1}`, colX + 2, currentY + 6, {
            width: COLUMNS[0].width - 4,
            align: 'center',
          });
        colX += COLUMNS[0].width;

        // 2. Order ID (Amazon)
        doc.font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#0f172a')
          .text(ord.orderId, colX + 3, currentY + 6, {
            width: COLUMNS[1].width - 6,
            lineBreak: false,
            ellipsis: true,
          });
        colX += COLUMNS[1].width;

        // 3. Brand
        doc.font('Helvetica')
          .fontSize(7.5)
          .fillColor('#334155')
          .text(ord.brandName || '-', colX + 3, currentY + 6, {
            width: COLUMNS[2].width - 6,
            lineBreak: false,
            ellipsis: true,
          });
        colX += COLUMNS[2].width;

        // 4. Deal Code
        doc.font('Helvetica')
          .fontSize(7.5)
          .fillColor('#64748b')
          .text(ord.dealCode || '-', colX + 3, currentY + 6, {
            width: COLUMNS[3].width - 6,
            lineBreak: false,
            ellipsis: true,
          });
        colX += COLUMNS[3].width;

        // 5. Buyer Name
        doc.font('Helvetica')
          .fontSize(7.5)
          .fillColor('#0f172a')
          .text(ord.customerName || '-', colX + 3, currentY + 6, {
            width: COLUMNS[4].width - 6,
            lineBreak: false,
            ellipsis: true,
          });
        colX += COLUMNS[4].width;

        // 6. Amount (₹)
        doc.font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor('#0f172a')
          .text(`₹${Number(ord.amount || 0).toLocaleString('en-IN')}`, colX + 2, currentY + 6, {
            width: COLUMNS[5].width - 6,
            align: 'right',
          });
        colX += COLUMNS[5].width;

        // 7. Status (Pill)
        const statusText = isSubmitted ? 'Submitted' : 'Pending';
        const statusBg = isSubmitted ? '#dcfce7' : '#fef3c7';
        const statusFg = isSubmitted ? '#15803d' : '#b45309';

        const pillW = 54;
        const pillH = 12;
        const pillX = colX + (COLUMNS[6].width - pillW) / 2;
        const pillY = currentY + 4;

        doc.roundedRect(pillX, pillY, pillW, pillH, 3).fill(statusBg);
        doc.font('Helvetica-Bold')
          .fontSize(6)
          .fillColor(statusFg)
          .text(statusText, pillX, pillY + 3, {
            width: pillW,
            align: 'center',
          });
        colX += COLUMNS[6].width;

        // 8. Order Date
        doc.font('Helvetica')
          .fontSize(7)
          .fillColor('#64748b')
          .text(formattedDate, colX + 2, currentY + 6, {
            width: COLUMNS[7].width - 4,
            align: 'center',
          });
        colX += COLUMNS[7].width;

        // Helper to render a clickable "Click" button or "-"
        const renderLinkCell = (url: string | null, colDef: ColumnDef) => {
          if (url) {
            const btnW = 42;
            const btnH = 13;
            const btnX = colX + (colDef.width - btnW) / 2;
            const btnY = currentY + 3.5;

            // Draw clean button background
            doc.roundedRect(btnX, btnY, btnW, btnH, 3)
              .fillAndStroke('#eff6ff', '#bfdbfe');

            // Render clickable "Click" text with native PDF URI hyperlink annotation
            doc.font('Helvetica-Bold')
              .fontSize(7)
              .fillColor('#1d4ed8')
              .text('Click', btnX, btnY + 3.5, {
                width: btnW,
                align: 'center',
                underline: true,
                link: url,
              });
          } else {
            doc.font('Helvetica')
              .fontSize(7)
              .fillColor('#94a3b8')
              .text('-', colX, currentY + 6, {
                width: colDef.width,
                align: 'center',
              });
          }
          colX += colDef.width;
        };

        // 9. Delivered Proof URL -> "Click"
        renderLinkCell(deliveredUrl, COLUMNS[8]);

        // 10. Rating Proof URL -> "Click"
        renderLinkCell(ratingUrl, COLUMNS[9]);

        // 11. Review Link -> "Click"
        renderLinkCell(reviewUrl, COLUMNS[10]);

        // 12. Notes
        doc.font('Helvetica')
          .fontSize(6.5)
          .fillColor('#64748b')
          .text(ord.notes ? ord.notes.substring(0, 10) : '-', colX + 2, currentY + 6, {
            width: COLUMNS[11].width - 4,
            lineBreak: false,
            ellipsis: true,
          });

        currentY += rowHeight;
      });

      // --- 4. Page Footers (Page numbering) ---
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica')
          .fontSize(7)
          .fillColor('#94a3b8')
          .text(
            `RWAY Promotion Partners • Confidential Order Report • Page ${i + 1} of ${totalPages}`,
            startX,
            pageHeight - 20,
            {
              width: contentWidth,
              align: 'center',
            }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
