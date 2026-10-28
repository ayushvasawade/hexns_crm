
import jsPDF from 'jspdf';

import autoTable from 'jspdf-autotable';

import * as XLSX from 'xlsx';

import { Quotation, Invoice, CompanySettings } from '../types/crm';

import { formatINR, formatDate, numberToWordsINR } from './formatters';



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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 132, 255); // #0084FF
  doc.text("HEXNS", 14, 18);

  doc.setFont('helvetica', 'bold');
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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(28, 32, 36);
  doc.text("Hexns Mediaworks LLP | LLPIN: ACR-0880", pageWidth / 2, pageHeight - 27, { align: 'center' });

  // Registered Office
  doc.setFont('helvetica', 'normal');
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



  // Apply Letterhead Page Artwork (Page 1)

  drawLetterheadHeaderAndFooter(doc);



  // Document Title & Reference

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(14);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  doc.text("COMMERCIAL QUOTATION", 14, 36);



  doc.setFontSize(9);

  doc.setFont('helvetica', 'bold');

  doc.text(`Quotation #: ${quotation.quotationNumber}`, 140, 36);

  doc.setFont('helvetica', 'normal');

  doc.text(`Date: ${formatDate(quotation.quotationDate)}`, 140, 41);

  doc.text(`Valid Until: ${formatDate(quotation.validUntil)}`, 140, 46);

  doc.text(`Place of Supply: ${quotation.placeOfSupply}`, 140, 51);



  // Client Details Box

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);

  doc.roundedRect(14, 40, 110, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(9);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  doc.text("QUOTED TO:", 18, 46);

  doc.text(quotation.clientName, 18, 51);

  doc.setFont('helvetica', 'normal');

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  doc.text(`Project: ${quotation.projectTitle}`, 18, 56);

  doc.text(`Lead Account Exec: ${quotation.salesExecutive}`, 18, 61);



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

    startY: 70,

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

    },

    didDrawPage: (data) => {

      if (data.pageNumber > 1) {

        drawLetterheadHeaderAndFooter(doc);

      }

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



  // Bank Settlement Info

  doc.setFontSize(7.5);

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  doc.text(`Remittance: ${settings.bank.bankName} | A/C: ${settings.bank.accountNumber} | IFSC: ${settings.bank.ifsc} | UPI: ${settings.bank.upiVpa}`, 14, grandTotalY + 36);



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



  // Apply Letterhead Page Artwork (Page 1)

  drawLetterheadHeaderAndFooter(doc);



  // Document Title

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(14);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  doc.text("TAX INVOICE", 14, 36);



  doc.setFontSize(9);

  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 36);

  doc.setFont('helvetica', 'normal');

  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 140, 41);

  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 140, 46);

  doc.text(`Place of Supply: ${invoice.placeOfSupply}`, 140, 51);



  // Client Details Box

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);

  doc.roundedRect(14, 40, 110, 26, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');

  doc.setFontSize(9);

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  doc.text("BILLED TO:", 18, 46);

  doc.text(invoice.clientName, 18, 51);

  doc.setFont('helvetica', 'normal');

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  doc.text(`Project: ${invoice.projectTitle}`, 18, 56);

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

    startY: 70,

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

    },

    didDrawPage: (data) => {

      if (data.pageNumber > 1) {

        drawLetterheadHeaderAndFooter(doc);

      }

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



  // Bank Info

  doc.setFontSize(7.5);

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  doc.text(`Remit to: ${settings.bank.bankName} | A/C: ${settings.bank.accountNumber} | IFSC: ${settings.bank.ifsc} | UPI: ${settings.bank.upiVpa}`, 14, grandTotalY + 28);

  doc.text(`${settings.invoiceStatutoryNote || 'Tax payable under reverse charge: No.'}`, 14, grandTotalY + 33);



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

