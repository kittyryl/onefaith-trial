// RawBT integration for sending ESC/POS data to Bluetooth thermal printers on Android
// RawBT app: https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter

/**
 * Check if we're running on Android (useful for showing appropriate UI)
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Check if RawBT might be available
 * Note: We can't directly detect if RawBT is installed, but we can check Android
 */
export function canUseRawBT(): boolean {
  return isAndroid();
}

/**
 * Print ESC/POS data using RawBT via intent URL
 * 
 * RawBT accepts Base64-encoded data via intent:
 * intent://...#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end
 * 
 * @param base64Data - Base64 encoded ESC/POS bytes
 * @returns Promise that resolves when the intent is launched (doesn't guarantee printing success)
 */
export async function printViaRawBT(base64Data: string): Promise<void> {
  if (!canUseRawBT()) {
    throw new Error('RawBT is only available on Android devices');
  }

  // RawBT intent URL format
  // The base64 data is passed as the "host" part of the intent URL
  const intentUrl = `intent://${base64Data}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`;

  try {
    // Open the intent URL
    // This will launch RawBT if installed, or show "No app found" error
    window.location.href = intentUrl;
    
    // Small delay to let the intent fire
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('[RawBT] Failed to launch intent:', error);
    throw new Error('Failed to launch RawBT. Make sure the app is installed.');
  }
}

/**
 * Show installation instructions for RawBT
 */
export function getRawBTInstallInstructions(): string {
  return `
To use ESC/POS printing:

1. Install RawBT from Google Play Store
2. Open RawBT and pair with your Bluetooth printer
3. Set your printer as default in RawBT settings
4. Return here and try printing again

If RawBT fails to open, you can use the standard Print button as fallback.
  `.trim();
}

/**
 * Higher-level print function with error handling and user feedback
 * 
 * @param escposBytes - ESC/POS byte array (Uint8Array)
 * @param onSuccess - Callback when print intent is launched
 * @param onError - Callback when print fails
 */
export async function printWithRawBT(
  escposBytes: Uint8Array,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> {
  try {
    // Convert bytes to base64
    const base64 = bytesToBase64(escposBytes);
    
    // Launch RawBT
    await printViaRawBT(base64);
    
    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    if (onError) onError(err);
    return false;
  }
}

/**
 * Convert Uint8Array to Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
