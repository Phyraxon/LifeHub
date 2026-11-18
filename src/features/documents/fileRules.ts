export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const accepted = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

export function getDocumentFileError(name: string, mimeType: string, size: number): string | null {
  if (size <= 0) return 'Die Datei ist leer.';
  if (size > MAX_DOCUMENT_BYTES) return 'Dateien dürfen höchstens 20 MB groß sein.';
  const extension = name.slice(name.lastIndexOf('.')).toLocaleLowerCase();
  if (!accepted.has(extension)) return 'Erlaubt sind PDF, JPG, PNG und WEBP.';
  const expectedMime = extension === '.pdf' ? 'application/pdf' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : `image/${extension.slice(1)}`;
  if (mimeType && mimeType !== expectedMime) return 'Dateiendung und Dateityp stimmen nicht überein.';
  return null;
}
