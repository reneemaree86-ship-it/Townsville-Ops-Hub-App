import { base44 } from '@/api/base44Client';

// Uploads the generated PDF to hosted storage and opens the real URL.
// Using a real hosted URL (instead of blob:/data: URIs) is required because
// blob/data URIs are blocked from downloading inside the app's embedded
// preview WebView — real URLs are handled reliably everywhere.
export async function openPdfInNewWindow(doc, filename = 'document.pdf') {
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  window.open(file_url, '_blank');
}