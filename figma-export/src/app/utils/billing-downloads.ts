import { jsPDF } from 'jspdf';
import type { BillingHistoryRecord } from './payment-api';

const BRAND_NAME = 'AMTDISTRO';

function drawPdfImprint(pdf: jsPDF) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(72);
  pdf.setTextColor(242, 242, 242);
  pdf.text(BRAND_NAME, 298, 430, { align: 'center', angle: 24 });
}

export function getBillingPaymentDate(payment: BillingHistoryRecord) {
  return payment.paidAt || payment.createdAt;
}

export function isPayoutHistoryRecord(payment: BillingHistoryRecord) {
  return payment.type === 'payout';
}

export function getBillingPlanLabel(payment: BillingHistoryRecord) {
  if (isPayoutHistoryRecord(payment)) {
    return 'Revenue Payout';
  }

  if (payment.plan === 'partner') return 'Partner';
  if (payment.plan === 'super_artist') return 'Super Artist';
  if (payment.plan === 'release') return 'Release Distribution';
  return 'Artist';
}

export function formatBillingCurrency(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatBillingPdfCurrency(amount: number) {
  return `NGN ${amount.toLocaleString()}`;
}

export function formatBillingHistoryAmount(payment: BillingHistoryRecord) {
  return `${isPayoutHistoryRecord(payment) ? '-' : ''}${formatBillingCurrency(payment.amount)}`;
}

function formatBillingPdfAmount(payment: BillingHistoryRecord) {
  return `${isPayoutHistoryRecord(payment) ? '-' : ''}${formatBillingPdfCurrency(payment.amount)}`;
}

export function getBillingCounterpartyDetails(payment: BillingHistoryRecord) {
  if (!isPayoutHistoryRecord(payment) || !payment.payoutAccount) {
    return '';
  }

  return `${payment.payoutAccount.bankName} · ${payment.payoutAccount.accountNumber}`;
}

function getBillingStatusLabel(payment: BillingHistoryRecord) {
  if (payment.status === 'pending') {
    return 'Pending';
  }

  return payment.status === 'completed'
    ? (isPayoutHistoryRecord(payment) ? 'Requested' : 'Paid')
    : 'Failed';
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function downloadBillingStatementCsv(payments: BillingHistoryRecord[], fileName: string) {
  const headers = ['Period', 'Reference', 'Description', 'Type', 'Amount', 'Currency', 'Status', 'Payment Date'];
  const rows = payments.map((payment) => [
    new Date(getBillingPaymentDate(payment)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    payment.reference,
    payment.description,
    getBillingPlanLabel(payment),
    `${isPayoutHistoryRecord(payment) ? '-' : ''}${payment.amount.toString()}`,
    payment.currency,
    getBillingStatusLabel(payment),
    new Date(getBillingPaymentDate(payment)).toISOString(),
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
  downloadBlob(csvContent, fileName, 'text/csv');
}

export function downloadBillingStatementPdf(payments: BillingHistoryRecord[], fileName: string, title = 'AMTDISTRO Billing Statement') {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  const pageWidth = 595.28;
  const right = pageWidth - 40;
  let top = 48;
  drawPdfImprint(pdf);

  const ensurePageSpace = (neededHeight: number) => {
    if (top + neededHeight <= 780) {
      return;
    }

    pdf.addPage();
    drawPdfImprint(pdf);
    top = 48;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(255, 107, 0);
  pdf.text(BRAND_NAME, left, top);

  top += 16;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(20, 20, 20);
  pdf.text(title, left, top);

  top += 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated ${new Date().toLocaleString()}`, left, top);

  top += 26;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(left, top, right, top);
  top += 20;

  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(10);

  const totalAmount = payments.reduce((sum, payment) => sum + (isPayoutHistoryRecord(payment) ? -payment.amount : payment.amount), 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Entries: ${payments.length}`, left, top);
  pdf.text(`Net: ${totalAmount < 0 ? '-' : ''}${formatBillingPdfCurrency(Math.abs(totalAmount))}`, left + 160, top);

  top += 26;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Reference', left, top);
  pdf.text('Type', 170, top);
  pdf.text('Amount', 275, top);
  pdf.text('Status', 360, top);
  pdf.text('Paid At', 430, top);

  top += 8;
  pdf.line(left, top, right, top);
  top += 18;

  payments.forEach((payment) => {
    ensurePageSpace(42);
    pdf.setFont('helvetica', 'normal');
    pdf.text(payment.reference.slice(0, 18), left, top);
    pdf.text(getBillingPlanLabel(payment), 170, top);
    pdf.text(formatBillingPdfAmount(payment), 275, top);
    pdf.text(getBillingStatusLabel(payment), 360, top);
    pdf.text(new Date(getBillingPaymentDate(payment)).toLocaleDateString(), 430, top);

    top += 12;
    pdf.setTextColor(95, 95, 95);
    const descriptionLines = pdf.splitTextToSize(payment.description, right - left);
    pdf.text(descriptionLines.slice(0, 2), left, top);
    pdf.setTextColor(20, 20, 20);
    top += 20;
    pdf.setDrawColor(235, 235, 235);
    pdf.line(left, top, right, top);
    top += 16;
  });

  pdf.save(fileName);
}

export function downloadBillingReceiptPdf(payment: BillingHistoryRecord) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 56;
  let top = 64;
  drawPdfImprint(pdf);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(255, 107, 0);
  pdf.text(BRAND_NAME, left, top);

  top += 16;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(20);
  pdf.text('AMTDISTRO Receipt', left, top);

  top += 20;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(90, 90, 90);
  pdf.text(isPayoutHistoryRecord(payment) ? 'Revenue payout request confirmation' : 'Subscription payment confirmation', left, top);

  top += 36;
  pdf.setDrawColor(225, 225, 225);
  pdf.line(left, top, 540, top);

  top += 28;
  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(11);

  const rows: Array<[string, string]> = [
    ['Reference', payment.reference],
    ['Type', getBillingPlanLabel(payment)],
    ['Description', payment.description],
    ['Amount', formatBillingPdfAmount(payment)],
    ['Currency', payment.currency],
    ['Status', getBillingStatusLabel(payment)],
    ['Method', payment.method],
    ...(payment.payoutAccount
      ? [
          ['Account Name', payment.payoutAccount.accountName],
          ['Bank Name', payment.payoutAccount.bankName],
          ['Account Number', payment.payoutAccount.accountNumber],
        ] as Array<[string, string]>
      : []),
    ['Paid At', new Date(getBillingPaymentDate(payment)).toLocaleString()],
  ];

  rows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, left, top);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, left + 110, top);
    top += 24;
  });

  top += 12;
  pdf.setDrawColor(225, 225, 225);
  pdf.line(left, top, 540, top);
  top += 28;
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(10);
  pdf.text('Generated from your AMTDISTRO payment history.', left, top);

  pdf.save(`receipt-${payment.reference}.pdf`);
}