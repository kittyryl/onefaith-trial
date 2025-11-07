// Utility to print a specific DOM element by id using an isolated iframe
// Benefits vs window.print():
// - Only prints the provided content (no overlays/backdrop)
// - Avoids global @media print hacks affecting the whole app
// - Clones current page <link rel="stylesheet"> and <style> tags so Tailwind styles apply
// - Sets 58mm page size for thermal printers

export type PrintOptions = {
  title?: string;
  pageWidthMm?: number; // default 58
  /** Delay before calling print to allow fonts/images to render */
  renderDelayMs?: number; // default 150
};

function cloneStyles(sourceDoc: Document, targetDoc: Document) {
  const head = targetDoc.head;
  // Clone link and style tags
  const nodes = sourceDoc.querySelectorAll('link[rel="stylesheet"], style');
  nodes.forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });
}

export async function printElementById(elementId: string, opts: PrintOptions = {}) {
  const { title = 'Receipt', pageWidthMm = 58, renderDelayMs = 150 } = opts;
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    console.warn(`[print] Element #${elementId} not found`);
    return;
  }

  // Create an off-DOM iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.warn('[print] iframe document not available');
    document.body.removeChild(iframe);
    return;
  }

  // Basic HTML skeleton
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body></body></html>`);
  doc.close();

  // Clone styles so Tailwind classes work in the iframe
  try {
    cloneStyles(document, doc);
  } catch (e) {
    console.warn('[print] Failed to clone styles, using minimal fallback styles', e);
  }

  // Add minimal print CSS: page size + reset margins
  const style = doc.createElement('style');
  style.textContent = `
    @media print {
      @page { size: ${pageWidthMm}mm auto; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; }
    }
    html, body { margin: 0; padding: 0; }
    /* Ensure content fits the paper width */
    .print-root { width: ${pageWidthMm}mm; }
  `;
  doc.head.appendChild(style);

  // Clone the receipt node into iframe
  const wrapper = doc.createElement('div');
  wrapper.className = 'print-root';
  wrapper.appendChild(sourceEl.cloneNode(true));
  doc.body.appendChild(wrapper);

  // Wait a bit for fonts/images to render
  await new Promise((r) => setTimeout(r, renderDelayMs));

  // Print and cleanup
  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } finally {
    // Remove iframe after a short delay to allow print dialog to open
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }
}
