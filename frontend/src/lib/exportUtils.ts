
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Quotation, Invoice, CompanySettings } from '../types/crm';
import { formatINRWithDecimals, formatDate, numberToWordsINR } from './formatters';
import { PDF_FONT, registerPdfFonts } from './pdfFonts';



/**

 * Generates a branded printable and downloadable PDF for Quotations

 */

/**
 * Draws the authentic vector letterhead header & footer on a jsPDF document
 * Modeled from Hexns Letter Head (1).pdf
 */
function drawLetterheadHeaderAndFooter(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Header: Logo Text & Visual Mark
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 132, 255); // #0084FF
  doc.text("HEXNS", 14, 18);

  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 32, 36);
  doc.text("Mediaworks", 14.2, 23);

  // Top Divider Line
  doc.setDrawColor(28, 32, 36);
  doc.setLineWidth(0.4);
  doc.line(14, 27, pageWidth - 14, 27);

  // Footer: Bottom Divider Line
  doc.setDrawColor(28, 32, 36);
  doc.setLineWidth(0.4);
  doc.line(14, pageHeight - 32, pageWidth - 14, pageHeight - 32);

  // Company Name & LLPIN
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 32, 36);
  doc.text("Hexns Mediaworks LLP | LLPIN: ACR-0880", pageWidth / 2, pageHeight - 27, { align: 'center' });

  // Registered Office
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(28, 32, 36);
  doc.text("Registered Office: Near Vasant Bahar Road, New Shahupuri, Kolhapur – 416002, Maharashtra", pageWidth / 2, pageHeight - 23, { align: 'center' });

  // Contacts
  doc.text("+91 90491 02142 | +91 98220 02142   admin@hexnsmedia.com   www.hexnsmedia.com", pageWidth / 2, pageHeight - 19, { align: 'center' });

  // Thin Sub-Divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 40, pageHeight - 15.5, pageWidth / 2 + 40, pageHeight - 15.5);

  // Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Disclaimer: This communication is confidential and intended only for the recipient.", pageWidth / 2, pageHeight - 12.5, { align: 'center' });
  doc.text("Unauthorized use or disclosure is strictly prohibited.", pageWidth / 2, pageHeight - 9.5, { align: 'center' });
}

export function generateQuotationPDF(quotation: Quotation, _settings: CompanySettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register embedded fonts supporting Unicode Rupee symbol (U+20B9)
  registerPdfFonts(doc);

  // Primary Colors
  const primaryColor = [23, 23, 23]; // #171717
  const mutedColor = [115, 115, 115]; // #737373
  const lightBg = [249, 250, 251]; // #F9FAFB
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = 14;
  const footerReserve = 36;

  // Apply Letterhead Page Artwork (Page 1)
  drawLetterheadHeaderAndFooter(doc);

  // Document Title & Reference
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("COMMERCIAL QUOTATION", 14, 36);

  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'bold');
  doc.text(`Quotation #: ${quotation.quotationNumber}`, 140, 36);
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Date: ${formatDate(quotation.quotationDate)}`, 140, 41);
  doc.text(`Valid Until: ${formatDate(quotation.validUntil)}`, 140, 46);
  doc.text(`Place of Supply: ${quotation.placeOfSupply}`, 140, 51);

  // Client Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 40, 110, 26, 2, 2, 'F');
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("QUOTED TO:", 18, 46);
  doc.text(quotation.clientName, 18, 51);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Project: ${quotation.projectTitle}`, 18, 56);
  doc.text(`Lead Account Exec: ${quotation.salesExecutive}`, 18, 61);

  // Table of Items
  const tableRows = quotation.lineItems.map((it, idx) => [
    idx + 1,
    it.serviceName + (it.description ? `\n${it.description}` : ''),
    it.sacCode || '998311',
    `${it.quantity} ${it.billingUnit}`,
    formatINRWithDecimals(it.negotiatedUnitPrice),
    formatINRWithDecimals(it.taxableAmount),
    `${it.gstRate}%`,
    formatINRWithDecimals(it.lineTotal)
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['#', 'Service Deliverable', 'SAC', 'Qty / Unit', 'Rate (₹)', 'Taxable (₹)', 'GST', 'Amount (₹)']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: PDF_FONT,
      fontSize: 8,
      textColor: [23, 23, 23],
      cellPadding: 2,
      overflow: 'linebreak'
    },
    headStyles: {
      font: PDF_FONT,
      fontStyle: 'bold',
      fontSize: 8.5,
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 53, halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 17, halign: 'center' },
      4: { cellWidth: 23, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 28, halign: 'right' }
    },
    margin: { left: pageMargin, right: pageMargin, top: 34, bottom: footerReserve },
    tableWidth: pageWidth - (pageMargin * 2),
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawLetterheadHeaderAndFooter(doc);
      }
    }
  });

  // Totals Section
  let finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY > pageHeight - footerReserve - 44) {
    doc.addPage();
    drawLetterheadHeaderAndFooter(doc);
    finalY = 38;
  }

  const totalsX = 118;
  const valueX = 196;

  doc.setFontSize(8.5);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  let currentY = finalY;
  const hasDiscount = quotation.documentDiscountAmount > 0;
  const subtotalBeforeDiscount = quotation.totalLineSubtotal || (quotation.totalTaxableAmount + (quotation.documentDiscountAmount || 0));

  doc.text("Taxable Subtotal:", totalsX, currentY);
  doc.text(formatINRWithDecimals(hasDiscount ? subtotalBeforeDiscount : quotation.totalTaxableAmount), valueX, currentY, { align: 'right' });

  if (hasDiscount) {
    currentY += 5;
    doc.text("Document Discount:", totalsX, currentY);
    doc.text(formatINRWithDecimals(-quotation.documentDiscountAmount), valueX, currentY, { align: 'right' });
  }

  if (quotation.isInterState) {
    currentY += 5;
    doc.text("Integrated GST (18% IGST):", totalsX, currentY);
    doc.text(formatINRWithDecimals(quotation.igstAmount), valueX, currentY, { align: 'right' });
  } else {
    currentY += 5;
    doc.text("Central GST (9% CGST):", totalsX, currentY);
    doc.text(formatINRWithDecimals(quotation.cgstAmount), valueX, currentY, { align: 'right' });
    currentY += 5;
    doc.text("State GST (9% SGST):", totalsX, currentY);
    doc.text(formatINRWithDecimals(quotation.sgstAmount), valueX, currentY, { align: 'right' });
  }

  const grandTotalY = currentY + 7;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(totalsX - 2, grandTotalY - 4, 80, 10, 'F');
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Grand Total (INR):", totalsX, grandTotalY + 3);
  doc.text(formatINRWithDecimals(quotation.grandTotal), valueX, grandTotalY + 3, { align: 'right' });

  // Amount in words
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Amount in Words: ${numberToWordsINR(quotation.grandTotal)}`, 14, grandTotalY + 14);

  // Terms & Delivery
  doc.setFontSize(7.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Terms: ${quotation.paymentTerms || 'Standard Payment Terms Apply'} | Timeline: ${quotation.deliveryTimeline || 'As per project scope'}`, 14, grandTotalY + 20);
  doc.text(`Valid for ${quotation.validityDays} days from issue date. Subject to standard HEXNS contract terms.`, 14, grandTotalY + 25);

  doc.save(`${quotation.quotationNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`);
}

export function generateInvoicePDF(invoice: Invoice, settings: CompanySettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register embedded fonts supporting Unicode Rupee symbol (U+20B9)
  registerPdfFonts(doc);

  // Primary Colors
  const primaryColor = [23, 23, 23]; // #171717
  const mutedColor = [115, 115, 115]; // #737373
  const lightBg = [249, 250, 251]; // #F9FAFB
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageMargin = 14;
  const footerReserve = 36;

  // Apply Letterhead Page Artwork (Page 1)
  drawLetterheadHeaderAndFooter(doc);

  // Document Title
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("TAX INVOICE", 14, 36);

  doc.setFontSize(9);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 36);
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 140, 41);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 140, 46);
  doc.text(`Place of Supply: ${invoice.placeOfSupply}`, 140, 51);

  // Client Details Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 40, 110, 26, 2, 2, 'F');
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BILLED TO:", 18, 46);
  doc.text(invoice.clientName, 18, 51);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Project: ${invoice.projectTitle}`, 18, 56);
  if (invoice.quotationNumber) {
    doc.text(`Ref Quotation: ${invoice.quotationNumber}`, 18, 61);
  }

  // Items
  const tableRows = invoice.lineItems.map((it, idx) => [
    idx + 1,
    `${it.serviceName}${it.description ? `\n${it.description}` : ''}`,
    it.sacCode || '998311',
    `${it.quantity} ${it.billingUnit}`,
    formatINRWithDecimals(it.negotiatedUnitPrice),
    formatINRWithDecimals(it.taxableAmount),
    `${it.gstRate}%`,
    formatINRWithDecimals(it.lineTotal)
  ]);

  autoTable(doc, {
    startY: 70,
    head: [['#', 'Description of Services', 'SAC', 'Qty / Unit', 'Rate (₹)', 'Taxable (₹)', 'GST', 'Amount (₹)']],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: PDF_FONT,
      fontSize: 8,
      textColor: [23, 23, 23],
      cellPadding: 2,
      overflow: 'linebreak'
    },
    headStyles: {
      font: PDF_FONT,
      fontStyle: 'bold',
      fontSize: 8.5,
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 53, halign: 'left' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 17, halign: 'center' },
      4: { cellWidth: 23, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 28, halign: 'right' }
    },
    margin: { left: pageMargin, right: pageMargin, top: 34, bottom: footerReserve },
    tableWidth: pageWidth - (pageMargin * 2),
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawLetterheadHeaderAndFooter(doc);
      }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY > pageHeight - footerReserve - 48) {
    doc.addPage();
    drawLetterheadHeaderAndFooter(doc);
    finalY = 38;
  }

  const totalsX = 118;
  const valueX = 196;

  doc.setFontSize(8.5);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  let currentY = finalY;
  const hasDiscount = invoice.documentDiscountAmount > 0;
  const subtotalBeforeDiscount = invoice.totalLineSubtotal || (invoice.totalTaxableAmount + (invoice.documentDiscountAmount || 0));

  doc.text("Taxable Subtotal:", totalsX, currentY);
  doc.text(formatINRWithDecimals(hasDiscount ? subtotalBeforeDiscount : invoice.totalTaxableAmount), valueX, currentY, { align: 'right' });

  if (hasDiscount) {
    currentY += 5;
    doc.text("Document Discount:", totalsX, currentY);
    doc.text(formatINRWithDecimals(-invoice.documentDiscountAmount), valueX, currentY, { align: 'right' });
  }

  if (invoice.isInterState) {
    currentY += 5;
    doc.text("Integrated GST (18% IGST):", totalsX, currentY);
    doc.text(formatINRWithDecimals(invoice.igstAmount), valueX, currentY, { align: 'right' });
  } else {
    currentY += 5;
    doc.text("Central GST (9% CGST):", totalsX, currentY);
    doc.text(formatINRWithDecimals(invoice.cgstAmount), valueX, currentY, { align: 'right' });
    currentY += 5;
    doc.text("State GST (9% SGST):", totalsX, currentY);
    doc.text(formatINRWithDecimals(invoice.sgstAmount), valueX, currentY, { align: 'right' });
  }

  const grandTotalY = currentY + 7;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(totalsX - 2, grandTotalY - 4, 80, 20, 'F');
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Total Invoice Value:", totalsX, grandTotalY + 2);
  doc.text(formatINRWithDecimals(invoice.grandTotal), valueX, grandTotalY + 2, { align: 'right' });

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Amount Received:", totalsX, grandTotalY + 8);
  doc.text(formatINRWithDecimals(invoice.amountPaid), valueX, grandTotalY + 8, { align: 'right' });

  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(invoice.balanceDue > 0 ? 220 : 21, invoice.balanceDue > 0 ? 38 : 128, invoice.balanceDue > 0 ? 38 : 61);
  doc.text("Balance Outstanding:", totalsX, grandTotalY + 14);
  doc.text(formatINRWithDecimals(invoice.balanceDue), valueX, grandTotalY + 14, { align: 'right' });

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Amount in Words: ${numberToWordsINR(invoice.grandTotal)}`, 14, grandTotalY + 24);

  // Bank Info
  doc.setFontSize(7.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Remit to: ${settings.bank.bankName} | A/C: ${settings.bank.accountNumber} | IFSC: ${settings.bank.ifsc} | UPI: ${settings.bank.upiVpa}`, 14, grandTotalY + 30);
  doc.text(`${settings.invoiceStatutoryNote || 'Tax payable under reverse charge: No.'}`, 14, grandTotalY + 35);

  doc.save(`${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`);
}

export function generateReportPDF(
  reportTitle: string, 
  dateRange: string, 
  summaryData: Record<string, number | string>,
  tableHeaders: string[],
  tableRows: (string | number)[][],
  _settings: CompanySettings
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  registerPdfFonts(doc);

  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(15);
  doc.text("HEXNS MEDIAWORKS LLP", 14, 18);
  doc.setFontSize(9);
  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(115, 115, 115);
  doc.text(`Financial Intelligence & Audit Report • Period: ${dateRange}`, 14, 24);

  doc.setDrawColor(229, 231, 235);
  doc.line(14, 28, 196, 28);

  doc.setFont(PDF_FONT, 'bold');
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
      doc.setFont(PDF_FONT, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(115, 115, 115);
      doc.text(k, 18 + (idx * colWidth), 46);
      doc.setFont(PDF_FONT, 'bold');
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
    styles: {
      font: PDF_FONT,
      fontSize: 8,
      textColor: [23, 23, 23]
    },
    headStyles: {
      font: PDF_FONT,
      fontStyle: 'bold',
      fontSize: 8.5,
      fillColor: [23, 23, 23],
      textColor: [255, 255, 255]
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



