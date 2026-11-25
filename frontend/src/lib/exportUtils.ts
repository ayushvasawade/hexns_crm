
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Quotation, Invoice, CompanySettings, Client } from '../types/crm';
import { formatINRWithDecimals, formatDate, numberToWordsINR, formatIndianRupeesInWords, formatDateDDMMYYYY, formatNumberWithDecimals } from './formatters';
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

export function generateQuotationPDF(quotation: Quotation, _settings: CompanySettings, client?: Client) {
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

  // Client Details Box (Display GSTIN, Address, Contact if present, omit if blank)
  const rawGstin = (client?.gstin || quotation.clientGstin || '').trim();
  const clientGstin = rawGstin.toLowerCase() === 'unregistered' ? '' : rawGstin;
  const clientAddress = (quotation.clientAddress || client?.registeredAddress || '').trim();
  const clientPhone = (quotation.clientPhone || client?.mobile || client?.officialPhone || '').trim();
  const brandName = (quotation.brandName || client?.brandTradeName || '').trim();

  let boxHeight = 22;
  if (brandName && brandName.toLowerCase() !== quotation.clientName.toLowerCase()) boxHeight += 4;
  if (clientAddress) boxHeight += 5;
  if (clientPhone) boxHeight += 4;
  if (clientGstin) boxHeight += 5;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 40, 110, boxHeight, 2, 2, 'F');
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("QUOTED TO:", 18, 46);
  doc.text(quotation.clientName, 18, 51);
  let qClientY = 56;
  if (brandName && brandName.toLowerCase() !== quotation.clientName.toLowerCase()) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Brand: ${brandName}`, 18, qClientY);
    qClientY += 4.5;
  }
  if (clientAddress) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    const splitAddr = doc.splitTextToSize(clientAddress, 95);
    doc.text(splitAddr, 18, qClientY);
    qClientY += (splitAddr.length * 3.8);
  }
  if (clientPhone) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`Contact: ${clientPhone}`, 18, qClientY);
    qClientY += 4.5;
  }
  if (clientGstin) {
    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("GSTIN: ", 18, qClientY);
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(clientGstin, 31, qClientY);
  }

  // Table of Items
  const tableRows = quotation.lineItems.map((it, idx) => [
    idx + 1,
    it.serviceName + (it.description ? `\n${it.description}` : ''),
    it.sacCode || '998311',
    `${it.quantity} ${it.billingUnit}`,
    formatINRWithDecimals(it.negotiatedUnitPrice),
    formatINRWithDecimals(it.taxableAmount),
    quotation.applyGst === false ? '—' : `${it.gstRate}%`,
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
  const docDiscount = quotation.documentDiscountAmount ?? (quotation as any).discountAmount ?? 0;
  const hasDiscount = docDiscount > 0;
  const subtotalBeforeDiscount = quotation.totalLineSubtotal ?? (quotation as any).taxableSubtotal ?? ((quotation.totalTaxableAmount || 0) + docDiscount);
  const taxableSubtotal = hasDiscount ? subtotalBeforeDiscount : (quotation.totalTaxableAmount ?? (quotation as any).taxableAmount ?? (quotation.grandTotal - (quotation.cgstAmount || 0) - (quotation.sgstAmount || 0) - (quotation.igstAmount || 0)));

  doc.text("Taxable Subtotal:", totalsX, currentY);
  doc.text(formatINRWithDecimals(taxableSubtotal), valueX, currentY, { align: 'right' });

  if (hasDiscount) {
    currentY += 5;
    doc.text("Document Discount:", totalsX, currentY);
    doc.text(formatINRWithDecimals(-docDiscount), valueX, currentY, { align: 'right' });
  }

  if (quotation.applyGst !== false) {
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

export function generateInvoicePDF(invoice: Invoice, settings: CompanySettings, client?: Client) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register embedded fonts supporting Unicode Rupee symbol (U+20B9)
  registerPdfFonts(doc);

  const themeBlue: [number, number, number] = [43, 125, 168]; // #2B7DA8
  const textDark: [number, number, number] = [23, 23, 23]; // #171717
  const textMuted: [number, number, number] = [107, 114, 128]; // #6B7280
  const shadedBg: [number, number, number] = [240, 246, 249]; // #F0F6F9

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2); // 182mm

  const drawHeaderBlock = () => {
    // 1. Top Blue Header Block (Matching User Reference Image 1)
    const headerHeight = 36;
    doc.setFillColor(themeBlue[0], themeBlue[1], themeBlue[2]);
    doc.roundedRect(margin, 12, contentWidth, headerHeight, 1.5, 1.5, 'F');

    // Left side: Invoice Title & Number
    doc.setFont(PDF_FONT, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(invoice.applyGst === false ? "INVOICE" : "TAX INVOICE", margin + 6, 24);

    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(9.5);
    doc.text(`#${invoice.invoiceNumber}`, margin + 6, 31);

    if (invoice.quotationNumber) {
      doc.setFontSize(7.5);
      doc.text(`Ref Quote: ${invoice.quotationNumber}`, margin + 6, 37);
    }

    // Right side: Hexns Media Details (Exact content & GSTIN from Image 1)
    const rightX = margin + contentWidth - 6;
    doc.setFont(PDF_FONT, 'bold');
    doc.setFontSize(11);
    doc.text("Hexns Media", rightX, 19, { align: 'right' });

    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(7.5);
    doc.text("1, 3rd Floor , Abhove Gadre Eye Care", rightX, 23.5, { align: 'right' });
    doc.text("New Shau Puri", rightX, 27.5, { align: 'right' });
    doc.text("Kolhapur Maharashtra 416001", rightX, 31.5, { align: 'right' });
    doc.text("India", rightX, 35.5, { align: 'right' });

    doc.setFont(PDF_FONT, 'bold');
    doc.setFontSize(8);
    doc.text("GSTIN 27AASFH6542G1Z0", rightX, 40, { align: 'right' });

    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(7.5);
    doc.text("admin@hexnsmedia.com", rightX, 44, { align: 'right' });
  };

  drawHeaderBlock();

  const docDiscount = invoice.documentDiscountAmount ?? (invoice as any).discountAmount ?? 0;
  const hasDiscount = docDiscount > 0;
  const subtotalBeforeDiscount = invoice.totalLineSubtotal ?? (invoice as any).taxableSubtotal ?? ((invoice.totalTaxableAmount || 0) + docDiscount);
  const amountPaid = invoice.amountPaid ?? (invoice as any).amountReceived ?? 0;
  const balanceDue = invoice.balanceDue ?? (invoice as any).balanceOutstanding ?? (invoice.grandTotal - amountPaid);

  // 2. Top Right: BALANCE DUE (Image 2)
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(themeBlue[0], themeBlue[1], themeBlue[2]);
  doc.text(`BALANCE DUE ${formatNumberWithDecimals(balanceDue)}`, margin + contentWidth, 54, { align: 'right' });

  // 3. Client Information (Left)
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(invoice.clientName, margin, 62);

  let clientY = 66;
  const clientBrand = (invoice.brandName || client?.brandTradeName || '').trim();
  if (clientBrand && clientBrand.toLowerCase() !== invoice.clientName.toLowerCase()) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Brand: ${clientBrand}`, margin, clientY);
    clientY += 4;
  }

  const clientAddress = (invoice.clientAddress || client?.registeredAddress || '').trim();
  if (clientAddress) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    const splitAddr = doc.splitTextToSize(clientAddress, 75);
    doc.text(splitAddr, margin, clientY);
    clientY += (splitAddr.length * 3.8);
  }

  const clientPhone = (invoice.clientPhone || client?.mobile || client?.officialPhone || '').trim();
  if (clientPhone) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text(`Contact: ${clientPhone}`, margin, clientY);
    clientY += 4;
  }

  if (invoice.clientGstin && invoice.clientGstin.toLowerCase() !== 'unregistered') {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`GSTIN ${invoice.clientGstin}`, margin, clientY);
    clientY += 4.5;
  }

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Place Of Supply: ${invoice.placeOfSupply || 'Maharashtra (27)'}`, margin, clientY);

  // 4. Invoice Metadata Table (Right)
  const metaLabelX = 148;
  const metaValX = margin + contentWidth;

  const drawMetaRow = (label: string, val: string, yPos: number) => {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(label, metaLabelX, yPos);

    doc.setFont(PDF_FONT, 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(val, metaValX, yPos, { align: 'right' });
  };

  drawMetaRow("Invoice#", invoice.invoiceNumber, 60);
  drawMetaRow("Invoice Date", formatDateDDMMYYYY(invoice.invoiceDate), 65);
  drawMetaRow("Terms", invoice.paymentTerms || settings.defaultPaymentTerms || 'Net 15', 70);
  drawMetaRow("Due Date", formatDateDDMMYYYY(invoice.dueDate), 75);

  // 5. Line Items Table (Cyan/Blue headers matching Image 2)
  const isGstEnabled = invoice.applyGst !== false;
  const isInterState = Boolean(invoice.isInterState);

  let tableHeaders: string[];
  let columnStyles: Record<number, any>;

  if (!isGstEnabled) {
    tableHeaders = ['#', 'ITEM & DESCRIPTION', 'HSN/SAC', 'AMOUNT'];
    columnStyles = {
      0: { cellWidth: 10, halign: 'left' },
      1: { cellWidth: 110, halign: 'left' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 34, halign: 'right' },
    };
  } else if (!isInterState) {
    tableHeaders = ['#', 'ITEM & DESCRIPTION', 'HSN/SAC', 'CGST', 'SGST', 'AMOUNT'];
    columnStyles = {
      0: { cellWidth: 10, halign: 'left' },
      1: { cellWidth: 70, halign: 'left' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    };
  } else {
    tableHeaders = ['#', 'ITEM & DESCRIPTION', 'HSN/SAC', 'IGST', 'AMOUNT'];
    columnStyles = {
      0: { cellWidth: 10, halign: 'left' },
      1: { cellWidth: 88, halign: 'left' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 38, halign: 'right' },
    };
  }

  const tableRows = invoice.lineItems.map((item, idx) => {
    const itemTaxable = item.taxableAmount || (item.quantity * item.negotiatedUnitPrice);
    const itemRate = item.gstRate ?? 18;
    const itemTotalTax = isGstEnabled ? Math.round(itemTaxable * (itemRate / 100)) : 0;
    const itemHalfTax = Math.round(itemTotalTax / 2);
    const itemOtherHalfTax = itemTotalTax - itemHalfTax;

    const descCell = `${item.serviceName}${item.description ? `\n${item.description}` : ''}`;
    const amountCell = `${formatNumberWithDecimals(itemTaxable)}\n${item.quantity}.00 ${item.billingUnit || '1'} x ${formatNumberWithDecimals(item.negotiatedUnitPrice)}`;

    if (!isGstEnabled) {
      return [
        idx + 1,
        descCell,
        item.sacCode || '998311',
        amountCell
      ];
    } else if (!isInterState) {
      return [
        idx + 1,
        descCell,
        item.sacCode || '998311',
        `${formatNumberWithDecimals(itemHalfTax)}\n${itemRate / 2}%`,
        `${formatNumberWithDecimals(itemOtherHalfTax)}\n${itemRate / 2}%`,
        amountCell
      ];
    } else {
      return [
        idx + 1,
        descCell,
        item.sacCode || '998311',
        `${formatNumberWithDecimals(itemTotalTax)}\n${itemRate}%`,
        amountCell
      ];
    }
  });

  autoTable(doc, {
    startY: Math.max(83, clientY + 6),
    head: [tableHeaders],
    body: tableRows,
    theme: 'plain',
    styles: {
      font: PDF_FONT,
      fontSize: 8,
      textColor: textDark,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineWidth: { bottom: 0.1 },
      lineColor: [241, 245, 249]
    },
    headStyles: {
      font: PDF_FONT,
      fontStyle: 'bold',
      fontSize: 8,
      fillColor: [255, 255, 255],
      textColor: themeBlue,
      lineWidth: { bottom: 0.3 },
      lineColor: [209, 213, 219],
      cellPadding: 2.5
    },
    columnStyles,
    margin: { left: margin, right: margin, top: 20, bottom: 25 },
    tableWidth: contentWidth,
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont(PDF_FONT, 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(themeBlue[0], themeBlue[1], themeBlue[2]);
        doc.text(`Hexns Media • Invoice #${invoice.invoiceNumber} (Page ${data.pageNumber})`, margin, 12);
      }
    }
  });

  // 6. Shaded Summary Container (Matching Image 2: Thanks message on left, summary on right)
  let boxY = (doc as any).lastAutoTable.finalY + 4;
  const boxHeight = 36 + (hasDiscount ? 5 : 0);

  if (boxY + boxHeight + 40 > pageHeight - 15) {
    doc.addPage();
    boxY = 16;
  }

  doc.setFillColor(shadedBg[0], shadedBg[1], shadedBg[2]);
  doc.roundedRect(margin, boxY, contentWidth, boxHeight, 1.5, 1.5, 'F');

  // Left side of box: Thanks message & notes
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("Thanks for your business.", margin + 6, boxY + 8);

  if (invoice.notes) {
    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const splitNotes = doc.splitTextToSize(invoice.notes, 75);
    doc.text(splitNotes, margin + 6, boxY + 14);
  }

  // Right side of box: Totals breakdown
  const summaryLabelX = 138;
  const summaryValX = margin + contentWidth - 6;
  let summaryRowY = boxY + 7;

  // Sub Total
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Sub Total", summaryLabelX, summaryRowY);
  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatNumberWithDecimals(subtotalBeforeDiscount), summaryValX, summaryRowY, { align: 'right' });

  // Discount
  if (hasDiscount) {
    summaryRowY += 4.5;
    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text("Discount", summaryLabelX, summaryRowY);
    doc.setFont(PDF_FONT, 'bold');
    doc.text(`- ${formatNumberWithDecimals(docDiscount)}`, summaryValX, summaryRowY, { align: 'right' });
  }

  // Tax breakdown
  if (isGstEnabled) {
    if (!isInterState) {
      summaryRowY += 4.5;
      doc.setFont(PDF_FONT, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("CGST9 (9%)", summaryLabelX, summaryRowY);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(formatNumberWithDecimals(invoice.cgstAmount), summaryValX, summaryRowY, { align: 'right' });

      summaryRowY += 4.5;
      doc.setFont(PDF_FONT, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("SGST9 (9%)", summaryLabelX, summaryRowY);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(formatNumberWithDecimals(invoice.sgstAmount), summaryValX, summaryRowY, { align: 'right' });
    } else {
      summaryRowY += 4.5;
      doc.setFont(PDF_FONT, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text("IGST18 (18%)", summaryLabelX, summaryRowY);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(formatNumberWithDecimals(invoice.igstAmount), summaryValX, summaryRowY, { align: 'right' });
    }
  }

  // Divider line
  summaryRowY += 2;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(summaryLabelX, summaryRowY, summaryValX, summaryRowY);
  summaryRowY += 4.5;

  // Total
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("Total", summaryLabelX, summaryRowY);
  doc.text(formatNumberWithDecimals(invoice.grandTotal), summaryValX, summaryRowY, { align: 'right' });

  // Balance Due
  summaryRowY += 5;
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(themeBlue[0], themeBlue[1], themeBlue[2]);
  doc.text("Balance Due", summaryLabelX, summaryRowY);
  doc.text(formatNumberWithDecimals(balanceDue), summaryValX, summaryRowY, { align: 'right' });

  // 7. Total In Words (Right aligned, bold italic - Image 2)
  const wordsY = boxY + boxHeight + 6;
  const inWords = formatIndianRupeesInWords(invoice.grandTotal);
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const wordsPrefix = "Total In Words: ";
  const fullWords = `${wordsPrefix}${inWords}`;
  doc.setFont(PDF_FONT, 'bold');
  doc.text(fullWords, margin + contentWidth, wordsY, { align: 'right' });

  // 8. Authorized Signature (Left aligned - Image 2)
  const sigY = wordsY + 16;
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Authorized Signature", margin, sigY);
  doc.setDrawColor(textDark[0], textDark[1], textDark[2]);
  doc.setLineWidth(0.3);
  doc.line(margin + 33, sigY, margin + 85, sigY);

  // 9. Electronic Bank Settlement (Subtle, clean footer if details exist)
  const bank = invoice.bankDetails || {};
  const bankItems: string[] = [];
  if (bank.bankName?.trim()) bankItems.push(`Bank: ${bank.bankName.trim()}`);
  if (bank.accountHolder?.trim()) bankItems.push(`A/C Holder: ${bank.accountHolder.trim()}`);
  if (bank.accountNumber?.trim()) bankItems.push(`A/C: ${bank.accountNumber.trim()}`);
  if (bank.ifsc?.trim()) bankItems.push(`IFSC: ${bank.ifsc.trim()}`);
  const upi = (bank.upiVpa || (bank as any).upiId)?.trim();
  if (upi) bankItems.push(`UPI: ${upi}`);

  if (bankItems.length > 0) {
    const bankY = sigY + 9;
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Electronic Bank Settlement: ${bankItems.join(' | ')}`, margin, bankY);
  }

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



