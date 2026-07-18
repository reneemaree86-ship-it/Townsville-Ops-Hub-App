import { jsPDF } from 'jspdf';
import { BUSINESS_INFO } from './pricingData';

const NAVY = [10, 25, 65];
const GOLD = [195, 160, 60];
const TEAL = [64, 185, 180];
const WHITE = [255, 255, 255];
const LIGHT_GRAY = [245, 246, 248];
const MID_GRAY = [150, 155, 165];
const DARK = [30, 35, 50];

function formatCurrency(n) {
  return '$' + (Number(n) || 0).toFixed(2);
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generatePDF(doc_data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14; // margin
  const isInvoice = doc_data.type === 'invoice';
  const title = isInvoice ? 'INVOICE' : 'QUOTE';

  // ── Header background ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 48, 'F');

  // Business name
  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("Renee's Cleaning Services", M, 16);

  // Tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEAL);
  doc.text('Reliable • Detailed • Spotless', M, 22);

  // Business details (left)
  doc.setTextColor(200, 205, 215);
  doc.setFontSize(7.5);
  const bizLines = [
    `ABN: ${BUSINESS_INFO.abn}`,
    `Email: ${BUSINESS_INFO.email}`,
    `Web: ${BUSINESS_INFO.website}`,
    `Location: ${BUSINESS_INFO.location}`,
  ];
  let bY = 29;
  bizLines.forEach(l => { doc.text(l, M, bY); bY += 4.5; });

  // INVOICE / QUOTE title block (right)
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD);
  doc.text(title, W - M, 18, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 205, 215);
  const num = isInvoice ? doc_data.invoice_number : doc_data.quote_number;
  doc.text(`#${num || '—'}`, W - M, 25, { align: 'right' });

  const dateLabel = isInvoice ? 'Invoice Date' : 'Quote Date';
  const dateVal = isInvoice ? formatDate(doc_data.invoice_date) : formatDate(doc_data.quote_date);
  const dueLabelStr = isInvoice ? 'Due Date' : 'Expiry Date';
  const dueVal = isInvoice ? formatDate(doc_data.due_date) : formatDate(doc_data.expiry_date);
  doc.text(`${dateLabel}: ${dateVal}`, W - M, 31, { align: 'right' });
  doc.text(`${dueLabelStr}: ${dueVal}`, W - M, 36, { align: 'right' });
  if (isInvoice) {
    const statusColors = { paid: [50, 180, 100], overdue: [220, 60, 60], unpaid: [220, 140, 30], partially_paid: [100, 150, 220] };
    const sc = statusColors[doc_data.payment_status] || [150, 150, 150];
    doc.setFillColor(...sc);
    doc.roundedRect(W - M - 30, 39, 30, 7, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const statusLabel = (doc_data.payment_status || 'unpaid').replace('_', ' ').toUpperCase();
    doc.text(statusLabel, W - M - 15, 44, { align: 'center' });
  }

  // ── Client block ──
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('BILL TO', M, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(M, y + 1, M + 30, y + 1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(doc_data.client_name || '—', M, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...MID_GRAY);
  let cy = y + 13;
  if (doc_data.client_address) { doc.text(doc_data.client_address, M, cy); cy += 5; }
  if (doc_data.client_email) { doc.text(doc_data.client_email, M, cy); cy += 5; }
  if (doc_data.client_phone) { doc.text(doc_data.client_phone, M, cy); cy += 5; }

  // Job address
  if (doc_data.job_address && doc_data.job_address !== doc_data.client_address) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('JOB ADDRESS', W / 2, y, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MID_GRAY);
    doc.text(doc_data.job_address, W / 2, y + 7);
  }

  y = Math.max(cy, y + 35) + 4;

  // ── Line items table ──

  // Table header
  doc.setFillColor(...NAVY);
  doc.rect(M, y, W - M * 2, 8, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DESCRIPTION', M + 2, y + 5.5);
  doc.text('QTY', W - 58, y + 5.5, { align: 'right' });
  doc.text('RATE', W - 38, y + 5.5, { align: 'right' });
  doc.text('AMOUNT', W - M, y + 5.5, { align: 'right' });

  y += 8;
  const items = doc_data.line_items || [];
  items.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(M, y, W - M * 2, 7, 'F');
    }
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const desc = item.description || '';
    doc.text(desc.length > 55 ? desc.substring(0, 52) + '…' : desc, M + 2, y + 5);
    doc.text(String(item.qty || 1), W - 58, y + 5, { align: 'right' });
    doc.text(formatCurrency(item.unit_price), W - 38, y + 5, { align: 'right' });
    doc.text(formatCurrency(item.total), W - M, y + 5, { align: 'right' });
    y += 7;
  });

  // ── Service description ──
  if (doc_data.service_description) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('SERVICE DESCRIPTION', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    const descLines = doc.splitTextToSize(doc_data.service_description, W - M * 2);
    doc.text(descLines.slice(0, 6), M, y + 5);
    y += 5 + Math.min(descLines.length, 6) * 4.5 + 3;
  }

  // ── Totals ──
  y += 4;
  const totalsX = W - M - 60;

  const addTotalRow = (label, value, bold = false, color = DARK) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9 : 8.5);
    doc.setTextColor(...color);
    doc.text(label, totalsX, y);
    doc.text(formatCurrency(value), W - M, y, { align: 'right' });
    y += 6;
  };

  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(totalsX - 2, y - 2, W - M, y - 2);

  addTotalRow('Subtotal', doc_data.subtotal);
  if (doc_data.travel_fee > 0) addTotalRow('Travel Fee', doc_data.travel_fee);
  if (doc_data.discount_amount > 0) addTotalRow('Discount', -Math.abs(doc_data.discount_amount || 0), false, [200, 80, 80]);
  if (doc_data.gst_enabled) addTotalRow('GST (10%)', doc_data.gst_amount);

  // Total box
  doc.setFillColor(...NAVY);
  doc.roundedRect(totalsX - 4, y - 1, W - M - totalsX + 4, 10, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', totalsX + 2, y + 6.5);
  doc.text(formatCurrency(doc_data.total), W - M - 1, y + 6.5, { align: 'right' });
  y += 14;

  if (isInvoice && doc_data.amount_paid > 0) {
    addTotalRow('Amount Paid', doc_data.amount_paid, false, [50, 160, 90]);
    doc.setFillColor(230, 248, 240);
    doc.roundedRect(totalsX - 4, y - 1, W - M - totalsX + 4, 9, 1.5, 1.5, 'F');
    doc.setTextColor(30, 120, 80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BALANCE DUE', totalsX + 2, y + 5.5);
    doc.text(formatCurrency(doc_data.balance_due), W - M - 1, y + 5.5, { align: 'right' });
    y += 12;
  }

  // ── Payment details (invoice only) ──
  if (isInvoice) {
    y += 4;
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(M, y, 80, 38, 2, 2, 'F');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PAYMENT DETAILS', M + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text('Account Name: ' + BUSINESS_INFO.account_name, M + 4, y + 12);
    doc.text('BSB: ' + BUSINESS_INFO.bsb, M + 4, y + 17);
    doc.text('Account No: ' + BUSINESS_INFO.account_number, M + 4, y + 22);
    doc.text('PayID: ' + BUSINESS_INFO.payid, M + 4, y + 27);
    if (doc_data.payment_method) {
      doc.text('Payment Method: ' + doc_data.payment_method.replace('_', ' ').toUpperCase(), M + 4, y + 32);
    }
  }

  // ── Notes ──
  const notes = doc_data.notes || doc_data.job_notes;
  if (notes) {
    const notesX = isInvoice ? M + 86 : M;
    const notesW = isInvoice ? W - M - 86 - M : W - M * 2;
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(notesX, y, notesW, 28, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('NOTES', notesX + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(notes, notesW - 8);
    doc.text(lines.slice(0, 3), notesX + 4, y + 12);
  }

  // ── Footer ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 285, W, 12, 'F');
  doc.setTextColor(...TEAL);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text("Thank you for choosing Renee's Cleaning Services — Reliable • Detailed • Spotless", W / 2, 292, { align: 'center' });
  doc.setTextColor(140, 150, 170);
  doc.setFontSize(6.5);
  doc.text(BUSINESS_INFO.website + '  |  ' + BUSINESS_INFO.email, W / 2, 295, { align: 'center' });

  return doc;
}