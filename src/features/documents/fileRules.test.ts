import { describe, expect, it } from 'vitest';
import { getDocumentFileError, MAX_DOCUMENT_BYTES } from './fileRules';

describe('document upload rules', () => {
  it('accepts supported formats and rejects unsupported or oversized files', () => {
    expect(getDocumentFileError('receipt.pdf', 'application/pdf', 1200)).toBeNull();
    expect(getDocumentFileError('photo.webp', 'image/webp', 1200)).toBeNull();
    expect(getDocumentFileError('archive.zip', 'application/zip', 1200)).toContain('PDF');
    expect(getDocumentFileError('large.pdf', 'application/pdf', MAX_DOCUMENT_BYTES + 1)).toContain('20 MB');
  });

  it('checks MIME type when the browser provides it', () => {
    expect(getDocumentFileError('fake.pdf', 'image/png', 500)).toContain('stimmen nicht überein');
    expect(getDocumentFileError('file.jpg', '', 500)).toBeNull();
  });
});
