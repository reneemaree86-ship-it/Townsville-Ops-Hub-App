import { jsPDF } from 'jspdf';
import { BUSINESS_INFO } from './pricingData';

const NAVY = [10, 25, 65];
const GOLD = [195, 160, 60];
const TEAL = [64, 185, 180];
const WHITE = [255, 255, 255];
const MID_GRAY = [150, 155, 165];
const DARK = [30, 35, 50];
const LIGHT_GRAY = [245, 246, 248];

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function serviceTypeLabel(v) {
  return (v || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function generateScopePDF(scope) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14;
  let y = 0;

  const ensureSpace = (needed) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 16;
    }
  };

  const sectionTitle = (label) => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(label, M, y);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(M, y + 1.5, M + 30, y + 1.5);
    y += 7;
  };

  const bulletList = (items) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    (items || []).forEach(item => {
      const lines = doc.splitTextToSize('• ' + item, W - M * 2 - 2);
      ensureSpace(lines.length * 4.5 + 1);
      doc.text(lines, M + 2, y);
      y += lines.length * 4.5 + 1;
    });
    y += 3;
  };

  // ── Header ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 40, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("Renee's Cleaning Services", M, 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEAL);
  doc.text('Reliable • Detailed • Spotless', M, 21);
  doc.setTextColor(200, 205, 215);
  doc.setFontSize(7.5);
  doc.text(`ABN: ${BUSINESS_INFO.abn}  |  ${BUSINESS_INFO.email}`, M, 28);
  doc.text(`${BUSINESS_INFO.website}`, M, 33);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GOLD);
  doc.text('SCOPE OF WORK', W - M, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 205, 215);
  doc.text(`Status: ${(scope.status || 'draft').toUpperCase()}`, W - M, 26, { align: 'right' });
  doc.text(`Date: ${formatDate(scope.service_date)}`, W - M, 32, { align: 'right' });

  y = 48;

  // ── Client / Job details ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('CLIENT', M, y);
  doc.text('SERVICE DETAILS', W / 2, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(scope.client_name || '—', M, y);
  doc.text(`Type: ${serviceTypeLabel(scope.service_type)}`, W / 2, y);
  y += 5;
  doc.setTextColor(...MID_GRAY);
  if (scope.service_address) { doc.text(scope.service_address, M, y); }
  doc.setTextColor(...DARK);
  doc.text(`Frequency: ${serviceTypeLabel(scope.frequency)}`, W / 2, y);
  y += 5;
  if (scope.estimated_hours) doc.text(`Est. Hours: ${scope.estimated_hours}`, W / 2, y);
  y += 5;
  const priceLabel = scope.pricing_type === 'fixed'
    ? `Agreed Price: $${(scope.agreed_price || 0).toFixed(2)}`
    : `Hourly Rate: $${(scope.hourly_rate || 0).toFixed(2)}/hr`;
  doc.text(priceLabel, W / 2, y);
  y += 10;

  if ((scope.tasks_included || []).length) {
    sectionTitle('TASKS INCLUDED');
    bulletList(scope.tasks_included);
  }
  if ((scope.addons_selected || []).length) {
    sectionTitle('OPTIONAL ADD-ONS');
    bulletList(scope.addons_selected);
  }
  if ((scope.tasks_excluded || []).length) {
    sectionTitle('EXCLUDED FROM THIS SERVICE');
    bulletList(scope.tasks_excluded);
  }
  if (scope.special_instructions) {
    sectionTitle('SPECIAL INSTRUCTIONS / CLIENT REQUESTS');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(scope.special_instructions, W - M * 2);
    ensureSpace(lines.length * 4.5 + 4);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 4;
  }
  if (scope.cleaner_notes) {
    sectionTitle('CLEANER NOTES');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(scope.cleaner_notes, W - M * 2);
    ensureSpace(lines.length * 4.5 + 4);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 4;
  }
  if (scope.terms_conditions) {
    sectionTitle('TERMS, CONDITIONS & PAYMENT');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MID_GRAY);
    const lines = doc.splitTextToSize(scope.terms_conditions, W - M * 2);
    ensureSpace(lines.length * 4 + 4);
    doc.text(lines, M, y);
    y += lines.length * 4 + 4;
    doc.setFontSize(7.5);
    doc.text(`Account Name: ${BUSINESS_INFO.account_name}  |  BSB: ${BUSINESS_INFO.bsb}  |  Account No: ${BUSINESS_INFO.account_number}  |  PayID: ${BUSINESS_INFO.payid}`, M, y);
    y += 8;
  }

  // ── Acknowledgement ──
  ensureSpace(34);
  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(M, y, W - M * 2, 28, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('CLIENT ACKNOWLEDGEMENT', M + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text('I acknowledge and approve the above scope of work.', M + 4, y + 13);
  if (scope.client_acknowledged) {
    doc.setTextColor(50, 150, 90);
    doc.setFont('helvetica', 'bold');
    doc.text(`APPROVED by ${scope.client_acknowledgement_name || scope.client_name} on ${formatDate(scope.client_acknowledgement_date)}`, M + 4, y + 20);
  } else {
    doc.setTextColor(...MID_GRAY);
    doc.text('Signature: ______________________________     Date: ____________', M + 4, y + 21);
  }
  y += 34;

  // ── Footer ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 285, W, 12, 'F');
  doc.setTextColor(...TEAL);
  doc.setFontSize(7.5);
  doc.text("Thank you for choosing Renee's Cleaning Services — Reliable • Detailed • Spotless", W / 2, 292, { align: 'center' });
  doc.setTextColor(140, 150, 170);
  doc.setFontSize(6.5);
  doc.text(BUSINESS_INFO.website + '  |  ' + BUSINESS_INFO.email, W / 2, 295, { align: 'center' });

  return doc;
}