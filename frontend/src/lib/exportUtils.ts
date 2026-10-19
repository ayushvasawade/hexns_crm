import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Quotation, Invoice, Expense, CompanySettings, Client } from '../types/crm';
import { formatINR, formatDate, numberToWordsINR } from './formatters';

/**
 * Generates a branded printable and downloadable PDF for Quotations
 */
export function generateQuotationPDF(quotation: Quotation, settings: CompanySettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Primary Colors
  const primaryColor = [23, 23, 23]; // #171717
  const mutedColor = [115, 115, 115]; // #737373
  const lightBg = [249, 250, 251]; // #F9FAFB

  // Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.legalEntityName || "HEXNS MEDIAWORKS LLP", 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`${settings.registeredAddress}, ${settings.city}, ${settings.state} - ${settings.pinCode}`, 14, 25);
  doc.text(`GSTIN: ${settings.gstin} | PAN: ${settings.pan} | Email: ${settings.corporateEmail}`, 14, 29);

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // Document Title & Reference
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("COMMERCIAL QUOTATION", 14, 42);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Quotation #: ${quotation.quotationNumber}`, 140, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(quotation.quotationDate)}`, 140, 47);
  doc.text(`Valid Until: ${formatDate(quotation.validUntil)}`, 140, 52);
  doc.text(`Place of Supply: ${quotation.placeOfSupply}`, 140, 57);

  // Client Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 46, 110, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("QUOTED TO:", 18, 52);
  doc.text(quotation.clientName, 18, 57);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Project: ${quotation.projectTitle}`, 18, 62);
  doc.text(`Lead Account Exec: ${quotation.salesExecutive}`, 18, 67);

  // Table of Items
  const tableRows = quotation.lineItems.map((it, idx) => [
    idx + 1,
    it.serviceName + (it.description ? `\n${it.description}` : ''),
    it.sacCode || '998311',
    `${it.quantity} ${it.billingUnit}`,
    formatINR(it.negotiatedUnitPrice),
    formatINR(it.taxableAmount),
    `${it.gstRate}%`,
    formatINR(it.lineTotal)
  ]);

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Service Deliverable', 'SAC', 'Qty / Unit', 'Rate (₹)', 'Taxable (₹)', 'GST', 'Amount (₹)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [23, 23, 23]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 64 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 22, halign: 'right' }
    }
  });

  // Totals Section
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = 120;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Taxable Value:", totalsX, finalY);
  doc.text(formatINR(quotation.totalTaxableAmount), 196, finalY, { align: 'right' });

  if (quotation.documentDiscountAmount > 0) {
    doc.text("Document Discount:", totalsX, finalY + 5);
    doc.text(`- ${formatINR(quotation.documentDiscountAmount)}`, 196, finalY + 5, { align: 'right' });
  }

  if (quotation.isInterState) {
    doc.text("Integrated GST (18% IGST):", totalsX, finalY + 10);
    doc.text(formatINR(quotation.igstAmount), 196, finalY + 10, { align: 'right' });
  } else {
    doc.text("Central GST (9% CGST):", totalsX, finalY + 10);
    doc.text(formatINR(quotation.cgstAmount), 196, finalY + 10, { align: 'right' });
    doc.text("State GST (9% SGST):", totalsX, finalY + 15);
    doc.text(formatINR(quotation.sgstAmount), 196, finalY + 15, { align: 'right' });
  }

  const grandTotalY = finalY + 22;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(totalsX - 2, grandTotalY - 4, 78, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Grand Total (INR):", totalsX, grandTotalY + 2);
  doc.text(formatINR(quotation.grandTotal), 196, grandTotalY + 2, { align: 'right' });

  // Amount in words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Amount in Words: ${numberToWordsINR(quotation.grandTotal)}`, 14, grandTotalY + 12);

  // Terms and Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Commercial Terms & Payment Conditions:", 14, grandTotalY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  const splitTerms = doc.splitTextToSize(quotation.termsAndConditions || settings.quotationTerms || "Standard terms apply.", 182);
  doc.text(splitTerms, 14, grandTotalY + 25);

  // Bank Info Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(229, 231, 235);
  doc.line(14, pageHeight - 22, 196, pageHeight - 22);
  doc.setFontSize(7.5);
  doc.text(`Payment remittance: ${settings.bank.bankName} | A/C: ${settings.bank.accountNumber} | IFSC: ${settings.bank.ifsc} | UPI: ${settings.bank.upiVpa}`, 14, pageHeight - 16);
  doc.text("This is an electronically generated quotation authorized by HEXNS MEDIAWORKS LLP.", 14, pageHeight - 11);

  doc.save(`${quotation.quotationNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`);
}

/**
 * Generates a branded printable and downloadable PDF for Tax Invoices
 */
export function generateInvoicePDF(invoice: Invoice, settings: CompanySettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [23, 23, 23];
  const mutedColor = [115, 115, 115];
  const lightBg = [249, 250, 251];

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.legalEntityName || "HEXNS MEDIAWORKS LLP", 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`${settings.registeredAddress}, ${settings.city}, ${settings.state} - ${settings.pinCode}`, 14, 25);
  doc.text(`GSTIN: ${settings.gstin} | PAN: ${settings.pan} | Email: ${settings.corporateEmail}`, 14, 29);

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 33, 196, 33);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TAX INVOICE", 14, 42);

  doc.setFontSize(9);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 140, 47);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 140, 52);
  doc.text(`Place of Supply: ${invoice.placeOfSupply}`, 140, 57);

  // Client Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 46, 110, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BILLED TO:", 18, 52);
  doc.text(invoice.clientName, 18, 57);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Project: ${invoice.projectTitle}`, 18, 62);
  if (invoice.quotationNumber) {
    doc.text(`Ref Quotation: ${invoice.quotationNumber}`, 18, 67);
  }

  // Items
  const tableRows = invoice.lineItems.map((it, idx) => [
    idx + 1,
    it.serviceName,
    it.sacCode || '998311',
    `${it.quantity} ${it.billingUnit}`,
    formatINR(it.negotiatedUnitPrice),
    formatINR(it.taxableAmount),
    `${it.gstRate}%`,
    formatINR(it.lineTotal)
  ]);

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Description of Services', 'SAC', 'Qty / Unit', 'Rate (₹)', 'Taxable (₹)', 'GST', 'Amount (₹)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [23, 23, 23]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 64 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 22, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = 120;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Total Taxable Value:", totalsX, finalY);
  doc.text(formatINR(invoice.totalTaxableAmount), 196, finalY, { align: 'right' });

  if (invoice.isInterState) {
    doc.text("Integrated GST (18% IGST):", totalsX, finalY + 5);
    doc.text(formatINR(invoice.igstAmount), 196, finalY + 5, { align: 'right' });
  } else {
    doc.text("Central GST (9% CGST):", totalsX, finalY + 5);
    doc.text(formatINR(invoice.cgstAmount), 196, finalY + 5, { align: 'right' });
    doc.text("State GST (9% SGST):", totalsX, finalY + 10);
    doc.text(formatINR(invoice.sgstAmount), 196, finalY + 10, { align: 'right' });
  }

  const grandTotalY = finalY + 17;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(totalsX - 2, grandTotalY - 4, 78, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Total Invoice Value:", totalsX, grandTotalY + 2);
  doc.text(formatINR(invoice.grandTotal), 196, grandTotalY + 2, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Amount Received:", totalsX, grandTotalY + 7);
  doc.text(formatINR(invoice.amountPaid), 196, grandTotalY + 7, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(invoice.balanceDue > 0 ? 220 : 21, invoice.balanceDue > 0 ? 38 : 128, invoice.balanceDue > 0 ? 38 : 61);
  doc.text("Balance Outstanding:", totalsX, grandTotalY + 12);
  doc.text(formatINR(invoice.balanceDue), 196, grandTotalY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Amount in Words: ${numberToWordsINR(invoice.grandTotal)}`, 14, grandTotalY + 22);

  // Bank Info Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setDrawColor(229, 231, 235);
  doc.line(14, pageHeight - 22, 196, pageHeight - 22);
  doc.setFontSize(7.5);
  doc.text(`Remit to: ${settings.bank.bankName} | A/C: ${settings.bank.accountNumber} | IFSC: ${settings.bank.ifsc} | UPI: ${settings.bank.upiVpa}`, 14, pageHeight - 16);
  doc.text(`${settings.invoiceStatutoryNote || 'Tax payable under reverse charge: No.'}`, 14, pageHeight - 11);

  doc.save(`${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`);
}

/**
 * Generates a branded printable and downloadable PDF for Financial Reports
 */
export function generateReportPDF(
  reportTitle: string, 
  dateRange: string, 
  summaryData: Record<string, number | string>,
  tableHeaders: string[],
  tableRows: (string | number)[][],
  settings: CompanySettings
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text("HEXNS MEDIAWORKS LLP", 14, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(115, 115, 115);
  doc.text(`Financial Intelligence & Audit Report • Period: ${dateRange}`, 14, 24);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 28, 196, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(23, 23, 23);
  doc.text(reportTitle.toUpperCase(), 14, 37);

  // Summary Grid
  const summaryEntries = Object.entries(summaryData);
  let summaryY = 44;
  if (summaryEntries.length > 0) {
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 40, 182, 18, 2, 2, 'F');
    const colWidth = 182 / Math.min(4, summaryEntries.length);
    summaryEntries.slice(0, 4).forEach(([k, v], idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text(k, 18 + (idx * colWidth), 46);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(23, 23, 23);
      doc.text(String(v), 18 + (idx * colWidth), 53);
    });
    summaryY = 64;
  }

  // AutoTable
  autoTable(doc, {
    startY: summaryY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [23, 23, 23]
    }
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7.5);
  doc.setTextColor(115, 115, 115);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} by HEXNS Financial Core. Confidential.`, 14, pageHeight - 10);

  doc.save(`HEXNS_${reportTitle.replace(/[^a-zA-Z0-9-]/g, '_')}_Report.pdf`);
}

/**
 * Generates a real multi-worksheet Excel (.xlsx) workbook file download
 */
export function generateExcelWorkbook(
  reportName: string,
  sheets: {
    sheetName: string;
    headers: string[];
    rows: (string | number)[][];
  }[]
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, headers, rows }) => {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    const colWidths = headers.map((h, i) => {
      const maxColLen = Math.max(
        h.length,
        ...rows.map(r => (r[i] !== undefined && r[i] !== null ? String(r[i]).length : 0))
      );
      return { wch: Math.min(45, maxColLen + 4) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  });

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `HEXNS_${reportName.replace(/[^a-zA-Z0-9-]/g, '_')}_${dateStr}.xlsx`);
}
