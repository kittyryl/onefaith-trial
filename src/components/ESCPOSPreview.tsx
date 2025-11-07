// Visual preview component for ESC/POS thermal receipts
// Simulates 58mm thermal printer output in the browser

import { LuX } from "react-icons/lu";

interface ESCPOSPreviewProps {
  bytes: Uint8Array;
  onClose: () => void;
}

// ESC/POS command constants for parsing
const ESC = 0x1b;
const GS = 0x1d;

interface ParsedLine {
  text: string;
  align: "left" | "center" | "right";
  bold: boolean;
  doubleSize: boolean;
}

/**
 * Parse ESC/POS bytes into styled text lines for display
 */
function parseESCPOS(bytes: Uint8Array): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let currentText = "";
  let currentAlign: "left" | "center" | "right" = "left";
  let currentBold = false;
  let currentDoubleSize = false;

  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];

    // Check for ESC sequences
    if (byte === ESC && i + 1 < bytes.length) {
      const cmd = bytes[i + 1];

      // Alignment (ESC a n)
      if (cmd === 0x61 && i + 2 < bytes.length) {
        const alignValue = bytes[i + 2];
        if (alignValue === 0x00) currentAlign = "left";
        else if (alignValue === 0x01) currentAlign = "center";
        else if (alignValue === 0x02) currentAlign = "right";
        i += 3;
        continue;
      }

      // Bold (ESC E n)
      if (cmd === 0x45 && i + 2 < bytes.length) {
        currentBold = bytes[i + 2] === 0x01;
        i += 3;
        continue;
      }

      // Initialize (ESC @)
      if (cmd === 0x40) {
        i += 2;
        continue;
      }

      i += 2;
      continue;
    }

    // Check for GS sequences
    if (byte === GS && i + 1 < bytes.length) {
      const cmd = bytes[i + 1];

      // Text size (GS ! n)
      if (cmd === 0x21 && i + 2 < bytes.length) {
        const sizeValue = bytes[i + 2];
        currentDoubleSize = sizeValue !== 0x00;
        i += 3;
        continue;
      }

      // Cut (GS V m)
      if (cmd === 0x56) {
        i += 3;
        continue;
      }

      i += 2;
      continue;
    }

    // Line feed
    if (byte === 0x0a) {
      if (currentText) {
        lines.push({
          text: currentText,
          align: currentAlign,
          bold: currentBold,
          doubleSize: currentDoubleSize,
        });
        currentText = "";
      } else {
        // Empty line
        lines.push({
          text: "",
          align: currentAlign,
          bold: false,
          doubleSize: false,
        });
      }
      i++;
      continue;
    }

    // Regular ASCII character
    if (byte >= 0x20 && byte <= 0x7e) {
      currentText += String.fromCharCode(byte);
    }

    i++;
  }

  // Add any remaining text
  if (currentText) {
    lines.push({
      text: currentText,
      align: currentAlign,
      bold: currentBold,
      doubleSize: currentDoubleSize,
    });
  }

  return lines;
}

export default function ESCPOSPreview({ bytes, onClose }: ESCPOSPreviewProps) {
  const lines = parseESCPOS(bytes);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="bg-gray-800 text-white p-4 rounded-t-lg flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold">ESC/POS Preview</h3>
            <p className="text-xs text-gray-300">58mm Thermal Receipt</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <LuX size={24} />
          </button>
        </div>

        {/* Thermal paper simulation - scrollable */}
        <div className="p-4 overflow-y-auto flex-1">
          <div
            className="bg-white shadow-lg border border-gray-300 mx-auto max-w-full"
            style={{ width: "min(58mm, 100%)" }}
          >
            {/* Receipt content */}
            <div className="p-2 font-mono text-xs leading-tight">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`wrap-break-word ${
                    line.align === "center"
                      ? "text-center"
                      : line.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                  style={{
                    fontWeight: line.bold ? "bold" : "normal",
                    fontSize: line.doubleSize ? "1.5em" : "0.75rem",
                    lineHeight: line.doubleSize ? "1.2" : "1.4",
                    overflowWrap: "break-word",
                    wordBreak: "break-all",
                  }}
                >
                  {line.text || "\u00A0"}
                </div>
              ))}
            </div>
          </div>

          {/* Info footer */}
          <div className="mt-4 text-xs text-gray-600 text-center">
            <p>This is a preview of the ESC/POS output.</p>
            <p className="mt-1">
              Actual print may vary slightly by printer model.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 rounded-b-lg shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-800 text-white p-3 rounded-lg font-semibold transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
