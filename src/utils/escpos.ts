// ESC/POS byte command builder for 58mm thermal printers
// Generates ESC/POS commands for Coffee and Carwash receipts

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;

// Initialize printer
const INIT = [ESC, 0x40];

// Text alignment
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
// const ALIGN_RIGHT = [ESC, 0x61, 0x02]; // Reserved for future use

// Text emphasis
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const DOUBLE_WIDTH_ON = [GS, 0x21, 0x11]; // double width + height
const DOUBLE_WIDTH_OFF = [GS, 0x21, 0x00];

// Line feed
const LF = [0x0a];
const CUT = [GS, 0x56, 0x00]; // Full cut (partial cut: 0x01)

// Separator line for 58mm (approximately 32 chars at standard width)
const SEPARATOR = "-".repeat(32);
const SEPARATOR_DOUBLE = "=".repeat(32);

/**
 * Convert string to byte array (ASCII encoding)
 * Note: Many thermal printers don't support extended Unicode.
 * Use "P" or "PHP" instead of "₱" to avoid garbling.
 */
function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i));
  }
  return bytes;
}

/**
 * Pad a line to fit 58mm width (32 chars)
 * For left-right justified lines like "Item name         P100.00"
 */
function padLine(left: string, right: string, width = 32): string {
  const totalLen = left.length + right.length;
  if (totalLen >= width) {
    // Truncate left if too long
    const maxLeft = width - right.length - 1;
    return left.substring(0, maxLeft) + " " + right;
  }
  const spaces = width - totalLen;
  return left + " ".repeat(spaces) + right;
}

/**
 * Wrap long text to fit 58mm width
 */
function wrapText(text: string, width = 32): string[] {
  const lines: string[] = [];
  let current = "";
  const words = text.split(" ");
  
  for (const word of words) {
    if ((current + word).length > width) {
      if (current) lines.push(current.trim());
      current = word + " ";
    } else {
      current += word + " ";
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

interface CoffeeOrderItem {
  name: string;
  option: string | null;
  quantity: number;
  price: number;
}

interface CoffeeOrder {
  orderId: string;
  items: CoffeeOrderItem[];
  subtotal: number;
  discountType: string | null;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  timestamp: string;
}

/**
 * Generate ESC/POS bytes for Coffee receipt
 */
export function generateCoffeeReceipt(order: CoffeeOrder): Uint8Array {
  const bytes: number[] = [];
  
  // Initialize
  bytes.push(...INIT);
  
  // Header - centered, double size
  bytes.push(...ALIGN_CENTER);
  bytes.push(...DOUBLE_WIDTH_ON);
  bytes.push(...BOLD_ON);
  bytes.push(...textToBytes("ONEFAITH"));
  bytes.push(...LF);
  bytes.push(...textToBytes("COFFEE"));
  bytes.push(...LF);
  bytes.push(...DOUBLE_WIDTH_OFF);
  bytes.push(...BOLD_OFF);
  bytes.push(...LF);
  
  // Timestamp and Order ID - centered, normal size
  bytes.push(...textToBytes(order.timestamp));
  bytes.push(...LF);
  bytes.push(...BOLD_ON);
  bytes.push(...textToBytes(`Order: ${order.orderId}`));
  bytes.push(...BOLD_OFF);
  bytes.push(...LF);
  bytes.push(...textToBytes(SEPARATOR_DOUBLE));
  bytes.push(...LF);
  
  // Items - left aligned
  bytes.push(...ALIGN_LEFT);
  
  for (const item of order.items) {
    // Item name with option
    const itemName = item.option ? `${item.name} (${item.option})` : item.name;
    const wrappedName = wrapText(itemName, 32);
    for (const line of wrappedName) {
      bytes.push(...textToBytes(line));
      bytes.push(...LF);
    }
    
    // Quantity x Price = Line Total
    const qtyPrice = `  ${item.quantity} x P${item.price.toFixed(2)}`;
    const lineTotal = `P${(item.quantity * item.price).toFixed(2)}`;
    bytes.push(...textToBytes(padLine(qtyPrice, lineTotal)));
    bytes.push(...LF);
  }
  
  bytes.push(...textToBytes(SEPARATOR));
  bytes.push(...LF);
  
  // Subtotal
  bytes.push(...textToBytes(padLine("Subtotal:", `P${order.subtotal.toFixed(2)}`)));
  bytes.push(...LF);
  
  // Discount if any
  if (order.discountType && order.discountAmount > 0) {
    bytes.push(...textToBytes(padLine(`Discount (${order.discountType}):`, `-P${order.discountAmount.toFixed(2)}`)));
    bytes.push(...LF);
  }
  
  // Total - bold
  bytes.push(...BOLD_ON);
  bytes.push(...textToBytes(padLine("TOTAL:", `P${order.total.toFixed(2)}`)));
  bytes.push(...BOLD_OFF);
  bytes.push(...LF);
  bytes.push(...textToBytes(SEPARATOR_DOUBLE));
  bytes.push(...LF);
  
  // Payment details
  bytes.push(...textToBytes(padLine("Payment:", order.paymentMethod)));
  bytes.push(...LF);
  
  if (order.paymentMethod === "Cash" && order.cashReceived !== undefined) {
    bytes.push(...textToBytes(padLine("Cash:", `P${order.cashReceived.toFixed(2)}`)));
    bytes.push(...LF);
    if (order.change !== undefined && order.change > 0) {
      bytes.push(...textToBytes(padLine("Change:", `P${order.change.toFixed(2)}`)));
      bytes.push(...LF);
    }
  }
  
  bytes.push(...LF);
  
  // Footer - centered
  bytes.push(...ALIGN_CENTER);
  bytes.push(...textToBytes("Thank you!"));
  bytes.push(...LF);
  bytes.push(...textToBytes("Visit us again"));
  bytes.push(...LF);
  bytes.push(...LF);
  bytes.push(...LF);
  
  // Cut paper
  bytes.push(...CUT);
  
  return new Uint8Array(bytes);
}

interface CarwashOrderItem {
  serviceName: string;
  vehicle: string;
  quantity: number;
  price: number;
}

interface CarwashOrder {
  orderId: string;
  items: CarwashOrderItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  cashReceived?: number;
  change?: number;
  timestamp: string;
}

/**
 * Generate ESC/POS bytes for Carwash receipt
 */
export function generateCarwashReceipt(order: CarwashOrder): Uint8Array {
  const bytes: number[] = [];
  
  // Initialize
  bytes.push(...INIT);
  
  // Header - centered, double size
  bytes.push(...ALIGN_CENTER);
  bytes.push(...DOUBLE_WIDTH_ON);
  bytes.push(...BOLD_ON);
  bytes.push(...textToBytes("ONEFAITH"));
  bytes.push(...LF);
  bytes.push(...textToBytes("CARWASH"));
  bytes.push(...LF);
  bytes.push(...DOUBLE_WIDTH_OFF);
  bytes.push(...BOLD_OFF);
  bytes.push(...LF);
  
  // Timestamp and Order ID
  bytes.push(...textToBytes(order.timestamp));
  bytes.push(...LF);
  bytes.push(...BOLD_ON);
  bytes.push(...textToBytes(`Order: ${order.orderId}`));
  bytes.push(...BOLD_OFF);
  bytes.push(...LF);
  
  // Customer info if available
  if (order.customerName) {
    bytes.push(...textToBytes(`Customer: ${order.customerName}`));
    bytes.push(...LF);
  }
  if (order.customerPhone) {
    bytes.push(...textToBytes(`Phone: ${order.customerPhone}`));
    bytes.push(...LF);
  }
  
  bytes.push(...textToBytes(SEPARATOR_DOUBLE));
  bytes.push(...LF);
  
  // Items - left aligned
  bytes.push(...ALIGN_LEFT);
  
  for (const item of order.items) {
    // Service name
    const serviceName = `${item.serviceName} (${item.vehicle})`;
    const wrappedName = wrapText(serviceName, 32);
    for (const line of wrappedName) {
      bytes.push(...textToBytes(line));
      bytes.push(...LF);
    }
    
    // Quantity x Price = Line Total
    const qtyPrice = `  ${item.quantity} x P${item.price.toFixed(2)}`;
    const lineTotal = `P${(item.quantity * item.price).toFixed(2)}`;
    bytes.push(...textToBytes(padLine(qtyPrice, lineTotal)));
    bytes.push(...LF);
  }
  
  bytes.push(...textToBytes(SEPARATOR));
  bytes.push(...LF);
  
  // Total - bold
  bytes.push(...BOLD_ON);
  bytes.push(...textToBytes(padLine("TOTAL:", `P${order.total.toFixed(2)}`)));
  bytes.push(...BOLD_OFF);
  bytes.push(...LF);
  bytes.push(...textToBytes(SEPARATOR_DOUBLE));
  bytes.push(...LF);
  
  // Payment details
  bytes.push(...textToBytes(padLine("Payment:", order.paymentMethod)));
  bytes.push(...LF);
  
  if (order.paymentMethod === "Cash" && order.cashReceived !== undefined) {
    bytes.push(...textToBytes(padLine("Cash:", `P${order.cashReceived.toFixed(2)}`)));
    bytes.push(...LF);
    if (order.change !== undefined && order.change > 0) {
      bytes.push(...textToBytes(padLine("Change:", `P${order.change.toFixed(2)}`)));
      bytes.push(...LF);
    }
  }
  
  bytes.push(...LF);
  
  // Footer - centered
  bytes.push(...ALIGN_CENTER);
  bytes.push(...textToBytes("Thank you!"));
  bytes.push(...LF);
  bytes.push(...textToBytes("Drive safe"));
  bytes.push(...LF);
  bytes.push(...LF);
  bytes.push(...LF);
  
  // Cut paper
  bytes.push(...CUT);
  
  return new Uint8Array(bytes);
}

/**
 * Convert Uint8Array to Base64 for transmission
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
