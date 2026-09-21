export interface ParsedOrderItem {
  orderId: string;
  customerName: string;
  amount: number;
  hasExplicitAmount: boolean;
  rawLine: string;
}

export interface ParsedDeal {
  id: string;
  dateStr: string;
  date: Date;
  dealCode: string;
  rawBrandProduct: string;
  brandName: string;
  productTitle: string;
  expectedOrderCount: number | null;
  statedTotal: number | null;
  calculatedTotal: number;
  orders: ParsedOrderItem[];
  isCountMatching: boolean;
  isTotalMatching: boolean;
}

export interface ParseResult {
  deals: ParsedDeal[];
  totalOrdersFound: number;
  errors: string[];
}

const AMAZON_ORDER_REGEX = /\b(\d{3}-\d{7}-\d{7})\b/;
const DATE_REGEX = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b)/;
const DEAL_CODE_REGEX = /\b(Deal\s*#?\d+|Offer\s*#?\d+)/i;
const ORDERS_COUNT_REGEX = /\((\d{1,3})\s*(?:orders?|items?|ord|pcs)?\)/i;
const TOTAL_REGEX = /Total\s*[:\-]?\s*(\d+(?:\.\d+)?)/i;

/**
 * Parses raw text from WhatsApp message containing one or more deal batches.
 */
export function parseWhatsAppMessage(rawText: string): ParseResult {
  const result: ParseResult = {
    deals: [],
    totalOrdersFound: 0,
    errors: [],
  };

  if (!rawText || !rawText.trim()) {
    return result;
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let currentDeal: Partial<ParsedDeal> | null = null;
  let currentOrders: ParsedOrderItem[] = [];

  function finalizeCurrentDeal() {
    if (!currentDeal && currentOrders.length === 0) return;

    const orders = [...currentOrders];
    const calculatedTotal = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const statedTotal = currentDeal?.statedTotal ?? null;
    const expectedCount = currentDeal?.expectedOrderCount ?? null;

    const brandName = currentDeal?.brandName || (orders.length > 0 ? 'General' : 'Unknown');
    const productTitle = currentDeal?.productTitle || currentDeal?.rawBrandProduct || 'Campaign Product';

    const finalized: ParsedDeal = {
      id: 'deal_' + Math.random().toString(36).substring(2, 9),
      dateStr: currentDeal?.dateStr || new Date().toISOString().split('T')[0],
      date: currentDeal?.date || new Date(),
      dealCode: currentDeal?.dealCode || 'Deal Promo',
      rawBrandProduct: currentDeal?.rawBrandProduct || '',
      brandName: brandName,
      productTitle: productTitle,
      expectedOrderCount: expectedCount,
      statedTotal: statedTotal,
      calculatedTotal: Math.round(calculatedTotal * 100) / 100,
      orders,
      isCountMatching: expectedCount !== null ? expectedCount === orders.length : true,
      isTotalMatching: statedTotal !== null ? Math.abs(statedTotal - calculatedTotal) < 1 : true,
    };

    result.deals.push(finalized);
    result.totalOrdersFound += orders.length;

    currentDeal = null;
    currentOrders = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains an Amazon Order ID
    const orderMatch = line.match(AMAZON_ORDER_REGEX);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const orderItem = parseOrderLine(line, orderId);
      currentOrders.push(orderItem);
      continue;
    }

    // Check if line looks like a header (Date + Deal code or new deal trigger)
    const dateMatch = line.match(DATE_REGEX);
    const dealMatch = line.match(DEAL_CODE_REGEX);

    if (dateMatch || dealMatch) {
      // If we already have accumulated orders for a prior deal, finalize it first
      if (currentOrders.length > 0) {
        finalizeCurrentDeal();
      }

      const dateStr = dateMatch ? dateMatch[1] : '';
      const parsedDate = parseDateString(dateStr);
      const dealCode = dealMatch ? dealMatch[1] : 'Deal';

      currentDeal = {
        dateStr: dateStr || new Date().toLocaleDateString('en-GB'),
        date: parsedDate,
        dealCode: dealCode,
      };
      continue;
    }

    // Check if line is "Total xxx"
    const totalMatch = line.match(TOTAL_REGEX);
    if (totalMatch) {
      if (!currentDeal) currentDeal = {};
      currentDeal.statedTotal = parseFloat(totalMatch[1]);
      continue;
    }

    // Check if line is Product / Brand with optional order count "(05 orders)"
    const countMatch = line.match(ORDERS_COUNT_REGEX);
    if (countMatch || (!currentDeal?.rawBrandProduct && currentOrders.length === 0)) {
      if (!currentDeal) currentDeal = {};

      currentDeal.rawBrandProduct = line;
      if (countMatch) {
        currentDeal.expectedOrderCount = parseInt(countMatch[1], 10);
      }

      // Extract Brand name & Product Title
      // e.g. "Tagas kids night suit (05 orders)" -> Brand: Tagas, Title: Tagas kids night suit
      const cleaned = line.replace(ORDERS_COUNT_REGEX, '').trim();
      const tokens = cleaned.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        currentDeal.brandName = tokens[0].replace(/[^a-zA-Z0-9_-]/g, '');
        currentDeal.productTitle = cleaned;
      }
      continue;
    }
  }

  // Finalize last deal block if pending
  finalizeCurrentDeal();

  // If orders were found without any deal header, create a default deal wrapper
  if (result.deals.length === 0 && currentOrders.length > 0) {
    finalizeCurrentDeal();
  }

  return result;
}

/**
 * Extracts customer name and amount from an Amazon order line.
 * Example lines:
 * "402-3773401-7723540 Nitesh 363" -> Customer: "Nitesh", Amount: 363
 * "408-7068348-7712307 MANGI lal 289" -> Customer: "MANGI lal", Amount: 289
 * "406-2527724-8333131 Vikas rohi" -> Customer: "Vikas rohi", Amount: 0
 */
export function parseOrderLine(line: string, orderId: string): ParsedOrderItem {
  // Remove the order ID from line
  const remainder = line.replace(orderId, '').trim();

  if (!remainder) {
    return {
      orderId,
      customerName: 'Customer',
      amount: 0,
      hasExplicitAmount: false,
      rawLine: line,
    };
  }

  // Look for trailing number which represents the amount (e.g. 363, 793, 289.50)
  // Regex looks for digits at the end of the string
  const trailingAmountMatch = remainder.match(/(.*?)(?:\s+)?(\d+(?:\.\d+)?)\s*$/);

  if (trailingAmountMatch && trailingAmountMatch[2]) {
    const rawName = trailingAmountMatch[1].trim();
    const amountVal = parseFloat(trailingAmountMatch[2]);

    // Check if the matched name is empty (e.g. only orderId and amount were provided)
    const customerName = rawName || 'Customer';

    return {
      orderId,
      customerName: sanitizeCustomerName(customerName),
      amount: amountVal,
      hasExplicitAmount: true,
      rawLine: line,
    };
  }

  // No trailing number found: entire remainder is customer name
  return {
    orderId,
    customerName: sanitizeCustomerName(remainder),
    amount: 0,
    hasExplicitAmount: false,
    rawLine: line,
  };
}

function sanitizeCustomerName(name: string): string {
  // Remove unwanted punctuation or dashes
  return name.replace(/^[\s\-:,|]+|[\s\-:,|]+$/g, '').trim() || 'Customer';
}

/**
 * Parses date string like "16/09/2026", "16-09-2026", "2026-09-16" into a Date object.
 */
function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Try standard DD/MM/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      // DD/MM/YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }

  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}
