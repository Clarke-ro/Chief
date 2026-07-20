import * as Clipboard from 'expo-clipboard';

/** Copy text to the system clipboard. Throws if the native module fails. */
export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
